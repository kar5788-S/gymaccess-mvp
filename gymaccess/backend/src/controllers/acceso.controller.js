// T065/T076 [US6/US8] Controlador de accesos: intento del terminal (HU6) y
// consultas de historial (HU8).

import {
  intentarAcceso,
  listarAccesos,
  listarAccesosCliente,
} from '../services/acceso.service.js';
import { responderExito } from '../utils/responses.js';

export async function intentar(req, res, next) {
  try {
    // El servicio registra el intento ANTES de construir la respuesta
    // (FR-015) y devuelve datos + mensaje claro para la terminal.
    const { datos, mensaje } = await intentarAcceso(
      req.body.descriptor ?? null,
      req.usuario
    );
    return responderExito(res, datos, mensaje, 200);
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarAccesos({
      fecha: req.query.fecha,
      resultado: req.query.resultado,
      cliente_id: req.query.cliente_id,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function listarMios(req, res, next) {
  try {
    const datos = await listarAccesosCliente(req.usuario.id, {
      fecha: req.query.fecha,
      resultado: req.query.resultado,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}
