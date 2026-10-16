// T056 [US5] Llamadas de información facial (solo metadatos; el descriptor
// viaja únicamente en el registro y nunca en las respuestas, FR-017).

import { apiFetch } from './http.js';

export async function registrarRostro(token, clienteId, descriptor) {
  const cuerpo = await apiFetch('/api/rostros', {
    metodo: 'POST',
    datos: { cliente_id: Number(clienteId), descriptor },
    token,
  });
  return cuerpo.datos;
}

export async function estadoRostro(token, clienteId) {
  const cuerpo = await apiFetch(`/api/rostros/${clienteId}`, { token });
  return cuerpo.datos;
}
