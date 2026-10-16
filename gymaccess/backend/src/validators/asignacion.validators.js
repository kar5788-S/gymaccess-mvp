// T018 [US2] Validaciones de asignaciones (data-model.md): cliente_id y
// entrenador_id obligatorios; en filtros/estados solo `activa|cerrada`.
// Mensajes claros en español (FR-024).

import { body, query } from 'express-validator';

const ESTADOS_PERMITIDOS = ['activa', 'cerrada'];

export const reglasCrearAsignacion = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('Debe indicar el cliente al que se asigna el entrenador (número entero mayor que cero).'),
  body('entrenador_id')
    .isInt({ min: 1 })
    .withMessage('Debe indicar el entrenador asignado (número entero mayor que cero).'),
];

// Filtro de GET /api/asignaciones: estado y números de identificación.
export const reglasFiltrarAsignaciones = [
  query('cliente_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El filtro de cliente debe ser un número entero mayor que cero.'),
  query('entrenador_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El filtro de entrenador debe ser un número entero mayor que cero.'),
  query('estado')
    .optional()
    .isIn(ESTADOS_PERMITIDOS)
    .withMessage('El estado solo puede ser "activa" o "cerrada".'),
];
