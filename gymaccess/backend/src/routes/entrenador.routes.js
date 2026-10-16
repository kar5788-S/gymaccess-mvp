// T012 [US1] Rutas de perfiles de entrenador.
// Escritura: solo administrador (HU1 esc.4, FR-003).
// Lectura: administrador y recepcionista (HU7 consulta el personal).
// US7 agrega /mio/clientes (solo entrenador) DEBIDO antes que /:id y el
// filtro ?estado= del listado.

import { Router } from 'express';
import {
  crear,
  listar,
  obtener,
  modificar,
  obtenerMiCarga,
} from '../controllers/entrenador.controller.js';
import {
  reglasCrearEntrenador,
  reglasModificarEntrenador,
  reglasFiltrarEntrenadores,
} from '../validators/entrenador.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get(
  '/',
  autorizar(...rolesPermitidos('GET /api/entrenadores')),
  reglasFiltrarEntrenadores,
  validar,
  listar
);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/entrenadores')),
  reglasCrearEntrenador,
  validar,
  crear
);

// US7: carga propia — DEBE resolverse antes que /:id (precedencia).
router.get(
  '/mio/clientes',
  autorizar(...rolesPermitidos('GET /api/entrenadores/mio/clientes')),
  obtenerMiCarga
);

router.get(
  '/:id',
  autorizar(...rolesPermitidos('GET /api/entrenadores/:id')),
  obtener
);

router.put(
  '/:id',
  autorizar(...rolesPermitidos('PUT /api/entrenadores/:id')),
  reglasModificarEntrenador,
  validar,
  modificar
);

export default router;
