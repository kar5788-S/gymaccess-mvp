// T023 [US2] Servicio de usuarios: crear, consultar y modificar sin
// eliminación física (FR-004, FR-005, FR-014, R-12).

import * as usuarioModelo from '../models/usuario.model.js';
import { hashContrasena } from './auth.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MENSAJE_NO_ENCONTRADO = 'El usuario no existe.';
const MENSAJE_DUPLICADO = 'Ya existe un usuario con ese correo.';

function publicar(usuario) {
  const { contrasena_hash, ...resto } = usuario;
  return resto;
}

export async function listarUsuarios() {
  const lista = await usuarioModelo.listar();
  return lista.map(publicar);
}

export async function obtenerUsuario(id) {
  const usuario = await usuarioModelo.findById(id);
  if (!usuario) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      MENSAJE_NO_ENCONTRADO,
      404
    );
  }
  return publicar(usuario);
}

export async function crearUsuario({ nombre, email, contraseña, rol }) {
  const existente = await usuarioModelo.findByEmail(email);
  if (existente) {
    throw new AppError(codigosError.DUPLICADO, MENSAJE_DUPLICADO, 409);
  }

  const contrasena_hash = await hashContrasena(contraseña);
  try {
    const id = await usuarioModelo.crear({
      nombre,
      email,
      contrasena_hash,
      rol,
    });
    return await obtenerUsuario(id);
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      throw new AppError(codigosError.DUPLICADO, MENSAJE_DUPLICADO, 409);
    }
    throw error;
  }
}

export async function actualizarUsuario(id, cambios) {
  const actual = await usuarioModelo.findById(id);
  if (!actual) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      MENSAJE_NO_ENCONTRADO,
      404
    );
  }

  const campos = {};
  if (cambios.nombre !== undefined) campos.nombre = cambios.nombre;
  if (cambios.rol !== undefined) campos.rol = cambios.rol;
  if (cambios.estado !== undefined) campos.estado = cambios.estado;

  if (cambios.email !== undefined) {
    const dupe = await usuarioModelo.findByEmail(cambios.email);
    if (dupe && Number(dupe.id) !== Number(id)) {
      throw new AppError(codigosError.DUPLICADO, MENSAJE_DUPLICADO, 409);
    }
    campos.email = cambios.email;
  }

  if (cambios.contraseña !== undefined) {
    campos.contrasena_hash = await hashContrasena(cambios.contraseña);
  }

  await usuarioModelo.actualizar(id, campos);
  return obtenerUsuario(id);
}
