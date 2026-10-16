// Autorización por rol: valida los permisos en el servidor (FR-003, FR-006).
// Ocultar opciones en la interfaz NO es seguridad (Principio V).
//
// T007 [Sprint 2] Matriz de permisos única y centralizada, tomada de
// `contracts/api.md`. Cada ruta nueva usa `autorizar(...rolesPermitidos('…'))`
// para que la matriz sea la única fuente de verdad; cualquier combinación
// fuera de la matriz responde 403 (FR-016).

import { AppError, codigosError } from '../utils/errors.js';

export const MATRIZ_PERMISOS = Object.freeze({
  // Sprint 1
  'POST /api/auth/login': ['administrador', 'recepcionista', 'entrenador', 'cliente'],
  'POST /api/usuarios': ['administrador'],
  'GET /api/usuarios': ['administrador'],
  'PUT /api/usuarios/:id': ['administrador'],
  'POST /api/clientes': ['administrador', 'recepcionista'],
  'GET /api/clientes': ['administrador', 'recepcionista', 'entrenador'],
  'PUT /api/clientes/:id': ['administrador', 'recepcionista'],
  'GET /api/clientes/:id': ['administrador', 'recepcionista'],
  'GET /api/clientes/mio': ['cliente'],
  // Sprint 2 — US1: tipos de membresía
  'GET /api/tipos-membresia': ['administrador', 'recepcionista'],
  'POST /api/tipos-membresia': ['administrador'],
  'PUT /api/tipos-membresia/:id': ['administrador'],
  // Sprint 2 — US2/US4: membresías
  'POST /api/membresias': ['administrador', 'recepcionista'],
  'GET /api/membresias': ['administrador', 'recepcionista', 'entrenador'],
  'GET /api/membresias/:id': ['administrador', 'recepcionista'],
  'POST /api/membresias/:id/renovar': ['administrador', 'recepcionista'],
  'PUT /api/membresias/:id/estado': ['administrador'],
  'GET /api/clientes/mio/membresia': ['cliente'],
  // Sprint 2 — US3/US7: pagos y adeudos
  'POST /api/pagos': ['administrador', 'recepcionista'],
  'GET /api/pagos': ['administrador', 'recepcionista'],
  'GET /api/pagos/mios': ['cliente'],
  'GET /api/adeudos': ['administrador'],
  'GET /api/adeudos/mios': ['cliente'],
  // Sprint 2 — US5: información facial
  'POST /api/rostros': ['administrador', 'recepcionista'],
  'GET /api/rostros/:cliente_id': ['administrador', 'recepcionista'],
  // Sprint 2 — US6/US8: control de acceso
  'POST /api/accesos/intento': ['administrador', 'recepcionista'],
  'GET /api/accesos': ['administrador', 'recepcionista', 'entrenador'],
  'GET /api/accesos/mios': ['cliente'],
  // Sprint 2 — auditoría
  'GET /api/auditoria': ['administrador'],
  // Sprint 3 — US1: perfiles de entrenador (solo administrador escribe;
  // el recepcionista solo consulta, con la carga sumada en US7)
  'GET /api/entrenadores': ['administrador', 'recepcionista'],
  'GET /api/entrenadores/:id': ['administrador', 'recepcionista'],
  'POST /api/entrenadores': ['administrador'],
  'PUT /api/entrenadores/:id': ['administrador'],
  'GET /api/entrenadores/mio/clientes': ['entrenador'],
  // Sprint 3 — US2: asignaciones de entrenador a cliente
  'POST /api/asignaciones': ['administrador', 'recepcionista'],
  'GET /api/asignaciones': ['administrador', 'recepcionista'],
  'PUT /api/asignaciones/:id/cerrar': ['administrador', 'recepcionista'],
  // Sprint 3 — US3: rutinas (el recepcionista solo consulta)
  'POST /api/rutinas': ['administrador', 'entrenador'],
  'GET /api/rutinas': ['administrador', 'recepcionista', 'entrenador'],
  'GET /api/rutinas/:id': ['administrador', 'recepcionista', 'entrenador'],
  'PUT /api/rutinas/:id': ['administrador', 'entrenador'],
  'PUT /api/rutinas/:id/estado': ['administrador', 'entrenador'],
  // Sprint 3 — US4: objetivos y progresos (el recepcionista no accede,
  // clarify 2026-10-15 Q5)
  'POST /api/objetivos': ['administrador', 'entrenador'],
  'GET /api/objetivos': ['administrador', 'entrenador'],
  'PUT /api/objetivos/:id': ['administrador', 'entrenador'],
  'POST /api/progresos': ['administrador', 'entrenador'],
  'GET /api/progresos': ['administrador', 'entrenador'],
  'PUT /api/progresos/:id': ['administrador', 'entrenador'],
  // Sprint 3 — US5: consultas propias del cliente (solo lectura)
  'GET /api/clientes/mio/rutina': ['cliente'],
  'GET /api/clientes/mio/progreso': ['cliente'],
  // Sprint 3 — US6: dashboard por rol (clarify Q1)
  'GET /api/dashboard': ['administrador'],
  'GET /api/dashboard/mio': ['entrenador'],
});

// Devuelve los roles permitidos para una clave "MÉTODO /ruta" de la matriz.
export function rolesPermitidos(claveEndpoint) {
  const roles = MATRIZ_PERMISOS[claveEndpoint];
  if (!roles) {
    throw new Error(`Endpoint no registrado en la matriz de permisos: ${claveEndpoint}`);
  }
  return roles;
}

export function autorizar(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(
        new AppError(
          codigosError.NO_AUTENTICADO,
          'Debe iniciar sesión para acceder.',
          401
        )
      );
    }
    if (!roles.includes(req.usuario.rol)) {
      return next(
        new AppError(
          codigosError.SIN_PERMISO,
          'No tiene permisos para realizar esta operación.',
          403
        )
      );
    }
    return next();
  };
}
