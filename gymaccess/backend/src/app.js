// Aplicación Express: monta las rutas bajo /api y centraliza errores.

import cors from 'cors';
import express from 'express';
import authRutas from './routes/auth.routes.js';
import usuarioRutas from './routes/usuario.routes.js';
import clienteRutas from './routes/cliente.routes.js';
import tipoMembresiaRutas from './routes/tipoMembresia.routes.js';
import membresiaRutas from './routes/membresia.routes.js';
import pagoRutas from './routes/pago.routes.js';
import adeudoRutas from './routes/adeudo.routes.js';
import rostroRutas from './routes/rostro.routes.js';
import accesoRutas from './routes/acceso.routes.js';
import auditoriaRutas from './routes/auditoria.routes.js';
import entrenadorRutas from './routes/entrenador.routes.js';
import asignacionRutas from './routes/asignacion.routes.js';
import rutinaRutas from './routes/rutina.routes.js';
import objetivoRutas from './routes/objetivo.routes.js';
import progresoRutas from './routes/progreso.routes.js';
import dashboardRutas from './routes/dashboard.routes.js';
import { errorHandler } from './middlewares/error-handler.js';


const app = express();

app.use(express.json());

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/api/auth', authRutas);
app.use('/api/usuarios', usuarioRutas);
app.use('/api/clientes', clienteRutas);
// Sprint 2 (US1): tipos de membresía; auditoría (consulta del administrador).
app.use('/api/tipos-membresia', tipoMembresiaRutas);
app.use('/api/membresias', membresiaRutas);
app.use('/api/pagos', pagoRutas);
app.use('/api/adeudos', adeudoRutas);
app.use('/api/rostros', rostroRutas);
app.use('/api/accesos', accesoRutas);
app.use('/api/auditoria', auditoriaRutas);
// Sprint 3 (US1): perfiles de entrenador (/mio/clientes llega en US7).
app.use('/api/entrenadores', entrenadorRutas);
// Sprint 3 (US2): asignaciones de entrenador a cliente.
app.use('/api/asignaciones', asignacionRutas);
// Sprint 3 (US3): rutinas de entrenamiento con sus ejercicios.
app.use('/api/rutinas', rutinaRutas);
// Sprint 3 (US4): objetivos y progresos del seguimiento.
app.use('/api/objetivos', objetivoRutas);
app.use('/api/progresos', progresoRutas);
// Sprint 3 (US6): dashboard administrativo y panel del entrenador.
app.use('/api/dashboard', dashboardRutas);

// 404 con envolvente estándar.
app.use((req, res) => {
  res.status(404).json({
    exito: false,
    error: { codigo: 'NO_ENCONTRADO', mensaje: 'Recurso no encontrado.' },
  });
});

app.use(errorHandler);

export default app;
