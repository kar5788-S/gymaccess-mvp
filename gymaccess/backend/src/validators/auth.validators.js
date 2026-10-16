// T017 [US1] Validaciones del inicio de sesión (FR-011).

import { body } from 'express-validator';

export const reglasLogin = [
  body('email')
    .isEmail()
    .withMessage('El correo no tiene un formato válido.'),
  body('contraseña')
    .notEmpty()
    .withMessage('La contraseña es obligatoria.'),
];
