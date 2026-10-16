// T010 [US1] Servicio de perfiles de entrenador.
// - Crear exige una cuenta existente con `rol = 'entrenador'` y
//   `estado = 'activo'` (FR-001/FR-002) y valida la unicidad del vínculo
//   dentro de la transacción (R-28, research).
// - Modificar es escritura del administrador (FR-003): la baja pasa a
//   `inactivo` sin borrar asignaciones ni rutinas (FR-025).
// - Toda acción crítica se audita con `auditoria.service` (FR-023).
// - US7 amplía la lectura: listado con `clientes_asignados`, ficha con
//   clientes vigentes y carga propia del entrenador (`/mio/clientes`) —
//   estados y fechas de membresía, SIN importes (HU7, Principio VI).

import * as entrenadorModelo from '../models/entrenador.model.js';
import * as usuarioModelo from '../models/usuario.model.js';
import { conTransaccion } from '../utils/transaccion.js';
import { registrar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'entrenadores';
const MENSAJE_USUARIO_NO_EXISTE = 'El usuario indicado no existe.';
const MENSAJE_USUARIO_INVALIDO =
  'La cuenta indicada no es un usuario con rol entrenador activo.';
const MENSAJE_YA_VINCULADO = 'Esa cuenta ya tiene un perfil de entrenador vinculado.';
const MENSAJE_PERFIL_NO_EXISTE = 'El entrenador indicado no existe.';

const CAMPOS_MODIFICABLES = ['nombre', 'telefono', 'especialidad', 'estado'];

// Convierte la fila con JOIN de usuarios a la forma pública del contrato.
function perfilPublico(entrenador) {
  if (!entrenador) return null;
  const perfil = {
    id: entrenador.id,
    usuario_id: entrenador.usuario_id,
    nombre: entrenador.nombre,
    telefono: entrenador.telefono,
    especialidad: entrenador.especialidad,
    estado: entrenador.estado,
  };
  if (entrenador.usuario_email !== undefined) {
    perfil.usuario = {
      id: entrenador.usuario_id,
      nombre: entrenador.usuario_nombre,
      email: entrenador.usuario_email,
      rol: entrenador.usuario_rol,
    };
  }
  return perfil;
}

// Normaliza fechas a 'AAAA-MM-DD' (mysql2 puede devolver DATE como Date).
function aFechaISO(valor) {
  if (typeof valor === 'string') return valor.slice(0, 10);
  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  return valor ?? null;
}

// Forma pública de la carga (US7): estados y fechas de membresía, nunca
// importes (Principio VI). Sin membresía → `membresia: null`.
function clienteDeCargaPublico(fila) {
  return {
    id: fila.id,
    nombre_completo: fila.nombre_completo,
    correo: fila.correo ?? null,
    telefono: fila.telefono ?? null,
    estado: fila.estado,
    membresia: fila.membresia_estado
      ? {
          estado: fila.membresia_estado,
          fecha_vencimiento: aFechaISO(fila.membresia_vencimiento),
        }
      : null,
  };
}

export async function crearEntrenador(datos, usuario = null) {
  const id = await conTransaccion(async (conexion) => {
    const cuenta = await usuarioModelo.findById(datos.usuario_id);
    if (!cuenta) {
      throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_USUARIO_NO_EXISTE, 404);
    }
    if (cuenta.rol !== 'entrenador' || cuenta.estado !== 'activo') {
      throw new AppError(codigosError.ENTRENADOR_NO_VALIDO, MENSAJE_USUARIO_INVALIDO, 409);
    }

    const vinculado = await entrenadorModelo.findByUsuarioId(datos.usuario_id, conexion);
    if (vinculado) {
      throw new AppError(codigosError.USUARIO_YA_ENTRENADOR, MENSAJE_YA_VINCULADO, 409);
    }

    return entrenadorModelo.crear(
      {
        usuario_id: datos.usuario_id,
        nombre: datos.nombre,
        telefono: datos.telefono,
        especialidad: datos.especialidad,
        estado: 'activo',
      },
      conexion
    );
  });

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'crear_entrenador',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Perfil de entrenador #${id} vinculado al usuario ${datos.usuario_id}`,
  });

  return perfilPublico(await entrenadorModelo.findById(id));
}

// US7: listado enriquecido — cada perfil incluye `clientes_asignados`
// (asignaciones con estado `activa`) para la consulta del personal (HU7).
export async function listarEntrenadores({ estado } = {}) {
  const filas = await entrenadorModelo.listar({ estado });
  return Promise.all(
    filas.map(async (fila) => ({
      ...perfilPublico(fila),
      clientes_asignados: Number(
        await entrenadorModelo.contarAsignacionesVigentes(fila.id)
      ),
    }))
  );
}

// US7: la ficha incluye la lista de clientes con asignación vigente.
export async function obtenerEntrenador(id) {
  const perfil = await entrenadorModelo.findById(id);
  if (!perfil) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_PERFIL_NO_EXISTE, 404);
  }
  const carga = await entrenadorModelo.listarCarga(perfil.id);
  return {
    ...perfilPublico(perfil),
    clientes: carga.map(clienteDeCargaPublico),
  };
}

// US7: carga propia del entrenador autenticado (`/mio/clientes`).
// El perfil se resuelve desde la sesión; con carga vacía devuelve []
// sin error (contrato). Se admite el perfil inactivo en consulta: solo
// ve lo que aún tiene asignado (la baja no borra nada — FR-025).
export async function obtenerCargaPropia(usuarioId) {
  const perfil = await entrenadorModelo.findByUsuarioId(usuarioId);
  if (!perfil) {
    throw new AppError(
      codigosError.FUERA_DE_CARGA,
      'Su cuenta no tiene un perfil de entrenador con clientes a cargo.',
      403
    );
  }
  const carga = await entrenadorModelo.listarCarga(perfil.id);
  return carga.map(clienteDeCargaPublico);
}

export async function modificarEntrenador(id, campos, usuario = null) {
  const existente = await entrenadorModelo.findById(id);
  if (!existente) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_PERFIL_NO_EXISTE, 404);
  }

  const cambios = {};
  for (const campo of CAMPOS_MODIFICABLES) {
    if (campos[campo] !== undefined) cambios[campo] = campos[campo];
  }
  if (Object.keys(cambios).length > 0) {
    await entrenadorModelo.actualizar(id, cambios);
    await registrar({
      usuarioId: usuario?.id ?? null,
      accion: 'modificar_entrenador',
      modulo: MODULO,
      resultado: 'exitoso',
      descripcion: `Perfil #${id}: campos ${Object.keys(cambios).join(', ')}`,
    });
  }

  return perfilPublico(await entrenadorModelo.findById(id));
}
