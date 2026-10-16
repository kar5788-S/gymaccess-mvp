// Envolvente JSON de respuestas (contracts/api.md).

import { codigosError } from './errors.js';

export function responderExito(res, datos = null, mensaje = '', status = 200) {
  return res.status(status).json({ exito: true, datos, mensaje });
}

export function responderError(res, status, codigo, mensaje, detalles) {
  const error = { codigo, mensaje };
  if (detalles) error.detalles = detalles;
  return res.status(status).json({ exito: false, error });
}

// Sprint 2: conflicto con una regla de negocio (409) con mensaje claro,
// por ejemplo MEMBRESIA_ACTIVA_EXISTENTE o ADEUDO_PENDIENTE (contracts/api.md).
// Sprint 3: los conflictos ENTRENADOR_NO_VALIDO, USUARIO_YA_ENTRENADOR,
// CLIENTE_SIN_ENTRENADOR y ESTADO_NO_PERMITE viajan igual por aquí, y la
// denegación de carga FUERA_DE_CARGA (403) sale del manejador central de
// errores al lanzar AppError — ninguna respuesta incluye detalle interno.
export function responderConflicto(res, codigo, mensaje, detalles) {
  return responderError(res, 409, codigo, mensaje, detalles);
}

// Sprint 3: no encontrado heredado (404) con mensaje claro, por ejemplo
// un entrenador o un cliente inexistente.
export function responderNoEncontrado(res, mensaje, detalles) {
  return responderError(res, 404, codigosError.NO_ENCONTRADO, mensaje, detalles);
}
