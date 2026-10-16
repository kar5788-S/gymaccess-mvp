// T026 [US2] Llamadas de administración de usuarios.

import { apiFetch } from './http.js';

export async function listarUsuarios(token) {
  const cuerpo = await apiFetch('/api/usuarios', { token });
  return cuerpo.datos;
}

export async function obtenerUsuario(token, id) {
  const cuerpo = await apiFetch(`/api/usuarios/${id}`, { token });
  return cuerpo.datos;
}

export async function crearUsuario(token, datos) {
  const cuerpo = await apiFetch('/api/usuarios', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function actualizarUsuario(token, id, datos) {
  const cuerpo = await apiFetch(`/api/usuarios/${id}`, {
    metodo: 'PUT',
    datos,
    token,
  });
  return cuerpo.datos;
}
