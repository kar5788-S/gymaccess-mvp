// T011 [US1] Controlador de perfiles de entrenador (HU1, HU7).

import {
  crearEntrenador,
  listarEntrenadores,
  obtenerEntrenador,
  modificarEntrenador,
  obtenerCargaPropia,
} from '../services/entrenador.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const datos = await crearEntrenador(req.body, req.usuario);
    return responderExito(res, datos, 'Entrenador registrado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarEntrenadores({ estado: req.query.estado });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    const datos = await obtenerEntrenador(req.params.id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function modificar(req, res, next) {
  try {
    const datos = await modificarEntrenador(req.params.id, req.body, req.usuario);
    return responderExito(res, datos, 'Entrenador actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
}

// ---- US7: carga propia del entrenador (HU7, sin importes) ----

export async function obtenerMiCarga(req, res, next) {
  try {
    const datos = await obtenerCargaPropia(req.usuario.id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}
