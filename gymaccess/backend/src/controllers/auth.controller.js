// T018 [US1] Controlador de autenticación.

import { iniciarSesion } from '../services/auth.service.js';
import { responderExito } from '../utils/responses.js';

export async function login(req, res, next) {
  try {
    const datos = await iniciarSesion(req.body.email, req.body.contraseña);
    return responderExito(res, datos, 'Sesión iniciada correctamente.');
  } catch (error) {
    return next(error);
  }
}
