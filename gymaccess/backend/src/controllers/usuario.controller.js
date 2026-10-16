// T025 [US2] Controlador de usuarios (solo rol administrador).

import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
} from '../services/usuario.service.js';
import { responderExito } from '../utils/responses.js';

export async function listar(req, res, next) {
  try {
    return responderExito(res, await listarUsuarios());
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return responderExito(res, await obtenerUsuario(req.params.id));
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    const datos = await crearUsuario(req.body);
    return responderExito(res, datos, 'Usuario creado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
}

export async function actualizar(req, res, next) {
  try {
    const datos = await actualizarUsuario(req.params.id, req.body);
    return responderExito(res, datos, 'Usuario actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
}
