// T013 [US1] Llamadas de perfiles de entrenador (contracts/api.md).
// US7 agrega listarConCarga, obtenerConClientes y obtenerMiCarga.

import { apiFetch } from './http.js';

export async function listarEntrenadores(token, estado) {
  const ruta = estado
    ? `/api/entrenadores?estado=${encodeURIComponent(estado)}`
    : '/api/entrenadores';
  const cuerpo = await apiFetch(ruta, { token });
  return cuerpo.datos;
}

export async function crearEntrenador(token, datos) {
  const cuerpo = await apiFetch('/api/entrenadores', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function modificarEntrenador(token, id, datos) {
  const cuerpo = await apiFetch(`/api/entrenadores/${id}`, {
    metodo: 'PUT',
    datos,
    token,
  });
  return cuerpo.datos;
}

// ---- US7: personal con su carga (HU7, FR-007) ----

// El listado del personal ya incluye `clientes_asignados` en cada perfil
// (asignaciones con estado `activa`); este nombre lo usa la vista con la
// columna de carga.
export async function listarConCarga(token, estado) {
  return listarEntrenadores(token, estado);
}

// Ficha del entrenador con su usuario y la lista de clientes vigentes.
export async function obtenerConClientes(token, id) {
  const cuerpo = await apiFetch(`/api/entrenadores/${id}`, { token });
  return cuerpo.datos;
}

// Carga propia del entrenador autenticado: estados y fechas de membresía,
// sin importes. Devuelve [] cuando aún no tiene clientes asignados.
export async function obtenerMiCarga(token) {
  const cuerpo = await apiFetch('/api/entrenadores/mio/clientes', { token });
  return cuerpo.datos;
}
