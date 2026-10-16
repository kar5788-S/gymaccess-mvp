// T063 [US6] Servicio de control de acceso (flujo central del sprint).
// Orden obligatorio (FR-012, FR-013):
//   1) identificar el rostro (solo contra `rostros` de clientes activos),
//   2) DESPUÉS validar la vigencia de la membresía,
//   3) registrar el intento ANTES de responder (FR-015),
//   4) auditar la operación (R-22).
// Motivos de rechazo: catálogo cerrado de R-23.

import * as accesoModelo from '../models/acceso.model.js';
import * as membresiaModelo from '../models/membresia.model.js';
import * as clienteModelo from '../models/cliente.model.js';
import { deserializarDescriptor, esDescriptorValido, DIMENSIONES_DESCRIPTOR } from '../utils/descriptor.js';
import { mejorCoincidencia } from './matching.service.js';
import { listarDescriptores } from './rostro.service.js';
import { registrar as auditar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'accesos';

export const MOTIVOS_RECHAZO = accesoModelo.MOTIVOS_PERMITIDOS;

// Normaliza fechas a 'AAAA-MM-DD' (mysql2 puede devolver DATE como Date).
function fechaISO(valor) {
  if (typeof valor === 'string') return valor.slice(0, 10);
  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  return String(valor);
}

const HOY = () => fechaISO(new Date());

// Identifica al cliente: descriptores activos → mejor coincidencia (R-16).
async function identificar(descriptor) {
  const almacenados = await listarDescriptores();
  const candidatos = almacenados.map((fila) => ({
    cliente_id: fila.cliente_id,
    valores: deserializarDescriptor(fila.descriptor_facial),
  }));
  const coincidencia = mejorCoincidencia(candidatos, descriptor);
  if (!coincidencia) return null;

  // Defensa en profundidad: solo clientes existentes y activos (FR-012).
  const ficha = await clienteModelo.findById(coincidencia.cliente_id);
  if (!ficha || ficha.estado === 'inactivo') return null;
  return {
    id: ficha.id,
    nombre: ficha.nombre_completo,
    distancia: coincidencia.distancia,
  };
}

// Evalúa la membresía del cliente ya identificado (FR-013).
function evaluarMembresia(membresia) {
  if (!membresia) return { motivo: 'sin_membresia' };
  if (membresia.estado === 'suspendida') return { motivo: 'membresia_suspendida' };
  if (membresia.estado === 'cancelada') return { motivo: 'membresia_cancelada' };
  // La vigencia es inclusiva hasta el final de fecha_vencimiento (R-20).
  if (
    membresia.estado === 'vencida' ||
    fechaISO(membresia.fecha_vencimiento) < HOY()
  ) {
    return { motivo: 'membresia_vencida' };
  }
  return { motivo: null };
}

const MENSAJES = {
  autorizado: 'Acceso autorizado',
  rostro_no_identificado: 'No fue posible identificar al cliente',
  sin_membresia: 'Acceso rechazado: el cliente no tiene una membresía vigente.',
  membresia_vencida: 'Acceso rechazado: la membresía está vencida.',
  membresia_suspendida: 'Acceso rechazado: la membresía está suspendida.',
  membresia_cancelada: 'Acceso rechazado: la membresía está cancelada.',
};

export function mensajeDe(resultado, motivo) {
  if (resultado === 'autorizado') return MENSAJES.autorizado;
  return MENSAJES[motivo] ?? 'Acceso rechazado';
}

export async function intentarAcceso(descriptor, usuario = null) {
  let cliente = null;
  let membresia = null;
  let resultado = 'rechazado';
  let motivo = 'rostro_no_identificado';

  if (descriptor === null) {
    // Simula cámara no disponible o captura fallida (contracts/api.md).
    motivo = 'rostro_no_identificado';
  } else {
    if (!esDescriptorValido(descriptor)) {
      throw new AppError(
        codigosError.DESCRIPTOR_INVALIDO,
        `El descriptor facial debe tener exactamente ${DIMENSIONES_DESCRIPTOR} valores numéricos.`,
        400
      );
    }

    // FR-012: identificar PRIMERO…
    cliente = await identificar(descriptor);

    if (cliente) {
      // FR-013: …y validar la membresía DESPUÉS. La coincidencia facial
      // sola nunca autoriza el acceso.
      membresia = await membresiaModelo.findVigentePorCliente(cliente.id);
      const evaluacion = evaluarMembresia(membresia);
      motivo = evaluacion.motivo;
      if (!motivo) resultado = 'autorizado';
    } else {
      motivo = 'rostro_no_identificado';
    }
  }

  // FR-015: el intento se registra ANTES de responder (autorizado o no).
  const accesoId = await accesoModelo.crear({
    cliente_id: cliente?.id ?? null,
    resultado,
    motivo_rechazo: motivo,
  });

  await auditar({
    usuarioId: usuario?.id ?? null,
    accion: resultado === 'autorizado' ? 'acceso_autorizado' : 'acceso_rechazado',
    modulo: MODULO,
    resultado: resultado === 'autorizado' ? 'exitoso' : 'rechazado',
    descripcion: `Intento de acceso ${resultado}${motivo ? ` (${motivo})` : ''}.`,
  });

  // HU6-5: si no se identificó, no se revela información de terceros.
  const identificado = Boolean(cliente);

  return {
    datos: {
      acceso_id: accesoId,
      resultado,
      motivo: resultado === 'autorizado' ? null : motivo,
      cliente: identificado
        ? { id: cliente.id, nombre: cliente.nombre }
        : null,
      membresia: identificado
        ? {
            estado: membresia?.estado ?? null,
            fecha_vencimiento: membresia?.fecha_vencimiento
              ? fechaISO(membresia.fecha_vencimiento)
              : null,
          }
        : null,
    },
    mensaje: mensajeDe(resultado, motivo),
  };
}

// ---- US8: consultas de historial (T076) ----

// Forma pública del registro de accesos (FR-015: solo metadatos, sin
// descriptores ni datos biométricos).
export function accesoPublico(fila) {
  return {
    id: fila.id,
    cliente: fila.cliente_id
      ? { id: fila.cliente_id, nombre: fila.cliente }
      : null,
    fecha:
      typeof fila.fecha === 'string' ? fila.fecha.slice(0, 10) : fechaISO(fila.fecha),
    hora: fila.hora,
    resultado: fila.resultado,
    motivo: fila.motivo_rechazo,
  };
}

export async function listarAccesos({ fecha, resultado, cliente_id } = {}) {
  const filas = await accesoModelo.listar({ fecha, resultado, cliente_id });
  return filas.map(accesoPublico);
}

// Historial propio del cliente autenticado (HU8): resuelve el cliente desde
// el usuario de la sesión y nunca expone registros de terceros.
export async function listarAccesosCliente(usuarioId, filtros = {}) {
  const cliente = await clienteModelo.findByUsuarioId(usuarioId);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'No existe una ficha de cliente asociada a su usuario.',
      404
    );
  }
  return listarAccesos({ ...filtros, cliente_id: cliente.id });
}
