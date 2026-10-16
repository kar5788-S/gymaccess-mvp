// T020 [US2] Controlador de asignaciones de entrenador a cliente (HU2).

import {
  asignar,
  listarAsignaciones,
  cerrarAsignacion,
} from '../services/asignacion.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const datos = await asignar(req.body, req.usuario);
    return responderExito(
      res,
      datos,
      'Cliente asignado al entrenador correctamente.',
      201
    );
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarAsignaciones({
      cliente_id:
        req.query.cliente_id !== undefined ? Number(req.query.cliente_id) : undefined,
      entrenador_id:
        req.query.entrenador_id !== undefined
          ? Number(req.query.entrenador_id)
          : undefined,
      estado: req.query.estado,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function cerrar(req, res, next) {
  try {
    const datos = await cerrarAsignacion(req.params.id, req.usuario);
    return responderExito(res, datos, 'Asignación cerrada correctamente.');
  } catch (error) {
    return next(error);
  }
}
