// T034/T071 [US3/US7] Controlador de pagos: registro e historial (HU3, HU7);
// US7 agrega `mios` y las consultas de adeudos.

import {
  listarAdeudos,
  listarAdeudosCliente,
  listarPagos,
  listarPagosCliente,
  registrarPago,
} from '../services/pago.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const datos = await registrarPago(req.body, req.usuario);
    return responderExito(res, datos, 'Pago registrado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarPagos({
      cliente_id: req.query.cliente_id,
      desde: req.query.desde,
      hasta: req.query.hasta,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

// ---- US7 ----

export async function listarMios(req, res, next) {
  try {
    const datos = await listarPagosCliente(req.usuario.id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function obtenerAdeudos(req, res, next) {
  try {
    const datos = await listarAdeudos();
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function obtenerAdeudosMios(req, res, next) {
  try {
    const datos = await listarAdeudosCliente(req.usuario.id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}
