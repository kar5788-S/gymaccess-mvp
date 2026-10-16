// T035 [US4] Modelo de objetivos de entrenamiento: consultas
// parametrizadas (FR-021) y sin borrado físico — cumplir un objetivo solo
// cambia `estado` (FR-013, FR-025; R-32).

import { consultar, ejecutar } from '../config/db.js';

export const COLUMNAS_ACTUALIZABLES = [
  'descripcion',
  'meta',
  'fecha_limite',
  'estado',
];

const SELECT_CON_CLIENTE = `
  SELECT o.id, o.cliente_id, o.descripcion, o.meta, o.fecha_limite,
         o.estado, o.creado_en, o.actualizado_en,
         c.nombre_completo AS cliente
    FROM objetivos_entrenamiento o
    JOIN clientes c ON c.id = o.cliente_id`;

export async function crear({
  cliente_id,
  descripcion,
  meta,
  fecha_limite,
  estado = 'en curso',
}) {
  const resultado = await ejecutar(
    `INSERT INTO objetivos_entrenamiento
       (cliente_id, descripcion, meta, fecha_limite, estado)
     VALUES (?, ?, ?, ?, ?)`,
    [cliente_id, descripcion, meta ?? null, fecha_limite ?? null, estado]
  );
  return resultado.insertId;
}

export async function listar({ cliente_id, estado, cliente_ids } = {}) {
  const condiciones = [];
  const params = [];
  if (cliente_id !== undefined) {
    condiciones.push('o.cliente_id = ?');
    params.push(cliente_id);
  }
  if (estado !== undefined) {
    condiciones.push('o.estado = ?');
    params.push(estado);
  }
  if (cliente_ids !== undefined) {
    if (cliente_ids.length === 0) return []; // carga vacía: sin objetivos
    condiciones.push(`o.cliente_id IN (${cliente_ids.map(() => '?').join(', ')})`);
    params.push(...cliente_ids);
  }
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  return consultar(
    `${SELECT_CON_CLIENTE}
     ${where}
      ORDER BY o.id DESC`,
    params
  );
}

export async function findById(id) {
  const filas = await consultar(
    `${SELECT_CON_CLIENTE}
      WHERE o.id = ?
      LIMIT 1`,
    [id]
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
    `UPDATE objetivos_entrenamiento SET ${columnas.join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return resultado.affectedRows > 0;
}
