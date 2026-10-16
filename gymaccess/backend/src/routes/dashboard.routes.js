// T058 [US6] Rutas del dashboard.
// - `GET /api/dashboard`: exclusivo del administrador (FR-018, HU6 esc.3).
// - `GET /api/dashboard/mio`: exclusivo del entrenador y solo su carga,
//   sin cifras financieras (clarify Q1, respuesta B; HU6 esc.6).
// La ruta `/mio` se declara antes que cualquier `/:id` (precedencia).

import { Router } from 'express';
import {
  obtenerDashboard,
  obtenerMiDashboard,
} from '../controllers/dashboard.controller.js';
import { reglasFiltrarDashboard } from '../validators/dashboard.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get(
  '/',
  autorizar(...rolesPermitidos('GET /api/dashboard')),
  reglasFiltrarDashboard,
  validar,
  obtenerDashboard
);

router.get(
  '/mio',
  autorizar(...rolesPermitidos('GET /api/dashboard/mio')),
  reglasFiltrarDashboard,
  validar,
  obtenerMiDashboard
);

export default router;
