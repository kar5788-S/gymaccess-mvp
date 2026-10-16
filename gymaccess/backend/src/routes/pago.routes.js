// T035/T071 [US3/US7] Rutas de pagos (contracts/api.md).
// Escritura y consulta: administrador y recepcionista.
// `/mios` (US7): el cliente consulta solo lo suyo (FR-010).
// No existen DELETE ni PUT: el historial es inmutable (FR-008).

import { Router } from 'express';
import { crear, listar, listarMios } from '../controllers/pago.controller.js';
import { reglasCrearPago } from '../validators/pago.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/pagos')),
  reglasCrearPago,
  validar,
  crear
);

// La ruta /mios (cliente) se declara antes de la genérica por claridad.
router.get('/mios', autorizar(...rolesPermitidos('GET /api/pagos/mios')), listarMios);

router.get('/', autorizar(...rolesPermitidos('GET /api/pagos')), listar);

export default router;
