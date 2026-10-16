// T041 [US4] Controlador de progresos de clientes (HU4).

import {
  registrarProgreso,
  listarProgresos,
  modificarProgreso,
} from '../services/progreso.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const datos = await registrarProgreso(req.body, req.usuario);
    return responderExito(res, datos, 'Progreso registrado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const datos = await listarProgresos(
      {
        cliente_id:
          req.query.cliente_id !== undefined ? Number(req.query.cliente_id) : undefined,
        objetivo_id:
          req.query.objetivo_id !== undefined
            ? Number(req.query.objetivo_id)
            : undefined,
        desde: req.query.desde,
        hasta: req.query.hasta,
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
    const datos = await modificarProgreso(req.params.id, req.body, req.usuario);
    return responderExito(res, datos, 'Progreso actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
}
