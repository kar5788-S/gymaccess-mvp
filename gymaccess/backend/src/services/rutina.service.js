// T028 [US3] Servicio de rutinas de entrenamiento (HU3).
// Reglas clave (research R-30/R-31, clarify 2026-10-15 Q3):
// - El entrenador solo opera su carga: el cliente debe tener vigencia con
//   él (403 FUERA_DE_CARGA); sin responsable da 409 CLIENTE_SIN_ENTRENADOR.
// - Una sola rutina activa por cliente: crear y reactivar archivan la
//   vigente EN LA MISMA transacción; activar exige al menos un ejercicio
//   (FR-009 → 400 VALIDACION, HU3 esc.7).
// - Sin borrado: las rutinas cambian de estado y conservan historial
//   (FR-010). El administrador crea en nombre del responsable vigente.
// - Toda acción crítica se audita (FR-023).

import * as rutinaModelo from '../models/rutina.model.js';
import * as asignacionModelo from '../models/asignacion.model.js';
import * as clienteModelo from '../models/cliente.model.js';
import * as entrenadorModelo from '../models/entrenador.model.js';
import { conTransaccion } from '../utils/transaccion.js';
import { registrar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'rutinas';
const MENSAJE_RUTINA_NO_EXISTE = 'La rutina indicada no existe.';

// Perfil de entrenador de la sesión; solo aplica al rol entrenador.
// Devuelve null para administrador/recepcionista (permiso lo da la matriz).
async function perfilDelRol(usuario) {
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

// Doble capa de permisos (matriz + carga): un entrenador alcanza una
// rutina solo si su cliente actual sigue vigente con él (FR-008, SC-004).
async function exigirCargaDeRutina(rutina, usuario) {
  const perfil = await perfilDelRol(usuario);
  if (!perfil) return;

  const vigente = await asignacionModelo.findVigentePorCliente(rutina.cliente_id);
  if (!vigente || vigente.entrenador_id !== perfil.id) {
    throw new AppError(
      codigosError.FUERA_DE_CARGA,
      'La rutina no pertenece a un cliente de su carga.',
      403
    );
  }
}

// Forma pública del contrato: rutina con los nombres de cliente/entrenador.
function rutinaPublica(rutina) {
  if (!rutina) return null;
  return {
    id: rutina.id,
    cliente_id: rutina.cliente_id,
    cliente: rutina.cliente ?? null,
    entrenador_id: rutina.entrenador_id,
    entrenador: rutina.entrenador ?? null,
    nombre: rutina.nombre,
    estado: rutina.estado,
  };
}

export async function crearRutina({ cliente_id, nombre, ejercicios }, usuario = null) {
  const cliente = await clienteModelo.findById(cliente_id);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El cliente indicado no existe.',
      404
    );
  }

  const perfil = await perfilDelRol(usuario);

  const vigente = await asignacionModelo.findVigentePorCliente(cliente_id);
  if (!vigente) {
    throw new AppError(
      codigosError.CLIENTE_SIN_ENTRENADOR,
      'El cliente no tiene entrenador responsable. Asígnelo antes de crear la rutina.',
      409
    );
  }
  if (perfil && vigente.entrenador_id !== perfil.id) {
    throw new AppError(
      codigosError.FUERA_DE_CARGA,
      'Ese cliente no está en su carga. Solo puede crear rutinas para sus clientes.',
      403
    );
  }

  // R-31: archivar la vigente e insertar la nueva en la misma transacción.
  const { rutinaId, archivadas } = await conTransaccion(async (conexion) => {
    const archivadas = await rutinaModelo.archivarActivasDeCliente(
      cliente_id,
      null,
      conexion
    );
    const rutinaId = await rutinaModelo.crear(
      {
        cliente_id,
        // El responsable es SIEMPRE el de la asignación vigente: el
        // administrador crea en nombre del entrenador del cliente.
        entrenador_id: vigente.entrenador_id,
        nombre,
        estado: 'activa',
      },
      conexion
    );
    await rutinaModelo.reemplazarEjercicios(rutinaId, ejercicios, conexion);
    return { rutinaId, archivadas };
  });

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'crear_rutina',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Rutina #${rutinaId} del cliente ${cliente_id} creada con ${ejercicios.length} ejercicio(s)`,
  });

  const creada = await rutinaModelo.findById(rutinaId);
  const listaEjercicios = await rutinaModelo.findEjerciciosPorRutina(rutinaId);
  return {
    datos: { ...rutinaPublica(creada), ejercicios: listaEjercicios },
    mensaje:
      archivadas > 0
        ? 'Rutina creada y activada. La rutina anterior pasó a archivada.'
        : 'Rutina creada y activada.',
  };
}

