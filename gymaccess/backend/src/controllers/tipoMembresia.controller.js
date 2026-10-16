// T015 [US1] Controlador de tipos de membresía (US1-1, US1-2, US1-3).

import {
  crearTipoMembresia,
  listarTiposMembresia,
  modificarTipoMembresia,
} from '../services/tipoMembresia.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const datos = await crearTipoMembresia(req.body, req.usuario);
    return responderExito(res, datos, 'Tipo de membresía creado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarTiposMembresia({ estado: req.query.estado });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function modificar(req, res, next) {
  try {
    const datos = await modificarTipoMembresia(req.params.id, req.body, req.usuario);
    return responderExito(res, datos, 'Tipo de membresía actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
}
