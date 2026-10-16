// T051 [US5] Controlador de rostros (HU5): alta/reemplazo y consulta de
// metadatos; jamás devuelve el descriptor (FR-017).

import { estadoRostro, registrarRostro } from '../services/rostro.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const datos = await registrarRostro(req.body, req.usuario);
    return responderExito(
      res,
      datos,
      'Información facial registrada correctamente.',
      201
    );
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    const datos = await estadoRostro(req.params.cliente_id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}