export async function listarRutinas(filtros = {}, usuario = null) {
  const perfil = await perfilDelRol(usuario);

  if (!perfil) {
    // Administrador y recepcionista: listado completo (recepcionista en
    // solo lectura ya lo garantiza la matriz de permisos).
    const filas = await rutinaModelo.listar(filtros);
    return filas.map(rutinaPublica);
  }

  if (filtros.cliente_id !== undefined) {
    // Filtrar por un cliente ajeno no revela información (SC-004).
    const vigente = await asignacionModelo.findVigentePorCliente(filtros.cliente_id);
    if (!vigente || vigente.entrenador_id !== perfil.id) {
      throw new AppError(
        codigosError.FUERA_DE_CARGA,
        'Ese cliente no está en su carga.',
        403
      );
    }
    const filas = await rutinaModelo.listar(filtros);
    return filas.map(rutinaPublica);
  }

  // Carga propia: clientes con asignación vigente con este entrenador.
  const vigentes = await asignacionModelo.listar({
    entrenador_id: perfil.id,
    estado: 'activa',
  });
  const cliente_ids = vigentes.map((v) => v.cliente_id);
  if (cliente_ids.length === 0) return [];

  const filas = await rutinaModelo.listar({ ...filtros, cliente_ids });
  return filas.map(rutinaPublica);
}

export async function obtenerRutina(id, usuario = null) {
  const rutina = await rutinaModelo.findById(id);
  if (!rutina) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_RUTINA_NO_EXISTE, 404);
  }
  await exigirCargaDeRutina(rutina, usuario);

  const ejercicios = await rutinaModelo.findEjerciciosPorRutina(id);
  return { rutina: rutinaPublica(rutina), ejercicios };
}

export async function modificarRutina(id, cambios, usuario = null) {
  const rutina = await rutinaModelo.findById(id);
  if (!rutina) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_RUTINA_NO_EXISTE, 404);
  }
  await exigirCargaDeRutina(rutina, usuario);

  const campos = {};
  if (cambios.nombre !== undefined) campos.nombre = cambios.nombre;

  if (cambios.ejercicios !== undefined) {
    // R-30: nombre + reemplazo completo de ejercicios en transacción.
    await conTransaccion(async (conexion) => {
      if (Object.keys(campos).length > 0) {
        await rutinaModelo.actualizar(id, campos, conexion);
      }
      await rutinaModelo.reemplazarEjercicios(id, cambios.ejercicios, conexion);
    });
  } else if (Object.keys(campos).length > 0) {
    await rutinaModelo.actualizar(id, campos);
  }

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'modificar_rutina',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Rutina #${id} modificada: ${[
      ...Object.keys(campos),
      ...(cambios.ejercicios !== undefined ? ['ejercicios'] : []),
    ].join(', ')}`,
  });

  const actualizada = await rutinaModelo.findById(id);
  const ejercicios = await rutinaModelo.findEjerciciosPorRutina(id);
  return { ...rutinaPublica(actualizada), ejercicios };
}

export async function cambiarEstadoRutina(id, estadoNuevo, usuario = null) {
  const rutina = await rutinaModelo.findById(id);
  if (!rutina) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_RUTINA_NO_EXISTE, 404);
  }
  await exigirCargaDeRutina(rutina, usuario);

  if (rutina.estado === estadoNuevo) {
    throw new AppError(
      codigosError.ESTADO_NO_PERMITE,
      `La rutina ya está en estado "${estadoNuevo}".`,
      409
    );
  }

  if (estadoNuevo === 'activa') {
    // FR-009: no se puede activar una rutina sin ejercicios.
    const total = await rutinaModelo.contarEjercicios(id);
    if (total === 0) {
      throw new AppError(
        codigosError.VALIDACION,
        'La rutina debe tener al menos un ejercicio para activarse.',
        400
      );
    }
    // Q3: al activar, la vigente del cliente pasa a archivada (transacción).
    await conTransaccion(async (conexion) => {
      await rutinaModelo.archivarActivasDeCliente(rutina.cliente_id, id, conexion);
      await rutinaModelo.cambiarEstado(id, 'activa', conexion);
    });
  } else {
    await rutinaModelo.cambiarEstado(id, estadoNuevo);
  }

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'cambiar_estado_rutina',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Rutina #${id} pasó a estado "${estadoNuevo}"`,
  });

  return rutinaPublica(await rutinaModelo.findById(id));
}
