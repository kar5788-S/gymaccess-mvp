// T065/T076 [US6/US8] Rutas de accesos (contracts/api.md).
// Intento: administrador y recepcionista (terminal del punto de acceso).
// Consulta: además entrenador (asistencia); /mios: cliente.
// No existen endpoints de borrado (FR-015).

import { Router } from 'express';
import { intentar, listar, listarMios } from '../controllers/acceso.controller.js';
import { reglasIntentoAcceso } from '../validators/acceso.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.post(
  '/intento',
  autorizar(...rolesPermitidos('POST /api/accesos/intento')),
  reglasIntentoAcceso,
  validar,
  intentar
);

// La ruta /mios debe resolverse antes que cualquier otra (contrato).
router.get('/mios', autorizar(...rolesPermitidos('GET /api/accesos/mios')), listarMios);

router.get('/', autorizar(...rolesPermitidos('GET /api/accesos')), listar);

export default router;
