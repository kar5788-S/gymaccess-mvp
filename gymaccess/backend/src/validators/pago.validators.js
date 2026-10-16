// T032 [US3] Validaciones de pagos (data-model.md): monto > 0 y método
// obligatorio; en este sprint el único valor permitido es `efectivo`
// (R-18, decisión de /speckit.clarify 2026-10-14).

import { body } from 'express-validator';

export const reglasCrearPago = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('El cliente es obligatorio y debe ser válido.'),
  body('membresia_id')
    .isInt({ min: 1 })
    .withMessage('La membresía es obligatoria: todo pago se registra contra una membresía.'),
  body('monto')
    .isFloat({ gt: 0 })
    .withMessage('El monto debe ser un número mayor que cero.'),
  body('metodo')
    .optional({ values: 'null' })
    .equals('efectivo')
    .withMessage('El único método de pago permitido es efectivo.'),
  body('fecha_pago')
    .optional({ values: 'null' })
    .custom(
      (valor) =>
        /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
        !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))
    )
    .withMessage('La fecha de pago debe tener el formato AAAA-MM-DD.'),
];
