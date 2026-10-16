// T032 [US3] Validaciones de clientes (data-model.md):
// nombre_completo obligatorio; al menos uno de telefono o correo.

import { body } from 'express-validator';

const alMenosUnContacto = body()
  .custom((valor, { req }) => Boolean(req.body.telefono) || Boolean(req.body.correo))
  .withMessage('Debe indicar al menos un teléfono o un correo.');

export const reglasCrearCliente = [
  body('nombre_completo')
    .trim()
    .notEmpty()
    .withMessage('El nombre completo es obligatorio.'),
  body('correo')
    .optional({ values: 'null' })
    .isEmail()
    .withMessage('El correo no tiene un formato válido.'),
  alMenosUnContacto,
  body('confirmar_duplicado')
    .optional()
    .isBoolean()
    .withMessage('La confirmación de duplicado debe ser verdadero o falso.'),
];

export const reglasModificarCliente = [
  body('nombre_completo')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre completo no puede estar vacío.'),
  body('correo')
    .optional({ values: 'null' })
    .isEmail()
    .withMessage('El correo no tiene un formato válido.'),
  body('confirmar_duplicado')
    .optional()
    .isBoolean()
    .withMessage('La confirmación de duplicado debe ser verdadero o falso.'),
  // US5 / FR-022: la baja se expresa con estado inactivo (sin borrado).
  body('estado')
    .optional()
    .isIn(['activo', 'inactivo'])
    .withMessage('El estado debe ser activo o inactivo.'),
];
