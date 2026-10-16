// T041 [US4] Controlador de objetivos de entrenamiento (HU4).

import {
  crearObjetivo,
  listarObjetivos,
  modificarObjetivo,
} from '../services/objetivo.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const datos = await crearObjetivo(req.body, req.usuario);
    return responderExito(res, datos, 'Objetivo registrado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarObjetivos(
      {
        cliente_id:
          req.query.cliente_id !== undefined ? Number(req.query.cliente_id) : undefined,
        estado: req.query.estado,
      },
      req.usuario
    );
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function modificar(req, res, next) {
  try {
    const datos = await modificarObjetivo(req.params.id, req.body, req.usuario);
    return responderExito(res, datos, 'Objetivo actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
}
