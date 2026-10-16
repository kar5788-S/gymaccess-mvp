// T019 [US2] Servicio de asignaciones de entrenador a cliente.
// - Asignar cierra la vigente e inserta la nueva EN LA MISMA transacción:
//   un solo registro `activa` por cliente y el historial se conserva
//   (FR-004, FR-005, FR-006; clarify 2026-10-15 Q2; R-29).
// - Cerrar manualmente exige estado `activa` (409 ESTADO_NO_PERMITE).
// - Toda acción crítica se audita (FR-023).

import * as asignacionModelo from '../models/asignacion.model.js';
import * as clienteModelo from '../models/cliente.model.js';
import * as entrenadorModelo from '../models/entrenador.model.js';
import { conTransaccion } from '../utils/transaccion.js';
import { registrar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'asignaciones';

// Fecha local en 'AAAA-MM-DD' (fecha_inicio/fecha_fin de las vigencias).
function hoyISO() {
  const f = new Date();
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(
    f.getDate()
  ).padStart(2, '0')}`;
}

// Normaliza fechas a 'AAAA-MM-DD' (mysql2 devuelve DATE como Date y el
// contrato promete `fecha_inicio: "hoy"`, no marcas de tiempo ISO).
function aFechaISO(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string') return valor.slice(0, 10);
  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  return valor;
}

// Forma pública de la vigencia: fechas como fecha, sin alterar el resto.
function asignacionPublica(asignacion) {
  if (!asignacion) return null;
  return {
    ...asignacion,
    fecha_inicio: aFechaISO(asignacion.fecha_inicio),
    fecha_fin: aFechaISO(asignacion.fecha_fin),
  };
}

export async function asignar({ cliente_id, entrenador_id }, usuario = null) {
  const cliente = await clienteModelo.findById(cliente_id);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El cliente indicado no existe.',
      404
    );
  }
  if (cliente.estado !== 'activo') {
    throw new AppError(
      codigosError.CLIENTE_NO_ACTIVO,
      'El cliente indicado no está activo. Reactívelo antes de asignarlo.',
      409
    );
  }

  const entrenador = await entrenadorModelo.findById(entrenador_id);
  if (!entrenador) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El entrenador indicado no existe.',
      404
    );
  }
  if (entrenador.estado !== 'activo') {
    throw new AppError(
      codigosError.ENTRENADOR_NO_VALIDO,
      'El entrenador indicado no está activo.',
      409
    );
  }

  const hoy = hoyISO();
  const id = await conTransaccion(async (conexion) => {
    // Reasignación: la vigente queda `cerrada` con su fecha_fin (Q2).
    await asignacionModelo.cerrarVigentePorCliente(cliente_id, hoy, conexion);
    return asignacionModelo.crear(
      { cliente_id, entrenador_id, fecha_inicio: hoy, estado: 'activa' },
      conexion
    );
  });

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'asignar_entrenador',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Cliente ${cliente_id} asignado al entrenador ${entrenador_id} (vigencia #${id})`,
  });

  return asignacionPublica(await asignacionModelo.findById(id));
}

export async function listarAsignaciones(filtros = {}) {
  const filas = await asignacionModelo.listar(filtros);
  return filas.map(asignacionPublica);
}

export async function cerrarAsignacion(id, usuario = null) {
  const existente = await asignacionModelo.findById(id);
  if (!existente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'La asignación indicada no existe.',
      404
    );
  }
  if (existente.estado !== 'activa') {
    throw new AppError(
      codigosError.ESTADO_NO_PERMITE,
      'La asignación ya estaba cerrada. Solo se pueden cerrar asignaciones activas.',
      409
    );
  }

  await asignacionModelo.cerrar(id, hoyISO());

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'cerrar_asignacion',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Asignación #${id} del cliente ${existente.cliente_id} cerrada`,
  });

  return asignacionPublica(await asignacionModelo.findById(id));
}

// ---------------------------------------------------------------------------
// Compartido por US4 (objetivos y progresos): segunda capa de permisos.
// La matriz da el permiso por rol; aquí se valida que el cliente del
// entrenador esté en SU carga (SC-004, FR-008).
// ---------------------------------------------------------------------------

// Perfil del entrenador de la sesión; null en los demás roles (el permiso
// lo da la matriz). Sin perfil → 403; perfil inactivo → 409.
export async function perfilDeEntrenador(usuario) {
  if (usuario?.rol !== 'entrenador') return null;

  const perfil = await entrenadorModelo.findByUsuarioId(usuario.id);
  if (!perfil) {
    throw new AppError(
      codigosError.FUERA_DE_CARGA,
      'Su cuenta no tiene un perfil de entrenador con clientes a cargo.',
      403
    );
  }
  if (perfil.estado !== 'activo') {
    throw new AppError(
      codigosError.ENTRENADOR_NO_VALIDO,
      'Su perfil de entrenador no está activo.',
      409
    );
  }
  return perfil;
}

// Valida que el cliente tenga asignación vigente con este entrenador;
// los otros roles no requieren esta comprobación (devuelven null).
export async function exigirCargaDeCliente(usuario, cliente_id) {
  const perfil = await perfilDeEntrenador(usuario);
  if (!perfil) return null;

  const vigente = await asignacionModelo.findVigentePorCliente(cliente_id);
  if (!vigente || vigente.entrenador_id !== perfil.id) {
    throw new AppError(
      codigosError.FUERA_DE_CARGA,
      'El cliente no está en su carga.',
      403
    );
  }
  return vigente;
}

// Clientes con asignación vigente: restringe los listados del entrenador
// a su propia carga.
export async function clientesDeCarga(perfil) {
  const vigentes = await asignacionModelo.listar({
    entrenador_id: perfil.id,
    estado: 'activa',
  });
  return vigentes.map((v) => v.cliente_id);
}
