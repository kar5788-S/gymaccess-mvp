// T024 [US2] Validaciones de usuarios.
// Política de contraseña (clarificación Q1): mínimo 8 caracteres,
// al menos una mayúscula y un número.

import { body } from 'express-validator';

export const ROLES = ['administrador', 'recepcionista', 'entrenador', 'cliente'];
export const ESTADOS = ['activo', 'deshabilitado'];

export const POLITICA_CONTRASENA =
  /^(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/;

export const MENSAJE_POLITICA_CONTRASENA =
  'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número.';

export const reglasCrearUsuario = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('email').isEmail().withMessage('El correo no tiene un formato válido.'),
  body('contraseña')
    .matches(POLITICA_CONTRASENA)
    .withMessage(MENSAJE_POLITICA_CONTRASENA),
  body('rol').isIn(ROLES).withMessage('El rol no es válido.'),
];

export const reglasActualizarUsuario = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío.'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('El correo no tiene un formato válido.'),
  body('contraseña')
    .optional()
    .matches(POLITICA_CONTRASENA)
    .withMessage(MENSAJE_POLITICA_CONTRASENA),
  body('rol').optional().isIn(ROLES).withMessage('El rol no es válido.'),
  body('estado')
    .optional()
    .isIn(ESTADOS)
    .withMessage('El estado no es válido.'),
];
