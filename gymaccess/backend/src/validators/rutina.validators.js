// T027 [US3] Validaciones de rutinas (data-model.md, FR-009):
// nombre obligatorio; ejercicios con al menos un elemento; cada ejercicio
// con nombre y al menos series/repeticiones enteros mayores que cero o
// instrucciones no vacía. Mensajes claros en español (FR-024).

import { body, query } from 'express-validator';

const ESTADOS_RUTINA = ['activa', 'archivada'];

// Datos de un ejercicio: al menos uno de series/repeticiones (> 0) o
// instrucciones no vacía; series/repeticiones, cuando se envían, son
// enteros mayores que cero (HU3 esc.7: series en cero se rechaza).
const reglasEjercicio = [
  body('ejercicios.*.nombre')
    .trim()
    .notEmpty()
    .withMessage('Cada ejercicio debe tener un nombre.')
    .isLength({ max: 150 })
    .withMessage('El nombre del ejercicio no puede superar los 150 caracteres.'),
  body('ejercicios.*.series')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('Las series deben ser un número entero mayor que cero.'),
  body('ejercicios.*.repeticiones')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('Las repeticiones deben ser un número entero mayor que cero.'),
  body('ejercicios').custom((lista) => {
    if (!Array.isArray(lista)) return true; // isArray se encarga del formato
    for (const [indice, ejercicio] of lista.entries()) {
      const numero = (valor) =>
        valor !== undefined && valor !== null && valor !== '' ? Number(valor) : null;
      const series = numero(ejercicio.series);
      const repeticiones = numero(ejercicio.repeticiones);
      const instrucciones =
        typeof ejercicio.instrucciones === 'string' ? ejercicio.instrucciones.trim() : '';
      const conDatos =
        (series !== null && series > 0) ||
        (repeticiones !== null && repeticiones > 0) ||
        instrucciones !== '';
      if (!conDatos) {
        throw new Error(
          `El ejercicio ${indice + 1} debe indicar series o repeticiones mayores que cero, o instrucciones.`
        );
      }
    }
    return true;
  }),
];

export const reglasCrearRutina = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('Debe indicar el cliente al que pertenece la rutina (número entero mayor que cero).'),
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la rutina es obligatorio.')
    .isLength({ max: 150 })
    .withMessage('El nombre de la rutina no puede superar los 150 caracteres.'),
  body('ejercicios')
    .isArray({ min: 1 })
    .withMessage('La rutina debe incluir al menos un ejercicio.'),
  ...reglasEjercicio,
];

// PUT /api/rutinas/:id — parcial: si se envía `ejercicios`, se reemplaza
// la lista completa (nunca vacía).
export const reglasModificarRutina = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre de la rutina no puede quedar vacío.')
    .isLength({ max: 150 })
    .withMessage('El nombre de la rutina no puede superar los 150 caracteres.'),
  body('ejercicios')
    .optional()
    .isArray({ min: 1 })
    .withMessage('La lista de ejercicios no puede quedar vacía.'),
  ...reglasEjercicio,
];

export const reglasCambiarEstadoRutina = [
  body('estado')
    .isIn(ESTADOS_RUTINA)
    .withMessage('El estado de la rutina solo puede ser "activa" o "archivada".'),
];

export const reglasFiltrarRutinas = [
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
    .isIn(ESTADOS_RUTINA)
    .withMessage('El estado solo puede ser "activa" o "archivada".'),
];
