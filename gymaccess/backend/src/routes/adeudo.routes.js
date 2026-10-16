// T071 [US7] Rutas de adeudos (contracts/api.md).
// `GET /api/adeudos`: solo administrador (control financiero).
// `GET /api/adeudos/mios`: el cliente consulta solo sus saldos (FR-010).
// No existen escrituras ni borrados: los saldos se derivan de pagos (FR-008).

import { Router } from 'express';
import {
  obtenerAdeudos,
  obtenerAdeudosMios,
} from '../controllers/pago.controller.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get('/', autorizar(...rolesPermitidos('GET /api/adeudos')), obtenerAdeudos);
router.get(
  '/mios',
  autorizar(...rolesPermitidos('GET /api/adeudos/mios')),
  obtenerAdeudosMios
);

export default router;
