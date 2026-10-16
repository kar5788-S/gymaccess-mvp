// Manejo centralizado de errores (contracts/api.md, FR-002).
// Nunca se expone información técnica interna al usuario.

import { AppError, codigosError } from '../utils/errors.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    const error = { codigo: err.codigo, mensaje: err.mensaje };
    if (err.detalles) error.detalles = err.detalles;
    return res.status(err.status).json({ exito: false, error });
  }

  // Violación de unicidad u otra restricción de la base de datos.
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      exito: false,
      error: {
        codigo: codigosError.DUPLICADO,
        mensaje: 'El registro ya existe.',
      },
    });
  }

  // El detalle solo va al log del servidor, nunca al cliente.
  console.error('[error]', err);
  return res.status(500).json({
    exito: false,
    error: {
      codigo: codigosError.ERROR_INTERNO,
      mensaje: 'Ocurrió un error interno. Intente de nuevo más tarde.',
    },
  });
}
