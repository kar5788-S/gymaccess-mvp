// Middleware compartido: convierte los errores de express-validator en
// respuestas 400 con envolvente estándar (FR-011, contracts/api.md).

import { validationResult } from 'express-validator';
import { codigosError } from '../utils/errors.js';

export function validar(req, res, next) {
  const resultado = validationResult(req);
  if (resultado.isEmpty()) return next();

  const detalles = resultado.array().map((e) => ({
    campo: e.path,
    mensaje: e.msg,
  }));

  return res.status(400).json({
    exito: false,
    error: {
      codigo: codigosError.VALIDACION,
      mensaje: 'Los datos enviados no son válidos.',
      detalles,
    },
  });
}
