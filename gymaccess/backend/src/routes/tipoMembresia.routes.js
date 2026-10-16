// T016 [US1] Rutas de tipos de membresía.
// Lectura: administrador y recepcionista (HU2 necesita consultar los planes).
// Escritura: solo administrador (FR-016).

import { Router } from 'express';
import {
  crear,
  listar,
  modificar,
} from '../controllers/tipoMembresia.controller.js';
import {
  reglasCrearTipoMembresia,
  reglasModificarTipoMembresia,
} from '../validators/tipoMembresia.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get(
  '/',
  autorizar(...rolesPermitidos('GET /api/tipos-membresia')),
  listar
);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/tipos-membresia')),
  reglasCrearTipoMembresia,
  validar,
  crear
);

router.put(
  '/:id',
  autorizar(...rolesPermitidos('PUT /api/tipos-membresia/:id')),
  reglasModificarTipoMembresia,
  validar,
  modificar
);

export default router;
