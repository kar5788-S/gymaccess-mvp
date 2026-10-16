// T042 [US4] Rutas de progresos de clientes.
// Escritura y lectura: administrador y entrenador de la carga (el cliente
// nunca escribe — clarify Q4; el recepcionista no accede). El historial
// se consulta ordenado por fecha con rango desde/hasta. No existe DELETE
// (FR-012, FR-025).

import { Router } from 'express';
import {
  crear,
  listar,
  modificar,
} from '../controllers/progreso.controller.js';
import {
  reglasCrearProgreso,
  reglasModificarProgreso,
  reglasFiltrarProgresos,
} from '../validators/progreso.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get(
  '/',
  autorizar(...rolesPermitidos('GET /api/progresos')),
  reglasFiltrarProgresos,
  validar,
  listar
);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/progresos')),
  reglasCrearProgreso,
  validar,
  crear
);

router.put(
  '/:id',
  autorizar(...rolesPermitidos('PUT /api/progresos/:id')),
  reglasModificarProgreso,
  validar,
  modificar
);

export default router;
