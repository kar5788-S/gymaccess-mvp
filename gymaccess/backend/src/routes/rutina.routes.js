// T030 [US3] Rutas de rutinas de entrenamiento.
// Lectura: administrador, recepcionista (solo lectura) y entrenador.
// Escritura: administrador y entrenador — la capa de carga (403
// FUERA_DE_CARGA) se valida en el servicio (FR-008, HU3 esc.6).
// No existe DELETE: las rutinas se archivan (FR-010).

import { Router } from 'express';
import {
  crear,
  listar,
  obtener,
  modificar,
  cambiarEstado,
} from '../controllers/rutina.controller.js';
import {
  reglasCrearRutina,
  reglasModificarRutina,
  reglasCambiarEstadoRutina,
  reglasFiltrarRutinas,
} from '../validators/rutina.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get(
  '/',
  autorizar(...rolesPermitidos('GET /api/rutinas')),
  reglasFiltrarRutinas,
  validar,
  listar
);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/rutinas')),
  reglasCrearRutina,
  validar,
  crear
);

router.get(
  '/:id',
  autorizar(...rolesPermitidos('GET /api/rutinas/:id')),
  obtener
);

router.put(
  '/:id',
  autorizar(...rolesPermitidos('PUT /api/rutinas/:id')),
  reglasModificarRutina,
  validar,
  modificar
);

router.put(
  '/:id/estado',
  autorizar(...rolesPermitidos('PUT /api/rutinas/:id/estado')),
  reglasCambiarEstadoRutina,
  validar,
  cambiarEstado
);

export default router;
