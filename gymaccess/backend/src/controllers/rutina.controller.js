// T029 [US3] Controlador de rutinas de entrenamiento (HU3).

import {
  crearRutina,
  listarRutinas,
  obtenerRutina,
  modificarRutina,
  cambiarEstadoRutina,
} from '../services/rutina.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const { datos, mensaje } = await crearRutina(req.body, req.usuario);
    return responderExito(res, datos, mensaje, 201);
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarRutinas(
      {
        cliente_id:
          req.query.cliente_id !== undefined ? Number(req.query.cliente_id) : undefined,
        entrenador_id:
          req.query.entrenador_id !== undefined
            ? Number(req.query.entrenador_id)
            : undefined,
        estado: req.query.estado,
      },
      req.usuario
    );
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    const datos = await obtenerRutina(req.params.id, req.usuario);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function modificar(req, res, next) {
  try {
    const datos = await modificarRutina(req.params.id, req.body, req.usuario);
    return responderExito(res, datos, 'Rutina actualizada correctamente.');
  } catch (error) {
    return next(error);
  }
}

export async function cambiarEstado(req, res, next) {
  try {
    const datos = await cambiarEstadoRutina(
      req.params.id,
      req.body.estado,
      req.usuario
    );
    return responderExito(res, datos, 'Estado de la rutina actualizado.');
  } catch (error) {
    return next(error);
  }
}
