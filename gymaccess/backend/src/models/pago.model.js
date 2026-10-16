// T031 [US3] Modelo de pagos: historial inmutable (FR-008, sin borrado),
// consultas parametrizadas (FR-013) y método único `efectivo` (R-18).

import { consultar, ejecutar } from '../config/db.js';

export async function crear({
  cliente_id,
  membresia_id,
  monto,
  metodo = 'efectivo',
  fecha_pago,
}) {
  if (fecha_pago) {
    const resultado = await ejecutar(
      `INSERT INTO pagos (cliente_id, membresia_id, monto, metodo, fecha_pago)
       VALUES (?, ?, ?, ?, ?)`,
      [cliente_id, membresia_id, monto, metodo, fecha_pago]
    );
    return resultado.insertId;
  }
  const resultado = await ejecutar(
    `INSERT INTO pagos (cliente_id, membresia_id, monto, metodo)
     VALUES (?, ?, ?, ?)`,
    [cliente_id, membresia_id, monto, metodo]
  );
  return resultado.insertId;
}

const CONSULTA_BASE = `
  SELECT p.id, p.cliente_id, c.nombre_completo AS cliente,
         p.membresia_id, t.nombre AS tipo_membresia,
         m.fecha_vencimiento, m.estado AS membresia_estado,
         p.monto, p.fecha_pago, p.metodo
    FROM pagos p
    JOIN clientes c ON c.id = p.cliente_id
    JOIN membresias m ON m.id = p.membresia_id
    JOIN tipos_membresia t ON t.id = m.tipo_membresia_id`;

export async function findById(id) {
  const filas = await consultar(`${CONSULTA_BASE} WHERE p.id = ? LIMIT 1`, [id]);
  return filas[0] ?? null;
}

export async function listar({ cliente_id, desde, hasta } = {}) {
  const condiciones = [];
  const params = [];
  if (cliente_id) {
    condiciones.push('p.cliente_id = ?');
    params.push(cliente_id);
  }
  if (desde) {
    condiciones.push('DATE(p.fecha_pago) >= ?');
    params.push(desde);
  }
  if (hasta) {
    condiciones.push('DATE(p.fecha_pago) <= ?');
    params.push(hasta);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return consultar(
    `${CONSULTA_BASE} ${where} ORDER BY p.fecha_pago DESC, p.id DESC`,
    params
  );
}

// Verifica que la membresía exista y pertenezca al cliente indicado (FR-007).
export async function findMembresiaDeCliente(membresiaId, clienteId) {
  const filas = await consultar(
    `SELECT id, cliente_id, tipo_membresia_id, fecha_inicio,
            fecha_vencimiento, estado, precio
       FROM membresias
      WHERE id = ? AND cliente_id = ?
      LIMIT 1`,
    [membresiaId, clienteId]
  );
  return filas[0] ?? null;
}

// Suma pagada efectiva de una membresía.
export async function totalPagadoMembresia(membresiaId) {
  const filas = await consultar(
    `SELECT COALESCE(SUM(monto), 0) AS pagado
       FROM pagos
      WHERE membresia_id = ?`,
    [membresiaId]
  );
  return Number(filas[0]?.pagado ?? 0);
}
