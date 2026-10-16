// T017 [US2] Modelo de asignaciones de entrenador a cliente: consultas
// parametrizadas (FR-021) y sin borrado físico — las vigencias se cierran
// con `fecha_fin` y se conservan todas (FR-005, FR-025, SC-008).
// Las funciones que llevan `conexion` participan en la transacción de
// reasignación (R-29).

import { consultar, ejecutar, consultarCon, ejecutarCon } from '../config/db.js';

const SELECT_CON_NOMBRES = `
  SELECT a.id, a.cliente_id, a.entrenador_id, a.fecha_inicio, a.fecha_fin,
         a.estado, c.nombre_completo AS cliente, e.nombre AS entrenador
    FROM asignaciones_entrenador a
    JOIN clientes c ON c.id = a.cliente_id
    JOIN entrenadores e ON e.id = a.entrenador_id`;

export async function crear(
  { cliente_id, entrenador_id, fecha_inicio, estado = 'activa' },
  conexion = null
) {
  const resultado = await ejecutarCon(
    conexion,
    `INSERT INTO asignaciones_entrenador
       (cliente_id, entrenador_id, fecha_inicio, estado)
     VALUES (?, ?, ?, ?)`,
    [cliente_id, entrenador_id, fecha_inicio, estado]
  );
  return resultado.insertId;
}

export async function listar({ cliente_id, entrenador_id, estado } = {}) {
  const condiciones = [];
  const params = [];
  if (cliente_id !== undefined) {
    condiciones.push('a.cliente_id = ?');
    params.push(cliente_id);
  }
  if (entrenador_id !== undefined) {
    condiciones.push('a.entrenador_id = ?');
    params.push(entrenador_id);
  }
  if (estado !== undefined) {
    condiciones.push('a.estado = ?');
    params.push(estado);
  }
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  return consultar(
    `${SELECT_CON_NOMBRES}
     ${where}
      ORDER BY a.id DESC`,
    params
  );
}

export async function findById(id) {
  const filas = await consultar(
    `${SELECT_CON_NOMBRES}
      WHERE a.id = ?
      LIMIT 1`,
    [id]
  );
  return filas[0] ?? null;
}

// Vigente (estado = 'activa') de un cliente: la usa también rutina.service
// para derivar al responsable (US3).
export async function findVigentePorCliente(clienteId, conexion = null) {
  const filas = await consultarCon(
    conexion,
    `${SELECT_CON_NOMBRES}
      WHERE a.cliente_id = ? AND a.estado = 'activa'
      ORDER BY a.id DESC
      LIMIT 1`,
    [clienteId]
  );
  return filas[0] ?? null;
}

// Cierra TODAS las vigencias del cliente (se usa al reasignar: la regla
// de negocio garantiza una sola, pero el cierre es a prueba de fallos).
export async function cerrarVigentePorCliente(clienteId, fechaFin, conexion = null) {
  const resultado = await ejecutarCon(
    conexion,
    `UPDATE asignaciones_entrenador
        SET fecha_fin = ?, estado = 'cerrada'
      WHERE cliente_id = ? AND estado = 'activa'`,
    [fechaFin, clienteId]
  );
  return resultado.affectedRows;
}

// Cierre manual de una asignación puntual; solo actúa si está activa.
export async function cerrar(id, fechaFin, conexion = null) {
  const resultado = await ejecutarCon(
    conexion,
    `UPDATE asignaciones_entrenador
        SET fecha_fin = ?, estado = 'cerrada'
      WHERE id = ? AND estado = 'activa'`,
    [fechaFin, id]
  );
  return resultado.affectedRows > 0;
}
