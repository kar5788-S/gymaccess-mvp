// T026 [US2] Llamadas de membresías (asignación y consulta).

import { apiFetch } from './http.js';

export async function asignarMembresia(token, datos) {
  const cuerpo = await apiFetch('/api/membresias', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function listarMembresias(token, { clienteId, estado } = {}) {
  const parametros = new URLSearchParams();
  if (clienteId) parametros.set('cliente_id', clienteId);
  if (estado) parametros.set('estado', estado);
  const consulta = parametros.toString();
  const ruta = consulta ? `/api/membresias?${consulta}` : '/api/membresias';
  const cuerpo = await apiFetch(ruta, { token });
  return cuerpo.datos;
}

export async function obtenerMembresia(token, id) {
  const cuerpo = await apiFetch(`/api/membresias/${id}`, { token });
  return cuerpo.datos;
}

// ---- US4: renovación y estados ----

export async function renovarMembresia(token, id) {
  const cuerpo = await apiFetch(`/api/membresias/${id}/renovar`, {
    metodo: 'POST',
    datos: {},
    token,
  });
  return cuerpo.datos;
}

export async function cambiarEstadoMembresia(token, id, estado) {
  const cuerpo = await apiFetch(`/api/membresias/${id}/estado`, {
    metodo: 'PUT',
    datos: { estado },
    token,
  });
  return cuerpo.datos;
}
