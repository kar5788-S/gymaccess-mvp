// T034 [US3] Llamadas de clientes (escritura; US4/US5 agregan consultas).

import { apiFetch } from './http.js';

export async function crearCliente(token, datos) {
  const cuerpo = await apiFetch('/api/clientes', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function modificarCliente(token, id, datos) {
  const cuerpo = await apiFetch(`/api/clientes/${id}`, {
    metodo: 'PUT',
    datos,
    token,
  });
  return cuerpo.datos;
}

// ---- US4: consultas ----

export async function listarClientes(token, q) {
  const ruta = q ? `/api/clientes?q=${encodeURIComponent(q)}` : '/api/clientes';
  const cuerpo = await apiFetch(ruta, { token });
  return cuerpo.datos;
}

export async function obtenerCliente(token, id) {
  const cuerpo = await apiFetch(`/api/clientes/${id}`, { token });
  return cuerpo.datos;
}

// ---- US5: información propia ----

export async function miInformacion(token) {
  const cuerpo = await apiFetch('/api/clientes/mio', { token });
  return cuerpo.datos;
}

// ---- US9: membresía propia en solo lectura (FR-024) ----

export async function obtenerMiMembresia(token) {
  const cuerpo = await apiFetch('/api/clientes/mio/membresia', { token });
  return cuerpo.datos;
}

// ---- US5: rutina y progreso propios (FR-014, FR-015) ----

// Devuelve { rutina } con la activa y sus ejercicios, o { rutina: null,
// mensaje } cuando no hay plan vigente (estado vacío del HU5 esc.3).
export async function obtenerMiRutina(token) {
  const cuerpo = await apiFetch('/api/clientes/mio/rutina', { token });
  return cuerpo.datos;
}

// Devuelve { objetivos, progresos } solo del cliente autenticado.
export async function obtenerMiProgreso(token) {
  const cuerpo = await apiFetch('/api/clientes/mio/progreso', { token });
  return cuerpo.datos;
}
