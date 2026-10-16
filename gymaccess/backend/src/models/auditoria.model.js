// T008 [Foundational] Modelo de auditoría: escritura y consulta de las
// acciones críticas (FR-020). Sin operaciones de borrado.
// `descripcion` nunca contiene datos biométricos ni sensibles (R-22).

import { consultar, ejecutar } from '../config/db.js';

export const COLUMNAS_FILTRO = ['fecha', 'modulo', 'usuario_id', 'accion'];

export async function crear({ usuario_id, accion, modulo, resultado, descripcion }) {
  const resultadoInsert = await ejecutar(
    `INSERT INTO auditoria (usuario_id, accion, modulo, resultado, descripcion)
     VALUES (?, ?, ?, ?, ?)`,
    [usuario_id ?? null, accion, modulo, resultado, descripcion ?? null]
  );
  return resultadoInsert.insertId;
}

// Consulta para GET /api/auditoria con filtros opcionales y paginación simple.
export async function listar({ fecha, modulo, limite = 100 } = {}) {
  const condiciones = [];
  const params = [];

  if (fecha) {
    condiciones.push('DATE(a.fecha) = ?');
    params.push(fecha);
  }
  if (modulo) {
    condiciones.push('a.modulo = ?');
    params.push(modulo);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  params.push(Number(limite));

  return consultar(
    `SELECT a.id, a.usuario_id, u.nombre AS usuario, a.accion, a.modulo,
            a.fecha, a.resultado, a.descripcion
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${where}
      ORDER BY a.fecha DESC, a.id DESC
      LIMIT ?`,
    params
  );
}
