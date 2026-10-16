// T008 complemento [Sprint 2] Rutas de auditoría.
// Solo administrador (matriz de contracts/api.md).

import { Router } from 'express';
import { listar } from '../controllers/auditoria.controller.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar, rolesPermitidos } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar);

router.get('/', autorizar(...rolesPermitidos('GET /api/auditoria')), listar);

export default router;
