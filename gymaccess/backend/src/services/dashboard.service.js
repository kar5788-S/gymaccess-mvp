// T056 [US6] Servicio del dashboard (FR-016…FR-019).
// - Administrador: 14 indicadores agregados; solo cifras y resúmenes,
//   sin nombres ni datos sensibles de clientes (FR-019).
// - Entrenador: panel SOLO de su carga (perfil resuelto desde la sesión)
//   y sin cifras financieras (clarify 2026-10-15 Q1, respuesta B).
// - Periodos: `mes` (mes en curso), `30d` (últimos 30 días) e
//   `historico` (sin límite inferior) — FR-017.

import * as dashboardModelo from '../models/dashboard.model.js';
import { perfilDeEntrenador } from './asignacion.service.js';

// Fecha local en formato AAAA-MM-DD (para comparar con columnas DATE).
function fechaISO(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate()
  ).padStart(2, '0')}`;
}

// Inicio del rango del periodo; `null` = sin límite (histórico).
function inicioDePeriodo(periodo) {
  const hoy = new Date();
  if (periodo === 'historico') return null;
  if (periodo === '30d') {
    hoy.setDate(hoy.getDate() - 30);
    return fechaISO(hoy);
  }
  // mes en curso: desde el día 1 a medianoche local.
  return fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
}

// Panel completo del administrador (GET /api/dashboard).
export async function obtenerIndicadoresGenerales(periodo = 'mes') {
  const desde = inicioDePeriodo(periodo);
  const [vista, totales] = await Promise.all([
    dashboardModelo.obtenerEstadisticasGenerales(),
    dashboardModelo.obtenerTotalesPeriodo(desde),
  ]);

  return {
    periodo,
    indicadores: {
      clientes_total: vista.clientes_total,
      clientes_activos: vista.clientes_activos,
      membresias_activas: vista.membresias_activas,
      membresias_vencidas: vista.membresias_vencidas,
      ingresos_periodo: totales.ingresos_periodo,
      pagos_periodo: totales.pagos_periodo,
      accesos_autorizados: totales.accesos_autorizados,
      accesos_rechazados: totales.accesos_rechazados,
      entrenadores_activos: vista.entrenadores_activos,
      clientes_con_entrenador: vista.clientes_con_entrenador,
      rutinas_activas: vista.rutinas_activas,
      objetivos_en_curso: vista.objetivos_en_curso,
      objetivos_cumplidos: vista.objetivos_cumplidos,
      progresos_recientes: totales.progresos_recientes,
    },
  };
}

// Panel reducido del entrenador (GET /api/dashboard/mio): sin ingresos,
// pagos ni ningún dato financiero (FR-018, HU6 esc.6).
export async function obtenerPanelPropio(periodo = 'mes', usuario = null) {
  const perfil = await perfilDeEntrenador(usuario);
  const desde = inicioDePeriodo(periodo);
  const panel = await dashboardModelo.obtenerPanelEntrenador(perfil.id, desde);

  return {
    periodo,
    indicadores: {
      clientes_carga: panel.clientes_carga,
      rutinas_activas: panel.rutinas_activas,
      objetivos_en_curso: panel.objetivos_en_curso,
      objetivos_cumplidos: panel.objetivos_cumplidos,
      progresos_recientes: panel.progresos_recientes,
    },
  };
}
