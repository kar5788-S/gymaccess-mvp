// T013 [US1] Validaciones de tipos de membresía (data-model.md):
// nombre obligatorio; duracion_dias > 0; precio ≥ 0; estado solo en
// el catálogo permitido. Los mensajes son claros y en español.

import { body } from 'express-validator';

const ESTADOS_PERMITIDOS = ['activo', 'inactivo'];

export const reglasCrearTipoMembresia = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre del tipo de membresía es obligatorio.')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar los 100 caracteres.'),
  body('descripcion')
    .optional({ values: 'null' })
    .isLength({ max: 255 })
    .withMessage('La descripción no puede superar los 255 caracteres.'),
  body('duracion_dias')
    .isInt({ min: 1 })
    .withMessage('La duración debe ser un número entero de días mayor que cero.'),
  body('precio')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número mayor o igual a cero.'),
];

export const reglasModificarTipoMembresia = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del tipo de membresía no puede estar vacío.')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar los 100 caracteres.'),
  body('descripcion')
    .optional({ values: 'null' })
    .isLength({ max: 255 })
    .withMessage('La descripción no puede superar los 255 caracteres.'),
  body('duracion_dias')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La duración debe ser un número entero de días mayor que cero.'),
  body('precio')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número mayor o igual a cero.'),
  body('estado')
    .optional()
    .isIn(ESTADOS_PERMITIDOS)
    .withMessage(`El estado debe ser ${ESTADOS_PERMITIDOS.join(' o ')}.`),
];
