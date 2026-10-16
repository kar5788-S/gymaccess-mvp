// T022 [US2] Validaciones de membresías (data-model.md, contracts/api.md):
// identificadores obligatorios y fecha_inicio con formato AAAA-MM-DD.

import { body, param } from 'express-validator';

const ESTADOS_PERMITIDOS = ['activa', 'suspendida', 'cancelada'];

const esFechaValida = (valor) =>
  /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
  !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));

export const reglasAsignarMembresia = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('El cliente es obligatorio y debe ser un identificador válido.'),
  body('tipo_membresia_id')
    .isInt({ min: 1 })
    .withMessage('El tipo de membresía es obligatorio y debe ser válido.'),
  body('fecha_inicio')
    .custom(esFechaValida)
    .withMessage('La fecha de inicio debe tener el formato AAAA-MM-DD.'),
];

export const reglasCambiarEstadoMembresia = [
  param('id').isInt({ min: 1 }).withMessage('El identificador de membresía no es válido.'),
  body('estado')
    .isIn(ESTADOS_PERMITIDOS)
    .withMessage(`El estado debe ser ${ESTADOS_PERMITIDOS.join(', ')}.`),
];
