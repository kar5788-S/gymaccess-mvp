// T017 [US1] Llamadas de tipos de membresía (contracts/api.md).

import { apiFetch } from './http.js';

export async function listarTiposMembresia(token, estado) {
  const ruta = estado
    ? `/api/tipos-membresia?estado=${encodeURIComponent(estado)}`
    : '/api/tipos-membresia';
  const cuerpo = await apiFetch(ruta, { token });
  return cuerpo.datos;
}

export async function crearTipoMembresia(token, datos) {
  const cuerpo = await apiFetch('/api/tipos-membresia', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function modificarTipoMembresia(token, id, datos) {
  const cuerpo = await apiFetch(`/api/tipos-membresia/${id}`, {
    metodo: 'PUT',
    datos,
    token,
  });
  return cuerpo.datos;
}
