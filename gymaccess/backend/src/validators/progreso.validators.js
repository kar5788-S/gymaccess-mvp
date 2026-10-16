// T038 [US4] Validaciones de progresos de clientes (data-model.md,
// FR-022): `fecha` obligatoria con formato legible y al menos UN dato de
// medición entre `peso`, `medidas`, `marca` o `comentario` (HU4 esc.6).
// Mensajes claros en español (FR-024).

import { body, query } from 'express-validator';

const MENSAJE_FECHA = 'La fecha del progreso es obligatoria y debe tener el formato AAAA-MM-DD.';
const MENSAJE_SIN_DATO =
  'Debe registrar al menos un dato de medición: peso, medidas, marca o comentario.';

// El alta exige al menos un dato de medición además de la fecha (HU4
// esc.6); la modificación es parcial y no lo exige (FR-012 permite
// corregir un campo del registro).
function validarAlMenosUnDato(datos) {
  const conValor = (valor) =>
    valor !== undefined && valor !== null && String(valor).trim() !== '';
  if (
    !conValor(datos.peso) &&
    !conValor(datos.medidas) &&
    !conValor(datos.marca) &&
    !conValor(datos.comentario)
  ) {
    throw new Error(MENSAJE_SIN_DATO);
  }
  return true;
}

const camposDeMedicion = [
  body('peso')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('El peso debe ser un número entre 0 y 999.99 kg.'),
  body('medidas')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Las medidas no pueden superar los 255 caracteres.'),
  body('marca')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('La marca no puede superar los 255 caracteres.'),
  body('comentario')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('El comentario no puede superar los 255 caracteres.'),
];

export const reglasCrearProgreso = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('Debe indicar el cliente al que pertenece el progreso (número entero mayor que cero).'),
  body('objetivo_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('El objetivo indicado debe ser un número entero mayor que cero.'),
  body('fecha')
    .isISO8601()
    .withMessage(MENSAJE_FECHA)
    .custom((_, { req }) => validarAlMenosUnDato(req.body ?? {})),
  ...camposDeMedicion,
];

export const reglasModificarProgreso = [
  body('objetivo_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('El objetivo indicado debe ser un número entero mayor que cero.'),
  body('fecha')
    .optional()
    .isISO8601()
    .withMessage(MENSAJE_FECHA),
  ...camposDeMedicion,
];

export const reglasFiltrarProgresos = [
  query('cliente_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El filtro de cliente debe ser un número entero mayor que cero.'),
  query('objetivo_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El filtro de objetivo debe ser un número entero mayor que cero.'),
  query('desde')
    .optional()
    .isISO8601()
    .withMessage('El filtro desde debe tener el formato AAAA-MM-DD.'),
  query('hasta')
    .optional()
    .isISO8601()
    .withMessage('El filtro hasta debe tener el formato AAAA-MM-DD.'),
];
