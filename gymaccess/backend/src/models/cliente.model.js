// T030 [US3] Modelo de clientes: consultas parametrizadas (FR-013),
// sin operaciones de borrado (FR-014).

import { consultar, ejecutar } from '../config/db.js';

export const COLUMNAS_PERMITIDAS = [
  'id',
  'nombre_completo',
  'telefono',
  'correo',
  'notas',
  'usuario_id',
  'creado_en',
  'actualizado_en',
];

export async function crear({
  nombre_completo,
  telefono,
  correo,
  notas,
  usuario_id,
}) {
  const resultado = await ejecutar(
    `INSERT INTO clientes (nombre_completo, telefono, correo, notas, usuario_id)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre_completo, telefono ?? null, correo ?? null, notas ?? null, usuario_id ?? null]
  );
  return resultado.insertId;
}

export async function actualizar(id, campos) {
  const permitidos = ['nombre_completo', 'telefono', 'correo', 'notas', 'usuario_id', 'estado'];
  const entradas = Object.entries(campos).filter(([c]) => permitidos.includes(c));
  if (entradas.length === 0) return false;

  const columnas = entradas.map(([c]) => `${c} = ?`);
  const valores = entradas.map(([, v]) => v);
  const resultado = await ejecutar(
    `UPDATE clientes SET ${columnas.join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return resultado.affectedRows > 0;
}

export async function findById(id) {
  const filas = await consultar(
    'SELECT * FROM clientes WHERE id = ?',
    [id]
  );
  return filas[0] ?? null;
}

export async function findByUsuarioId(usuarioId) {
  const filas = await consultar(
    'SELECT * FROM clientes WHERE usuario_id = ?',
    [usuarioId]
  );
  return filas[0] ?? null;
}

// Detección de duplicados (FR-007, Q4): mismo nombre_completo y
// (mismo teléfono o mismo correo). Excluye el propio registro al editar.
export async function findDuplicate(datos, excludeId) {
  const parametros = [
    datos.nombre_completo,
    datos.telefono ?? null,
    datos.correo ?? null,
  ];
  let sql = `SELECT id, nombre_completo, telefono, correo
               FROM clientes
              WHERE nombre_completo = ?
                AND (telefono = ? OR correo = ?)`;
  if (excludeId !== undefined && excludeId !== null) {
    sql += ' AND id <> ?';
    parametros.push(excludeId);
  }
  const filas = await consultar(sql, parametros);
  return filas[0] ?? null;
}

// Listado con proyección de campos y búsqueda (US4, FR-009).
export async function listar({ q, campos } = {}) {
  const columnas =
    campos && campos.length
      ? campos.filter((c) => COLUMNAS_PERMITIDAS.includes(c)).join(', ')
      : '*';

  const condiciones = [];
  const parametros = [];
  if (q) {
    condiciones.push('(nombre_completo LIKE ? OR telefono LIKE ? OR correo LIKE ?)');
    const patron = `%${q}%`;
    parametros.push(patron, patron, patron);
  }

  const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
  return consultar(
    `SELECT ${columnas} FROM clientes${where} ORDER BY nombre_completo`,
    parametros
  );
}
