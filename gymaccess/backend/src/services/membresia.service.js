// T023 [US2] Servicio de membresías: asignación con las reglas de negocio
// del Sprint 2 (FR-002…FR-005, FR-023 / R-26). Las operaciones de
// renovación y estados se agregan en US4.

import * as membresiaModelo from '../models/membresia.model.js';
import * as clienteModelo from '../models/cliente.model.js';
import * as tipoModelo from '../models/tipoMembresia.model.js';
import { registrar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'membresias';

// Normaliza fechas a 'AAAA-MM-DD': mysql2 devuelve columnas DATE como
// objetos Date, y el contrato exige el formato de fecha simple.
export function aFechaISO(valor) {
  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  return String(valor).slice(0, 10);
}

// Suma días calendario a una fecha (AAAA-MM-DD o Date) usando aritmética
// UTC para no depender de la zona horaria del servidor.
export function sumarDias(fecha, dias) {
  const [anio, mes, dia] = aFechaISO(fecha).split('-').map(Number);
  const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
  fechaUTC.setUTCDate(fechaUTC.getUTCDate() + dias);
  return fechaUTC.toISOString().slice(0, 10);
}

// Forma pública de una membresía (FR-017: nunca hay datos biométricos aquí).
export function membresiaPublica(membresia) {
  if (!membresia) return null;
  return {
    id: membresia.id,
    cliente: { id: membresia.cliente_id, nombre: membresia.cliente },
    tipo: {
      id: membresia.tipo_membresia_id,
      nombre: membresia.tipo,
      descripcion: membresia.descripcion,
    },
    fecha_inicio: aFechaISO(membresia.fecha_inicio),
    fecha_vencimiento: aFechaISO(membresia.fecha_vencimiento),
    estado: membresia.estado,
    precio: Number(membresia.precio),
    saldo_pendiente:
      membresia.saldo_pendiente !== undefined
        ? Number(membresia.saldo_pendiente)
        : undefined,
  };
}

export async function asignarMembresia(datos, usuario = null) {
  const cliente = await clienteModelo.findById(datos.cliente_id);
  if (!cliente) {
    throw new AppError(codigosError.NO_ENCONTRADO, 'El cliente no existe.', 404);
  }
  if (cliente.estado === 'inactivo') {
    throw new AppError(
      codigosError.CLIENTE_NO_ACTIVO,
      'El cliente está dado de baja. Reactívelo antes de asignarle una membresía.',
      409
    );
  }

  const tipo = await tipoModelo.findById(datos.tipo_membresia_id);
  if (!tipo) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El tipo de membresía no existe.',
      404
    );
  }
  if (tipo.estado !== 'activo') {
    throw new AppError(
      codigosError.ESTADO_NO_PERMITE,
      'El tipo de membresía está inactivo y no puede asignarse.',
      409
    );
  }

  // FR-004: una sola membresía en curso (activa o suspendida) por cliente.
  const enCurso = await membresiaModelo.findEnCursoPorCliente(cliente.id);
  if (enCurso) {
    throw new AppError(
      codigosError.MEMBRESIA_ACTIVA_EXISTENTE,
      'El cliente ya tiene una membresía vigente. Renóvela o gestione su estado antes de asignar una nueva.',
      409
    );
  }

  // FR-023 / R-26: no se asigna ni se renueva con adeudo pendiente.
  const adeudo = await membresiaModelo.calcularAdeudoCliente(cliente.id);
  if (adeudo > 0) {
    throw new AppError(
      codigosError.ADEUDO_PENDIENTE,
      'El cliente tiene un adeudo pendiente. Debe saldarse antes de asignar una membresía.',
      409,
      { adeudo }
    );
  }

  const fechaVencimiento = sumarDias(datos.fecha_inicio, tipo.duracion_dias);
  const id = await membresiaModelo.crear({
    cliente_id: cliente.id,
    tipo_membresia_id: tipo.id,
    fecha_inicio: datos.fecha_inicio,
    fecha_vencimiento: fechaVencimiento,
    estado: 'activa',
    precio: tipo.precio, // precio congelado al momento de asignar (FR-002)
  });

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'asignar_membresia',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Se asignó la membresía ${tipo.nombre} al cliente "${cliente.nombre_completo}" hasta ${fechaVencimiento}.`,
  });

  return membresiaPublica(await membresiaModelo.findById(id));
}

export async function listarMembresias({ cliente_id, estado, rol } = {}) {
  if (cliente_id) {
    const existe = await clienteModelo.findById(cliente_id);
    if (!existe) {
      throw new AppError(codigosError.NO_ENCONTRADO, 'El cliente no existe.', 404);
    }
  }

  const membresias = await membresiaModelo.listar({ cliente_id, estado });

  // Principio VI: el entrenador consulta sin importes ni saldos.
  return membresias.map((m) => {
    const publica = membresiaPublica(m);
    if (rol === 'entrenador') {
      delete publica.precio;
      delete publica.saldo_pendiente;
    }
    return publica;
  });
}

// T041/T042 [US4] Renovación y ciclo de vida de la membresía (FR-005,
// R-20/R-21). Transiciones permitidas:
//   activa → suspendida → activa (reactivar conserva fecha_vencimiento)
//   activa|vencida → cancelada (terminal)
//   renovar: solo desde activa o vencida; suma duracion_dias a la
//   fecha_vencimiento vigente y exige adeudo en cero (FR-023).

const TRANSICIONES_PERMITIDAS = {
  suspendida: ['activa'], // suspender solo desde activa (R-20)
  cancelada: ['activa', 'vencida'], // cancelar es terminal (R-20)
  activa: ['suspendida'], // reactivación: solo desde suspendida
};

export async function renovarMembresia(id, usuario = null) {
  const membresia = await membresiaModelo.findById(id);
  if (!membresia) {
    throw new AppError(codigosError.NO_ENCONTRADO, 'La membresía no existe.', 404);
  }

  if (!['activa', 'vencida'].includes(membresia.estado)) {
    throw new AppError(
      codigosError.ESTADO_NO_PERMITE,
      'Solo se pueden renovar membresías activas o vencidas. Gestione el estado antes de renovar.',
      409
    );
  }

  // FR-023 / R-26: la renovación exige adeudo de la membresía en cero.
  const adeudo = await membresiaModelo.calcularAdeudoMembresia(membresia.id);
  if (adeudo > 0) {
    throw new AppError(
      codigosError.ADEUDO_PENDIENTE,
      'La membresía tiene un adeudo pendiente. Debe saldarse antes de renovarla.',
      409,
      { adeudo }
    );
  }

  const tipo = await tipoModelo.findById(membresia.tipo_membresia_id);
  if (!tipo) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El tipo de membresía asociado ya no existe.',
      404
    );
  }

  // FR-005: se suman duracion_dias a la fecha_vencimiento vigente.
  const nuevaVencimiento = sumarDias(membresia.fecha_vencimiento, tipo.duracion_dias);
  await membresiaModelo.actualizar(membresia.id, {
    fecha_vencimiento: nuevaVencimiento,
    estado: 'activa',
  });

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'renovar_membresia',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Membresía ${membresia.id} renovada: nuevo vencimiento ${nuevaVencimiento}.`,
  });

  return membresiaPublica(await membresiaModelo.findById(membresia.id));
}

