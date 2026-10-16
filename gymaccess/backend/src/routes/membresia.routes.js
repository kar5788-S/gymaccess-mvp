// T025 [US2] Rutas de membresías (contracts/api.md).
// Escritura: administrador y recepcionista. Consulta: además entrenador
// (sin importes — el servidor omite los campos). US4 agrega /:id/renovar
// y /:id/estado.

import { Router } from 'express';
import {
  asignar,
  cambiarEstado,
  listar,
  obtener,
  renovar,
} from '../controllers/membresia.controller.js';
import {
  reglasAsignarMembresia,
  reglasCambiarEstadoMembresia,
} from '../validators/membresia.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/membresias')),
  reglasAsignarMembresia,
  validar,
  asignar
);

router.get('/', autorizar(...rolesPermitidos('GET /api/membresias')), listar);

// ---- US4: renovación y gestión de estados ----
router.post(
  '/:id/renovar',
  autorizar(...rolesPermitidos('POST /api/membresias/:id/renovar')),
  renovar
);

router.put(
  '/:id/estado',
  autorizar(...rolesPermitidos('PUT /api/membresias/:id/estado')),
  reglasCambiarEstadoMembresia,
  validar,
  cambiarEstado
);

// La ruta /mio (US9) se define en cliente.routes.js con precedencia.
router.get('/:id', autorizar(...rolesPermitidos('GET /api/membresias/:id')), obtener);

export default router;
