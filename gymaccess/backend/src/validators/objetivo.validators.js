// T037 [US4] Validaciones de objetivos de entrenamiento (data-model.md):
// `descripcion` obligatoria; `fecha_limite` con formato de fecha legible;
// `estado` solo `en curso|cumplido`. Mensajes claros en español (FR-024).

import { body, query } from 'express-validator';

const ESTADOS_OBJETIVO = ['en curso', 'cumplido'];
const MENSAJE_FECHA = 'La fecha debe tener el formato AAAA-MM-DD.';

export const reglasCrearObjetivo = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('Debe indicar el cliente al que pertenece el objetivo (número entero mayor que cero).'),
  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripción del objetivo es obligatoria.')
    .isLength({ max: 255 })
    .withMessage('La descripción no puede superar los 255 caracteres.'),
  body('meta')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('La meta no puede superar los 255 caracteres.'),
  body('fecha_limite')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage(MENSAJE_FECHA),
];

export const reglasModificarObjetivo = [
  body('descripcion')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('La descripción del objetivo no puede quedar vacía.')
    .isLength({ max: 255 })
    .withMessage('La descripción no puede superar los 255 caracteres.'),
  body('meta')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('La meta no puede superar los 255 caracteres.'),
  body('fecha_limite')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage(MENSAJE_FECHA),
  body('estado')
    .optional()
    .isIn(ESTADOS_OBJETIVO)
    .withMessage('El estado del objetivo solo puede ser "en curso" o "cumplido".'),
];

export const reglasFiltrarObjetivos = [
  query('cliente_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El filtro de cliente debe ser un número entero mayor que cero.'),
  query('estado')
    .optional()
    .isIn(ESTADOS_OBJETIVO)
    .withMessage('El estado del objetivo solo puede ser "en curso" o "cumplido".'),
];
