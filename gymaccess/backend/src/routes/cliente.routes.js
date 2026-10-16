// T033 [US3] Rutas de clientes.
// Escritura: administrador y recepcionista (US3).
// US4 agrega las rutas de consulta; US5 agrega /mio (antes de /:id).

import { Router } from 'express';
import {
  crear,
  modificar,
  listar,
  obtener,
  obtenerMembresiaPropia,
  obtenerPropio,
  obtenerRutinaPropia,
  obtenerProgresoPropio,
} from '../controllers/cliente.controller.js';
import {
  reglasCrearCliente,
  reglasModificarCliente,
} from '../validators/cliente.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.post(
  '/',
  autorizar('administrador', 'recepcionista'),
  reglasCrearCliente,
  validar,
  crear
);

// US4: consultas.
router.get('/', autorizar('administrador', 'recepcionista', 'entrenador'), listar);

// US5: la ruta /mio debe resolverse antes que /:id (contrato, precedencia).
// US5: rutina y progreso propios — solo rol cliente, exclusivos de la sesión.
router.get(
  '/mio/rutina',
  autorizar(...rolesPermitidos('GET /api/clientes/mio/rutina')),
  obtenerRutinaPropia
);
router.get(
  '/mio/progreso',
  autorizar(...rolesPermitidos('GET /api/clientes/mio/progreso')),
  obtenerProgresoPropio
);
// US9: /mio/membresia (FR-024) en solo lectura, exclusiva del cliente.
router.get(
  '/mio/membresia',
  autorizar(...rolesPermitidos('GET /api/clientes/mio/membresia')),
  obtenerMembresiaPropia
);
router.get('/mio', autorizar('cliente'), obtenerPropio);

router.get('/:id', autorizar('administrador', 'recepcionista', 'entrenador'), obtener);

router.put(
  '/:id',
  autorizar('administrador', 'recepcionista'),
  reglasModificarCliente,
  validar,
  modificar
);

export default router;
