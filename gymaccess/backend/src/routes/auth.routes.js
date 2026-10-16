// T018 [US1] Rutas de autenticación.

import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';
import { reglasLogin } from '../validators/auth.validators.js';
import { validar } from '../validators/validar.js';

const router = Router();

router.post('/login', reglasLogin, validar, login);

export default router;
