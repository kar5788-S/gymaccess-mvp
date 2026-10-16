// T022 [US2] Llamadas de asignaciones de entrenador a cliente
// (contracts/api.md).

import { apiFetch } from './http.js';

export async function listarAsignaciones(token, filtros = {}) {
  const parametros = new URLSearchParams();
  if (filtros.cliente_id !== undefined) parametros.set('cliente_id', filtros.cliente_id);
  if (filtros.entrenador_id !== undefined)
    parametros.set('entrenador_id', filtros.entrenador_id);
  if (filtros.estado) parametros.set('estado', filtros.estado);
  const consulta = parametros.toString();
  const cuerpo = await apiFetch(
    `/api/asignaciones${consulta ? `?${consulta}` : ''}`,
    { token }
  );
  return cuerpo.datos;
}

export async function crearAsignacion(token, datos) {
  const cuerpo = await apiFetch('/api/asignaciones', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function cerrarAsignacion(token, id) {
  const cuerpo = await apiFetch(`/api/asignaciones/${id}/cerrar`, {
    metodo: 'PUT',
    token,
  });
  return cuerpo.datos;
}
