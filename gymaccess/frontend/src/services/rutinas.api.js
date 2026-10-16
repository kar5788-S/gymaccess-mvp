// T031 [US3] Llamadas de rutinas de entrenamiento (contracts/api.md).

import { apiFetch } from './http.js';

export async function listarRutinas(token, filtros = {}) {
  const parametros = new URLSearchParams();
  if (filtros.cliente_id !== undefined) parametros.set('cliente_id', filtros.cliente_id);
  if (filtros.entrenador_id !== undefined)
    parametros.set('entrenador_id', filtros.entrenador_id);
  if (filtros.estado) parametros.set('estado', filtros.estado);
  const consulta = parametros.toString();
  const cuerpo = await apiFetch(`/api/rutinas${consulta ? `?${consulta}` : ''}`, {
    token,
  });
  return cuerpo.datos;
}

export async function crearRutina(token, datos) {
  const cuerpo = await apiFetch('/api/rutinas', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

// Devuelve { rutina, ejercicios } (detalle para editar).
export async function obtenerRutina(token, id) {
  const cuerpo = await apiFetch(`/api/rutinas/${id}`, { token });
  return cuerpo.datos;
}

export async function modificarRutina(token, id, datos) {
  const cuerpo = await apiFetch(`/api/rutinas/${id}`, {
    metodo: 'PUT',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function cambiarEstadoRutina(token, id, estado) {
  const cuerpo = await apiFetch(`/api/rutinas/${id}/estado`, {
    metodo: 'PUT',
    datos: { estado },
    token,
  });
  return cuerpo.datos;
}
