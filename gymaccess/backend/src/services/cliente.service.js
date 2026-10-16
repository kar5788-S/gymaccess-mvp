// T031 [US3] Servicio de clientes: alta y modificación con detección de
// duplicados (FR-007, clarificación Q4, research R-08).
// El servicio se extiende en US4 (consultas) y US5 (información propia).

import * as clienteModelo from '../models/cliente.model.js';
import * as rostroModelo from '../models/rostro.model.js';
import * as membresiaModelo from '../models/membresia.model.js';
import * as rutinaModelo from '../models/rutina.model.js';
import * as objetivoModelo from '../models/objetivo.model.js';
import * as progresoModelo from '../models/progreso.model.js';
import { objetivoPublico } from './objetivo.service.js';
import { progresoPublico } from './progreso.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MENSAJE_NO_ENCONTRADO = 'El cliente no existe.';
const MENSAJE_DUPLICADO =
  'Posible cliente duplicado: ya existe un registro con el mismo nombre y contacto. Confirme para guardar.';

function errorDuplicado(coincidencia) {
  return new AppError(
    codigosError.POSIBLE_DUPLICADO,
    MENSAJE_DUPLICADO,
    409,
    { coincidencia }
  );
}

function normalizarContacto(valor) {
  return valor === '' || valor === undefined ? null : valor;
}

export async function crearCliente(datos) {
  const propuesta = {
    nombre_completo: datos.nombre_completo,
    telefono: normalizarContacto(datos.telefono),
    correo: normalizarContacto(datos.correo),
  };

  const coincidencia = await clienteModelo.findDuplicate(propuesta, null);
  if (coincidencia && !datos.confirmar_duplicado) {
    throw errorDuplicado(coincidencia);
  }

  const id = await clienteModelo.crear({
    ...propuesta,
    notas: normalizarContacto(datos.notas),
    usuario_id: datos.usuario_id ?? null,
  });
  return clienteModelo.findById(id);
}

export async function modificarCliente(id, cambios) {
  const actual = await clienteModelo.findById(id);
  if (!actual) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_NO_ENCONTRADO, 404);
  }

  const propuesta = {
    nombre_completo: cambios.nombre_completo ?? actual.nombre_completo,
    telefono:
      cambios.telefono !== undefined
        ? normalizarContacto(cambios.telefono)
        : actual.telefono,
    correo:
      cambios.correo !== undefined
        ? normalizarContacto(cambios.correo)
        : actual.correo,
  };

  const coincidencia = await clienteModelo.findDuplicate(propuesta, id);
  if (coincidencia && !cambios.confirmar_duplicado) {
    throw errorDuplicado(coincidencia);
  }

  const campos = {};
  if (cambios.nombre_completo !== undefined) campos.nombre_completo = cambios.nombre_completo;
  if (cambios.telefono !== undefined) campos.telefono = propuesta.telefono;
  if (cambios.correo !== undefined) campos.correo = propuesta.correo;
  if (cambios.notas !== undefined) campos.notas = normalizarContacto(cambios.notas);
  if (cambios.usuario_id !== undefined) campos.usuario_id = cambios.usuario_id;
  if (cambios.estado !== undefined) campos.estado = cambios.estado;

  // Se captura el estado previo ANTES de la actualización (el objeto
  // devuelto por el modelo puede ser una referencia viva en las pruebas).
  const estadoAnterior = actual.estado;

  await clienteModelo.actualizar(id, campos);

  // T052 / FR-022 / R-27: la baja o inactivación del cliente ELIMINA su
  // información facial (única excepción al no-DELETE). La ficha se conserva.
  if (campos.estado === 'inactivo' && estadoAnterior !== 'inactivo') {
    await rostroModelo.eliminarPorCliente(id);
  }

  return clienteModelo.findById(id);
}

// ---- US4: consultas con proyección por rol (FR-009, Q2) ----

const CAMPOS_ENTRENADOR = ['id', 'nombre_completo', 'telefono', 'correo'];

