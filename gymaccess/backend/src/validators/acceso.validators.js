// T064 [US6] Validación del intento de acceso (contracts/api.md):
// `descriptor` debe estar presente (usa `null` para simular la cámara no
// disponible o la captura fallida); la forma exacta de 128 valores la
// valida el servicio para responder `DESCRIPTOR_INVALIDO`.

import { body } from 'express-validator';

export const reglasIntentoAcceso = [
  body('descriptor')
    // `exists()` por defecto acepta `null` y solo falla si la llave no
    // viene: así `null` simula la cámara no disponible (contracts/api.md).
    .exists()
    .withMessage(
      'Debe enviar el descriptor facial; use null si la cámara no está disponible.'
    )
    .custom((valor) => valor === null || Array.isArray(valor))
    .withMessage('El descriptor facial debe ser null o una lista de valores.'),
];
