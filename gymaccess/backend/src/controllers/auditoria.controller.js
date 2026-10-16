// T008 complemento [Sprint 2] Controlador de auditoría (FR-020).
// Solo consulta; la escritura la realiza el backend en las acciones
// críticas y no expone endpoint (R-22).

import { listarAuditoria } from '../services/auditoria.service.js';
import { responderExito } from '../utils/responses.js';

export async function listar(req, res, next) {
  try {
    const datos = await listarAuditoria({
      fecha: req.query.fecha,
      modulo: req.query.modulo,
      limite: req.query.limite,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}