function proyectarParaRol(cliente, rol) {
  if (rol === 'entrenador') {
    const reducido = {};
    for (const campo of CAMPOS_ENTRENADOR) reducido[campo] = cliente[campo];
    return reducido;
  }
  return cliente;
}

export async function listarClientes({ q, rol } = {}) {
  const campos = rol === 'entrenador' ? CAMPOS_ENTRENADOR : undefined;
  const filas = await clienteModelo.listar({ q, campos });
  return filas;
}

export async function obtenerCliente(id, rol) {
  const cliente = await clienteModelo.findById(id);
  if (!cliente) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_NO_ENCONTRADO, 404);
  }
  return proyectarParaRol(cliente, rol);
}

// ---- US5: información propia del cliente (FR-010) ----

export async function obtenerClientePropio(usuarioId) {
  const cliente = await clienteModelo.findByUsuarioId(usuarioId);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'No tiene una ficha de cliente vinculada a su cuenta.',
      404
    );
  }
  return cliente;
}

// ---- US9: membresía propia en solo lectura (FR-024) ----

// Normaliza fechas a 'AAAA-MM-DD' (mysql2 puede devolver DATE como Date).
function aFechaISO(valor) {
  if (typeof valor === 'string') return valor.slice(0, 10);
  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  return valor;
}

export async function obtenerMiMembresia(usuarioId) {
  const cliente = await clienteModelo.findByUsuarioId(usuarioId);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'No tiene una ficha de cliente vinculada a su cuenta.',
      404
    );
  }

  const membresia = await membresiaModelo.findVigentePorCliente(cliente.id);
  if (!membresia) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'Todavía no tiene una membresía registrada. Acuda a recepción.',
      404
    );
  }

  // Solo lectura de estado y fechas (FR-024); sin importes ni datos de
  // terceros.
  return {
    tipo: {
      id: membresia.tipo_membresia_id,
      nombre: membresia.tipo,
      descripcion: membresia.descripcion,
    },
    fecha_inicio: aFechaISO(membresia.fecha_inicio),
    fecha_vencimiento: aFechaISO(membresia.fecha_vencimiento),
    estado: membresia.estado,
  };
}

// ---------------------------------------------------------------------------
// US5: consultas propias del cliente (FR-014, FR-015, SC-005; clarify Q4).
// El cliente_id SIEMPRE se resuelve desde la sesión: jamás se recibe de la
// URL, por lo que no puede consultar datos de terceros.
// ---------------------------------------------------------------------------

export async function obtenerMiRutina(usuarioId) {
  const cliente = await clienteModelo.findByUsuarioId(usuarioId);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'No tiene una ficha de cliente vinculada a su cuenta.',
      404
    );
  }

  const activas = await rutinaModelo.listar({
    cliente_id: cliente.id,
    estado: 'activa',
  });
  const rutina = activas[0] ?? null;

  if (!rutina) {
    // HU5 esc.3: estado vacío con mensaje claro, sin error técnico (FR-015).
    return {
      rutina: null,
      mensaje: 'Aún no tiene una rutina activa asignada.',
    };
  }

  const ejercicios = await rutinaModelo.findEjerciciosPorRutina(rutina.id);
  return {
    rutina: {
      id: rutina.id,
      nombre: rutina.nombre,
      estado: rutina.estado,
      entrenador: rutina.entrenador ?? null,
      ejercicios,
    },
  };
}

export async function obtenerMiProgreso(usuarioId) {
  const cliente = await clienteModelo.findByUsuarioId(usuarioId);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'No tiene una ficha de cliente vinculada a su cuenta.',
      404
    );
  }

  // Solo los datos de ESTE cliente; los progresos llegan ordenados por
  // fecha ascendente desde el modelo y los objetivos en orden cronológico
  // de creación (HU5 esc.2).
  const objetivos = await objetivoModelo.listar({ cliente_id: cliente.id });
  const progresos = await progresoModelo.listar({ cliente_id: cliente.id });

  return {
    objetivos: objetivos
      .slice()
      .sort((a, b) => a.id - b.id)
      .map(objetivoPublico),
    progresos: progresos.map(progresoPublico),
  };
}
