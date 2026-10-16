// T009 [US1] Validaciones de perfiles de entrenador (data-model.md):
// usuario_id y nombre obligatorios; teléfono y especialidad opcionales;
// estado solo `activo|inactivo`. Mensajes claros en español (FR-024).

import { body, query } from 'express-validator';

const ESTADOS_PERMITIDOS = ['activo', 'inactivo'];

// US7: filtro `?estado=` del listado del personal (FR-024).
export const reglasFiltrarEntrenadores = [
  query('estado')
    .optional()
    .isIn(ESTADOS_PERMITIDOS)
    .withMessage('El estado del entrenador solo puede ser "activo" o "inactivo".'),
];

export const reglasCrearEntrenador = [
  body('usuario_id')
    .isInt({ min: 1 })
    .withMessage('Debe indicar el usuario de la cuenta de entrenador (número entero mayor que cero).'),
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre del entrenador es obligatorio.')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar los 100 caracteres.'),
  body('telefono')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede superar los 30 caracteres.'),
  body('especialidad')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('La especialidad no puede superar los 120 caracteres.'),
];

export const reglasModificarEntrenador = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del entrenador no puede quedar vacío.')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar los 100 caracteres.'),
  body('telefono')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede superar los 30 caracteres.'),
  body('especialidad')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('La especialidad no puede superar los 120 caracteres.'),
  body('estado')
    .optional()
    .isIn(ESTADOS_PERMITIDOS)
    .withMessage('El estado solo puede ser "activo" o "inactivo".'),
];
