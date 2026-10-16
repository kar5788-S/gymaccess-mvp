// T062 [US6] Modelo de accesos: cada intento se registra con su fecha y
// hora por defecto; `cliente_id` es NULLable (rostro no identificado) y
// `motivo_rechazo` es obligatorio cuando `resultado = 'rechazado'`
// (se garantiza aquí y en el servicio). Sin operaciones de borrado (FR-015).

import { consultar, ejecutar } from '../config/db.js';

const MOTIVOS_PERMITIDOS = [
  'membresia_vencida',
  'membresia_suspendida',
  'membresia_cancelada',
  'sin_membresia',
  'rostro_no_identificado',
];

export { MOTIVOS_PERMITIDOS };

export async function crear({ cliente_id, resultado, motivo_rechazo = null }) {
  if (resultado === 'rechazado' && !motivo_rechazo) {
    throw new Error('Todo acceso rechazado debe indicar un motivo.');
  }
  if (resultado === 'autorizado' && motivo_rechazo) {
    throw new Error('Un acceso autorizado no puede llevar motivo de rechazo.');
  }

  const resultadoInsert = await ejecutar(
    `INSERT INTO accesos (cliente_id, resultado, motivo_rechazo)
     VALUES (?, ?, ?)`,
    [cliente_id ?? null, resultado, motivo_rechazo]
  );
  return resultadoInsert.insertId;
}

const CONSULTA_BASE = `
  SELECT a.id, a.cliente_id,
         CASE WHEN a.cliente_id IS NULL THEN NULL
              ELSE c.nombre_completo END AS cliente,
         a.fecha, a.hora, a.resultado, a.motivo_rechazo
    FROM accesos a
    LEFT JOIN clientes c ON c.id = a.cliente_id`;

export async function listar({ fecha, resultado, cliente_id } = {}) {
  const condiciones = [];
  const params = [];
  if (fecha) {
    condiciones.push('a.fecha = ?');
    params.push(fecha);
  }
  if (resultado) {
    condiciones.push('a.resultado = ?');
    params.push(resultado);
  }
  if (cliente_id) {
    condiciones.push('a.cliente_id = ?');
    params.push(cliente_id);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return consultar(
    `${CONSULTA_BASE} ${where} ORDER BY a.fecha DESC, a.hora DESC, a.id DESC`,
    params
  );
}

export async function contarHoy() {
  const filas = await consultar(
    `SELECT COUNT(*) AS total FROM accesos WHERE fecha = CURRENT_DATE`
  );
  return Number(filas[0]?.total ?? 0);
}
