// T025 [US2] Rutas de usuarios: exclusivas del administrador (FR-006).
// No existe DELETE: la gestión usa estado=deshabilitado (FR-014, R-12).

import { Router } from 'express';
import {
  listar,
  obtener,
  crear,
  actualizar,
} from '../controllers/usuario.controller.js';
import {
  reglasCrearUsuario,
  reglasActualizarUsuario,
} from '../validators/usuario.validators.js';
import { validar } from '../validators/validar.js';
import { autenticar } from '../middlewares/authentication.js';
import { autorizar } from '../middlewares/authorization.js';

const router = Router();

router.use(autenticar, autorizar('administrador'));

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', reglasCrearUsuario, validar, crear);
router.put('/:id', reglasActualizarUsuario, validar, actualizar);

export default router;
