// T051 [US5] Rutas de rostros (contracts/api.md).
// Escritura y consulta de metadatos: administrador y recepcionista (FR-016).

import { Router } from 'express';
import { crear, obtener } from '../controllers/rostro.controller.js';
import { reglasRegistrarRostro } from '../validators/rostro.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.post(
  '/',
  autorizar(...rolesPermitidos('POST /api/rostros')),
  reglasRegistrarRostro,
  validar,
  crear
);

router.get(
  '/:cliente_id',
  autorizar(...rolesPermitidos('GET /api/rostros/:cliente_id')),
  obtener
);

export default router;
