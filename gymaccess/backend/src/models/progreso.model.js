// T036 [US4] Modelo de progresos de clientes: consultas parametrizadas
// (FR-021) y sin borrado físico — el historial es de solo escritura
// sobre el registro que se corrige, nunca se elimina (FR-012, FR-025;
// R-32). Listado por fecha ascendente con rango `desde`/`hasta`.

import { consultar, ejecutar } from '../config/db.js';

export const COLUMNAS_ACTUALIZABLES = [
  'objetivo_id',
  'fecha',
  'peso',
  'medidas',
  'marca',
  'comentario',
];

const SELECT_CON_DETALLE = `
  SELECT p.id, p.cliente_id, p.objetivo_id, p.fecha, p.peso, p.medidas,
         p.marca, p.comentario, p.creado_en, p.actualizado_en,
         c.nombre_completo AS cliente, o.descripcion AS objetivo
    FROM progresos_clientes p
    JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN objetivos_entrenamiento o ON o.id = p.objetivo_id`;

export async function crear({
  cliente_id,
  objetivo_id,
  fecha,
  peso,
  medidas,
  marca,
  comentario,
}) {
  const resultado = await ejecutar(
    `INSERT INTO progresos_clientes
       (cliente_id, objetivo_id, fecha, peso, medidas, marca, comentario)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cliente_id,
      objetivo_id ?? null,
      fecha,
      peso ?? null,
      medidas ?? null,
      marca ?? null,
      comentario ?? null,
    ]
  );
  return resultado.insertId;
}

export async function listar({
  cliente_id,
  objetivo_id,
  desde,
  hasta,
  cliente_ids,
} = {}) {
  const condiciones = [];
  const params = [];
  if (cliente_id !== undefined) {
    condiciones.push('p.cliente_id = ?');
    params.push(cliente_id);
  }
  if (objetivo_id !== undefined) {
    condiciones.push('p.objetivo_id = ?');
    params.push(objetivo_id);
  }
  if (desde !== undefined) {
    condiciones.push('p.fecha >= ?');
    params.push(desde);
  }
  if (hasta !== undefined) {
    condiciones.push('p.fecha <= ?');
    params.push(hasta);
  }
  if (cliente_ids !== undefined) {
    if (cliente_ids.length === 0) return []; // carga vacía: sin progresos
    condiciones.push(`p.cliente_id IN (${cliente_ids.map(() => '?').join(', ')})`);
    params.push(...cliente_ids);
  }
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  return consultar(
    `${SELECT_CON_DETALLE}
     ${where}
      ORDER BY p.fecha ASC, p.id ASC`,
    params
  );
}

export async function findById(id) {
  const filas = await consultar(
    `${SELECT_CON_DETALLE}
      WHERE p.id = ?
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
    `UPDATE progresos_clientes SET ${columnas.join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return resultado.affectedRows > 0;
}
