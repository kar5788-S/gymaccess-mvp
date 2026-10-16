// T008 [US1] Modelo de perfiles de entrenador: consultas parametrizadas
// (FR-021) y sin operaciones de borrado — la baja es `estado = 'inactivo'`
// y no elimina asignaciones ni rutinas (FR-025). Las funciones que llevan
// `conexion` participan en la transacción del alta (R-28).

import { consultar, ejecutar, consultarCon, ejecutarCon } from '../config/db.js';

export const COLUMNAS_ACTUALIZABLES = ['nombre', 'telefono', 'especialidad', 'estado'];

export async function crear(
  { usuario_id, nombre, telefono, especialidad, estado = 'activo' },
  conexion = null
) {
  const resultado = await ejecutarCon(
    conexion,
    `INSERT INTO entrenadores (usuario_id, nombre, telefono, especialidad, estado)
     VALUES (?, ?, ?, ?, ?)`,
    [usuario_id, nombre, telefono ?? null, especialidad ?? null, estado]
  );
  return resultado.insertId;
}

const SELECT_CON_USUARIO = `
  SELECT e.id, e.usuario_id, e.nombre, e.telefono, e.especialidad, e.estado,
         u.nombre AS usuario_nombre, u.email AS usuario_email,
         u.rol AS usuario_rol
    FROM entrenadores e
    JOIN usuarios u ON u.id = e.usuario_id`;

export async function listar({ estado } = {}) {
  const filtro = estado ? 'WHERE e.estado = ?' : '';
  return consultar(
    `${SELECT_CON_USUARIO}
     ${filtro}
      ORDER BY e.id`,
    estado ? [estado] : []
  );
}

export async function findById(id, conexion = null) {
  const filas = await consultarCon(
    conexion,
    `${SELECT_CON_USUARIO}
      WHERE e.id = ?
      LIMIT 1`,
    [id]
  );
  return filas[0] ?? null;
}

export async function findByUsuarioId(usuarioId, conexion = null) {
  const filas = await consultarCon(
    conexion,
    `${SELECT_CON_USUARIO}
      WHERE e.usuario_id = ?
      LIMIT 1`,
    [usuarioId]
  );
  return filas[0] ?? null;
}

export async function actualizar(id, campos) {
  const entradas = Object.entries(campos).filter(([c]) =>
    COLUMNAS_ACTUALIZABLES.includes(c)
  );
  if (entradas.length === 0) return false;

  const columnas = entradas.map(([c]) => `${c} = ?`);
  const valores = entradas.map(([, v]) => v);
  const resultado = await ejecutar(
    `UPDATE entrenadores SET ${columnas.join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return resultado.affectedRows > 0;
}

// Conteo usado por el listado enriquecido de US7 (HU7, FR-007).
export async function contarAsignacionesVigentes(entrenadorId) {
  const filas = await consultar(
    `SELECT COUNT(*) AS total
       FROM asignaciones_entrenador
      WHERE entrenador_id = ? AND estado = 'activa'`,
    [entrenadorId]
  );
  return filas[0].total;
}

// Carga vigente del entrenador (US7, HU7, FR-007): sus clientes con
// asignación activa y su membresía vigente (la activa o la de mayor
// vencimiento). Solo estados y fechas: sin importes (Principio VI).
export async function listarCarga(entrenadorId) {
  return consultar(
    `SELECT cl.id, cl.nombre_completo, cl.correo, cl.telefono, cl.estado,
            m.estado AS membresia_estado,
            m.fecha_vencimiento AS membresia_vencimiento
       FROM asignaciones_entrenador a
       JOIN clientes cl ON cl.id = a.cliente_id
       LEFT JOIN membresias m ON m.id = (
            SELECT m2.id FROM membresias m2
             WHERE m2.cliente_id = cl.id
             ORDER BY (m2.estado = 'activa') DESC, m2.fecha_vencimiento DESC
             LIMIT 1)
      WHERE a.entrenador_id = ? AND a.estado = 'activa'
      ORDER BY cl.nombre_completo`,
    [entrenadorId]
  );
}