export async function cambiarEstadoMembresia(id, nuevoEstado, usuario = null) {
  const membresia = await membresiaModelo.findById(id);
  if (!membresia) {
    throw new AppError(codigosError.NO_ENCONTRADO, 'La membresía no existe.', 404);
  }

  const permitidas = TRANSICIONES_PERMITIDAS[nuevoEstado] ?? [];
  if (membresia.estado === nuevoEstado || !permitidas.includes(membresia.estado)) {
    throw new AppError(
      codigosError.ESTADO_NO_PERMITE,
      `No se puede pasar de "${membresia.estado}" a "${nuevoEstado}". La cancelación es terminal y la reactivación solo aplica a membresías suspendidas.`,
      409
    );
  }

  await membresiaModelo.actualizar(membresia.id, { estado: nuevoEstado });
  // R-21 / clarify 2026-10-14: al reactivar NO se modifica fecha_vencimiento
  // (los días de suspensión no se recuperan); el modelo solo cambia `estado`.

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion:
      nuevoEstado === 'suspendida'
        ? 'suspender_membresia'
        : nuevoEstado === 'cancelada'
          ? 'cancelar_membresia'
          : 'reactivar_membresia',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Membresía ${membresia.id} pasó de "${membresia.estado}" a "${nuevoEstado}".`,
  });

  return membresiaPublica(await membresiaModelo.findById(membresia.id));
}

export async function obtenerMembresia(id) {
  const membresia = await membresiaModelo.findById(id);
  if (!membresia) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'La membresía no existe.',
      404
    );
  }
  return membresiaPublica(membresia);
}
