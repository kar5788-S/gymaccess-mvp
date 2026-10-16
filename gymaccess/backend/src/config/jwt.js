// Firma y verificación de JWT de sesión (research.md R-06).
// Expiración: 8 horas (clarificación Q5 del spec).

import jwt from 'jsonwebtoken';

export const EXPIRACION_TOKEN = '8h';

function secreto() {
  const valor = process.env.JWT_SECRET;
  if (!valor) {
    if (process.env.NODE_ENV === 'production') {
      // En producción no se arranca con secreto por defecto (Principio V).
      throw new Error('JWT_SECRET no está configurado');
    }
    return 'dev-secret-no-usar-en-produccion';
  }
  return valor;
}

export function firmarToken(payload) {
  return jwt.sign(payload, secreto(), { expiresIn: EXPIRACION_TOKEN });
}

export function verificarToken(token) {
  return jwt.verify(token, secreto());
}
