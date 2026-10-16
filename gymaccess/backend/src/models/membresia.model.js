// T021 [US2] Modelo de membresías: consultas parametrizadas (FR-013),
// sin operaciones de borrado. El precio se congela al asignar (FR-002) y
// el adeudo se calcula con la fórmula de R-19/R-26, nunca es columna.

import { consultar, ejecutar } from '../config/db.js';

export const COLUMNAS_ACTUALIZABLES = ['estado', 'fecha_vencimiento'];

export async function crear({
  cliente_id,
  tipo_membresia_id,
  fecha_inicio,
  fecha_vencimiento,
  estado = 'activa',
  precio,
}) {
  const resultado = await ejecutar(
    `INSERT INTO membresias
       (cliente_id, tipo_membresia_id, fecha_inicio, fecha_vencimiento, estado, precio)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cliente_id, tipo_membresia_id, fecha_inicio, fecha_vencimiento, estado, precio]
  );
  return resultado.insertId;
}

const CONSULTA_BASE = `
  SELECT m.id, m.cliente_id, c.nombre_completo AS cliente,
         c.estado AS cliente_estado,
         m.tipo_membresia_id, t.nombre AS tipo, t.descripcion,
         m.fecha_inicio, m.fecha_vencimiento, m.estado, m.precio,
         GREATEST(0, m.precio - COALESCE(p.pagado, 0)) AS saldo_pendiente
    FROM membresias m
    JOIN clientes c ON c.id = m.cliente_id
    JOIN tipos_membresia t ON t.id = m.tipo_membresia_id
    LEFT JOIN (
      SELECT membresia_id, SUM(monto) AS pagado
        FROM pagos GROUP BY membresia_id
    ) p ON p.membresia_id = m.id`;

export async function findById(id) {
  const filas = await consultar(`${CONSULTA_BASE} WHERE m.id = ? LIMIT 1`, [id]);
  return filas[0] ?? null;
}

// FR-004: una sola membresía en curso (activa o suspendida) por cliente.
export async function findEnCursoPorCliente(clienteId) {
  const filas = await consultar(
    `${CONSULTA_BASE}
      WHERE m.cliente_id = ? AND m.estado IN ('activa', 'suspendida')
      ORDER BY m.id DESC
      LIMIT 1`,
    [clienteId]
  );
  return filas[0] ?? null;
}

// Membresía vigente (activa y no vencida) o más reciente del cliente,
// usada por el control de acceso (US6) y por la consulta propia (US9).
export async function findVigentePorCliente(clienteId) {
  const filas = await consultar(
    `${CONSULTA_BASE}
      WHERE m.cliente_id = ?
      ORDER BY (m.estado = 'activa') DESC, m.fecha_vencimiento DESC, m.id DESC
      LIMIT 1`,
    [clienteId]
  );
  return filas[0] ?? null;
}

export async function listar({ cliente_id, estado } = {}) {
  const condiciones = [];
  const params = [];
  if (cliente_id) {
    condiciones.push('m.cliente_id = ?');
    params.push(cliente_id);
  }
  if (estado) {
    condiciones.push('m.estado = ?');
    params.push(estado);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return consultar(`${CONSULTA_BASE} ${where} ORDER BY m.id DESC`, params);
}

// Adeudo total del cliente (FR-023 / R-26): suma de los adeudos por
// membresía; nunca es negativo.
export async function calcularAdeudoCliente(clienteId) {
  const filas = await consultar(
    `SELECT COALESCE(SUM(GREATEST(0, m.precio - COALESCE(p.pagado, 0))), 0) AS adeudo
       FROM membresias m
       LEFT JOIN (
         SELECT membresia_id, SUM(monto) AS pagado
           FROM pagos GROUP BY membresia_id
       ) p ON p.membresia_id = m.id
      WHERE m.cliente_id = ?`,
    [clienteId]
  );
  return Number(filas[0]?.adeudo ?? 0);
}

export async function calcularAdeudoMembresia(membresiaId) {
  const filas = await consultar(
    `SELECT GREATEST(0, m.precio - COALESCE(p.pagado, 0)) AS adeudo
       FROM membresias m
       LEFT JOIN (
         SELECT membresia_id, SUM(monto) AS pagado
           FROM pagos GROUP BY membresia_id
       ) p ON p.membresia_id = m.id
      WHERE m.id = ?
      LIMIT 1`,
    [membresiaId]
  );
  return filas[0] ? Number(filas[0].adeudo) : null;
}

// Actualización de campos restringidos (estado, fecha_vencimiento) — US4.
export async function actualizar(id, campos) {
  const entradas = Object.entries(campos).filter(([c]) =>
    COLUMNAS_ACTUALIZABLES.includes(c)
  );
  if (entradas.length === 0) return false;

  const columnas = entradas.map(([c]) => `${c} = ?`);
  const valores = entradas.map(([, v]) => v);
  const resultado = await ejecutar(
    `UPDATE membresias SET ${columnas.join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return resultado.affectedRows > 0;
}
