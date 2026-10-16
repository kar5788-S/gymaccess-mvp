// Autenticación: valida el encabezado Authorization: Bearer <token> (R-06).

import { verificarToken } from '../config/jwt.js';
import { AppError, codigosError } from '../utils/errors.js';

export function autenticar(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return next(
      new AppError(
        codigosError.NO_AUTENTICADO,
        'Debe iniciar sesión para acceder.',
        401
      )
    );
  }

  try {
    const payload = verificarToken(token);
    req.usuario = {
      id: payload.sub,
      nombre: payload.nombre,
      email: payload.email,
      rol: payload.rol,
    };
    return next();
  } catch {
    return next(
      new AppError(
        codigosError.NO_AUTENTICADO,
        'La sesión es inválida o ha expirado. Inicie sesión de nuevo.',
        401
      )
    );
  }
}
