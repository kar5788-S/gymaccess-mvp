// T012 [US1] Modelo de tipos de membresía: consultas parametrizadas (FR-013),
// sin operaciones de borrado (FR-002: se usa `estado = 'inactivo'`).

import { consultar, ejecutar } from '../config/db.js';

export const COLUMNAS_ACTUALIZABLES = [
  'nombre',
  'descripcion',
  'duracion_dias',
  'precio',
  'estado',
];

export async function crear({
  nombre,
  descripcion,
  duracion_dias,
  precio,
  estado = 'activo',
}) {
  const resultado = await ejecutar(
    `INSERT INTO tipos_membresia (nombre, descripcion, duracion_dias, precio, estado)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, descripcion ?? null, duracion_dias, precio, estado]
  );
  return resultado.insertId;
}

export async function findById(id) {
  const filas = await consultar(
    `SELECT id, nombre, descripcion, duracion_dias, precio, estado
       FROM tipos_membresia
      WHERE id = ?
      LIMIT 1`,
    [id]
  );
  return filas[0] ?? null;
}

export async function findByNombre(nombre, excludeId = null) {
  const filas = await consultar(
    `SELECT id, nombre
       FROM tipos_membresia
      WHERE nombre = ? AND id <> COALESCE(?, 0)
      LIMIT 1`,
    [nombre, excludeId]
  );
  return filas[0] ?? null;
}

export async function listar({ estado } = {}) {
  const params = [];
  let where = '';
  if (estado) {
    where = 'WHERE estado = ?';
    params.push(estado);
  }
  return consultar(
    `SELECT id, nombre, descripcion, duracion_dias, precio, estado
       FROM tipos_membresia
       ${where}
      ORDER BY nombre`,
    params
  );
}

// Actualización parcial: solo campos permitidos (FR-013).
// Las membresías ya asignadas no se tocan (FR-002).
export async function actualizar(id, campos) {
  const entradas = Object.entries(campos).filter(([c]) =>
    COLUMNAS_ACTUALIZABLES.includes(c)
  );
  if (entradas.length === 0) return false;

  const columnas = entradas.map(([c]) => `${c} = ?`);
  const valores = entradas.map(([, v]) => v);

  const resultado = await ejecutar(
    `UPDATE tipos_membresia SET ${columnas.join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return resultado.affectedRows > 0;
}
