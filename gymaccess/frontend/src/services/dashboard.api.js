// T059 [US6] Llamadas del dashboard (contracts/api.md).

import { apiFetch } from './http.js';

// Panel completo del administrador: { periodo, indicadores } (14 cifras).
export async function obtenerDashboard(token, periodo = 'mes') {
  const cuerpo = await apiFetch(`/api/dashboard?periodo=${encodeURIComponent(periodo)}`, {
    token,
  });
  return cuerpo.datos;
}

// Panel reducido del entrenador: { periodo, indicadores } (5 cifras de su
// carga, sin información financiera — clarify Q1 respuesta B).
export async function obtenerMiDashboard(token, periodo = 'mes') {
  const cuerpo = await apiFetch(
    `/api/dashboard/mio?periodo=${encodeURIComponent(periodo)}`,
    { token }
  );
  return cuerpo.datos;
}
