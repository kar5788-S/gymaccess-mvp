// T019 [US1] Llamada de inicio de sesión contra la API.

import { apiFetch } from './http.js';

export async function iniciarSesion(email, contrasena) {
  const cuerpo = await apiFetch('/api/auth/login', {
    metodo: 'POST',
    datos: { email, contraseña: contrasena },
  });
  // Devuelve { token, usuario }.
  return cuerpo.datos;
}
