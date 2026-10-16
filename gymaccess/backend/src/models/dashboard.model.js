// T054 [US6] Modelo del dashboard (FR-016, FR-017; research R-33):
// - Agregados parametrizados por periodo (COUNT/SUM) sobre pagos, accesos
//   y progresos; `desde = null` significa periodo histórico sin límite.
// - Lectura de la vista `estadisticas_dashboard` (solo el backend la
//   consulta: el frontend nunca la ve — FR-018/FR-019, Principio II).
// - Solo cifras agregadas: ninguna consulta retorna nombres de clientes.

import { consultar } from '../config/db.js';

const CARGA_VIGENTE =
  'cliente_id IN (SELECT cliente_id FROM asignaciones_entrenador ' +
  "WHERE entrenador_id = ? AND estado = 'activa')";

// Totales sensibles al periodo: ingresos, pagos, accesos y progresos.
// `desde = null` (histórico) omite el filtro de fecha. Las cifras se
// normalizan a número (SUM de DECIMAL llega como texto).
export async function obtenerTotalesPeriodo(desde = null) {
  const condPagos = desde === null ? '' : 'WHERE pg.fecha_pago >= ?';
  const condAccesos =
    desde === null ? '' : ' AND ac.fecha >= ?';
  const condProgresos = desde === null ? '' : 'WHERE pr.fecha >= ?';
  const params = desde === null ? [] : [desde, desde, desde, desde, desde];

  const filas = await consultar(
    `SELECT
       (SELECT COALESCE(SUM(pg.monto), 0) FROM pagos pg
         ${condPagos}) AS ingresos_periodo,
       (SELECT COUNT(*) FROM pagos pg
         ${condPagos}) AS pagos_periodo,
       (SELECT COUNT(*) FROM accesos ac
         WHERE ac.resultado = 'autorizado'${condAccesos}) AS accesos_autorizados,
       (SELECT COUNT(*) FROM accesos ac
         WHERE ac.resultado = 'rechazado'${condAccesos}) AS accesos_rechazados,
       (SELECT COUNT(*) FROM progresos_clientes pr
         ${condProgresos}) AS progresos_recientes`,
    params
  );

  const fila = filas[0] ?? {};
  return {
    ingresos_periodo: Number(fila.ingresos_periodo ?? 0),
    pagos_periodo: Number(fila.pagos_periodo ?? 0),
    accesos_autorizados: Number(fila.accesos_autorizados ?? 0),
    accesos_rechazados: Number(fila.accesos_rechazados ?? 0),
    progresos_recientes: Number(fila.progresos_recientes ?? 0),
  };
}

// Indicadores globales sin periodo, leídos de la vista.
export async function obtenerEstadisticasGenerales() {
  const filas = await consultar('SELECT * FROM estadisticas_dashboard');
  const fila = filas[0] ?? {};
  return {
    clientes_total: Number(fila.clientes_total ?? 0),
    clientes_activos: Number(fila.clientes_activos ?? 0),
    membresias_activas: Number(fila.membresias_activas ?? 0),
    membresias_vencidas: Number(fila.membresias_vencidas ?? 0),
    entrenadores_activos: Number(fila.entrenadores_activos ?? 0),
    clientes_con_entrenador: Number(fila.clientes_con_entrenador ?? 0),
    rutinas_activas: Number(fila.rutinas_activas ?? 0),
    objetivos_en_curso: Number(fila.objetivos_en_curso ?? 0),
    objetivos_cumplidos: Number(fila.objetivos_cumplidos ?? 0),
  };
}

// Panel de la carga del entrenador: todo restringido a sus clientes con
// asignación vigente y SIN información financiera (clarify Q1 B).
export async function obtenerPanelEntrenador(entrenador_id, desde = null) {
  const condPeriodo = desde === null ? '' : ' AND pr.fecha >= ?';
  // Orden exacto de los marcadores del SQL: los cinco entrenador_id del
  // panel, con el de `fecha` colocado antes que el de la carga en
  // progresos (esa subconsulta recibe el periodo primero).
  const params =
    desde === null
      ? [entrenador_id, entrenador_id, entrenador_id, entrenador_id, entrenador_id]
      : [entrenador_id, entrenador_id, entrenador_id, entrenador_id, desde, entrenador_id];

  const filas = await consultar(
    `SELECT
       (SELECT COUNT(*) FROM asignaciones_entrenador
         WHERE entrenador_id = ? AND estado = 'activa') AS clientes_carga,
       (SELECT COUNT(*) FROM rutinas r
         WHERE r.estado = 'activa' AND ${CARGA_VIGENTE}) AS rutinas_activas,
       (SELECT COUNT(*) FROM objetivos_entrenamiento o
         WHERE o.estado = 'en curso' AND ${CARGA_VIGENTE}) AS objetivos_en_curso,
       (SELECT COUNT(*) FROM objetivos_entrenamiento o
         WHERE o.estado = 'cumplido' AND ${CARGA_VIGENTE}) AS objetivos_cumplidos,
       (SELECT COUNT(*) FROM progresos_clientes pr
         WHERE 1 = 1${condPeriodo} AND ${CARGA_VIGENTE}) AS progresos_recientes`,
    params
  );

  const fila = filas[0] ?? {};
  return {
    clientes_carga: Number(fila.clientes_carga ?? 0),
    rutinas_activas: Number(fila.rutinas_activas ?? 0),
    objetivos_en_curso: Number(fila.objetivos_en_curso ?? 0),
    objetivos_cumplidos: Number(fila.objetivos_cumplidos ?? 0),
    progresos_recientes: Number(fila.progresos_recientes ?? 0),
  };
}
