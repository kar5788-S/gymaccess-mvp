// T057 [US6] Controlador del dashboard (HU6).
// `periodo` por defecto `mes` cuando no se envía; el validador rechaza
// valores desconocidos con 400 VALIDACION.

import {
  obtenerIndicadoresGenerales,
  obtenerPanelPropio,
} from '../services/dashboard.service.js';
import { responderExito } from '../utils/responses.js';

export async function obtenerDashboard(req, res, next) {
  try {
    const datos = await obtenerIndicadoresGenerales(req.query.periodo ?? 'mes');
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function obtenerMiDashboard(req, res, next) {
  try {
    const datos = await obtenerPanelPropio(
      req.query.periodo ?? 'mes',
      req.usuario
    );
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}
