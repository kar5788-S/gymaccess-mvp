// T042 [US4] Rutas de objetivos de entrenamiento.
// Escritura y lectura: administrador y entrenador de la carga (el
// recepcionista NO accede — clarify Q5; la carga se valida en el
// servicio con 403 FUERA_DE_CARGA). No existe DELETE (FR-013, FR-025).

import { Router } from 'express';
import {
  crear,
  listar,
  modificar,
} from '../controllers/objetivo.controller.js';
import {
  reglasCrearObjetivo,
  reglasModificarObjetivo,
  reglasFiltrarObjetivos,
} from '../validators/objetivo.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get(
  '/',
  autorizar(...rolesPermitidos('GET /api/objetivos')),
  reglasFiltrarObjetivos,
  validar,
  listar
);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/objetivos')),
  reglasCrearObjetivo,
  validar,
  crear
);

router.put(
  '/:id',
  autorizar(...rolesPermitidos('PUT /api/objetivos/:id')),
  reglasModificarObjetivo,
  validar,
  modificar
);

export default router;
