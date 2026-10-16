// T049 [US5] Validaciones de rostros (contracts/api.md):
// `cliente_id` obligatorio y `descriptor` presente como arreglo.
// La verificación EXACTA de "128 valores numéricos" la realiza el servicio
// para responder con el código `DESCRIPTOR_INVALIDO` exigido por el
// contrato (si express-validator la rechazara, el código sería `VALIDACION`).

import { body } from 'express-validator';

export const reglasRegistrarRostro = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('El cliente es obligatorio y debe ser un identificador válido.'),
  body('descriptor')
    .isArray()
    .withMessage('El descriptor facial debe ser una lista de 128 valores numéricos.'),
];
