// T024/T043 [US2/US4] Controlador de membresías (HU2, HU4).

import {
  asignarMembresia,
  cambiarEstadoMembresia,
  listarMembresias,
  obtenerMembresia,
  renovarMembresia,
} from '../services/membresia.service.js';
import { responderExito } from '../utils/responses.js';

export async function asignar(req, res, next) {
  try {
    const datos = await asignarMembresia(req.body, req.usuario);
    return responderExito(res, datos, 'Membresía asignada correctamente.', 201);
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarMembresias({
      cliente_id: req.query.cliente_id,
      estado: req.query.estado,
      rol: req.usuario.rol,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    const datos = await obtenerMembresia(req.params.id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

// ---- US4: renovación y estados ----

export async function renovar(req, res, next) {
  try {
    const datos = await renovarMembresia(req.params.id, req.usuario);
    return responderExito(res, datos, 'Membresía renovada correctamente.');
  } catch (error) {
    return next(error);
  }
}

export async function cambiarEstado(req, res, next) {
  try {
    const datos = await cambiarEstadoMembresia(
      req.params.id,
      req.body.estado,
      req.usuario
    );
    return responderExito(res, datos, 'Estado de la membresía actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
}
