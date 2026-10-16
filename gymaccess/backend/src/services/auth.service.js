// T016 [US1] Servicio de autenticación: bcrypt, bloqueo por intentos
// (FR-002, R-07) y JWT con expiración de 8 h (R-06, Q5).

import bcrypt from 'bcrypt';
import * as usuarioModelo from '../models/usuario.model.js';
import { firmarToken } from '../config/jwt.js';
import { AppError, codigosError } from '../utils/errors.js';

export const COSTO_BCRYPT = 10;
const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

const MENSAJE_BLOQUEADO =
  'Cuenta bloqueada temporalmente por intentos fallidos. Intente de nuevo más tarde.';
const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos.';

export async function hashContrasena(plain) {
  return bcrypt.hash(plain, COSTO_BCRYPT);
}

export async function iniciarSesion(email, contrasena) {
  const usuario = await usuarioModelo.findByEmail(email);

  if (!usuario) {
    // Mismo mensaje exista o no la cuenta (FR-002).
    throw new AppError(
      codigosError.CREDENCIALES_INVALIDAS,
      MENSAJE_CREDENCIALES,
      401
    );
  }

  const bloqueoActivo =
    usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date();
  if (bloqueoActivo) {
    throw new AppError(
      codigosError.CUENTA_BLOQUEADA,
      MENSAJE_BLOQUEADO,
      423
    );
  }

  const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
  if (!coincide) {
    const intentos = (usuario.intentos_fallidos || 0) + 1;
    if (intentos >= MAX_INTENTOS) {
      const bloqueadoHasta = new Date(
        Date.now() + MINUTOS_BLOQUEO * 60 * 1000
      );
      await usuarioModelo.actualizarIntentos(usuario.id, intentos, bloqueadoHasta);
      throw new AppError(
        codigosError.CUENTA_BLOQUEADA,
        MENSAJE_BLOQUEADO,
        423
      );
    }
    await usuarioModelo.actualizarIntentos(usuario.id, intentos, null);
    throw new AppError(
      codigosError.CREDENCIALES_INVALIDAS,
      MENSAJE_CREDENCIALES,
      401
    );
  }

  if (usuario.estado === 'deshabilitado') {
    throw new AppError(
      codigosError.CUENTA_DESHABILITADA,
      'La cuenta está deshabilitada. Contacte al administrador.',
      403
    );
  }

  await usuarioModelo.limpiarBloqueo(usuario.id);

  const token = firmarToken({
    sub: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
}
