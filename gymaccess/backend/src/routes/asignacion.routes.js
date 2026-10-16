// T021 [US2] Rutas de asignaciones de entrenador a cliente.
// Escritura y lectura: administrador y recepcionista (FR-004, HU2).
// No existe DELETE: las vigencias se conservan (FR-025, SC-008).

import { Router } from 'express';
import {
  crear,
  listar,
  cerrar,
} from '../controllers/asignacion.controller.js';
import {
  reglasCrearAsignacion,
  reglasFiltrarAsignaciones,
} from '../validators/asignacion.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get(
  '/',
  autorizar(...rolesPermitidos('GET /api/asignaciones')),
  reglasFiltrarAsignaciones,
  validar,
  listar
);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/asignaciones')),
  reglasCrearAsignacion,
  validar,
  crear
);

router.put(
  '/:id/cerrar',
  autorizar(...rolesPermitidos('PUT /api/asignaciones/:id/cerrar')),
  cerrar
);

export default router;
