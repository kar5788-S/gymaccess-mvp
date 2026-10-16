// T033 [US3] Controlador de clientes (escritura; US4/US5 agregan consultas).

import {
  crearCliente,
  modificarCliente,
  listarClientes,
  obtenerCliente,
  obtenerClientePropio,
  obtenerMiMembresia,
  obtenerMiRutina,
  obtenerMiProgreso,
} from '../services/cliente.service.js';
import { responderExito } from '../utils/responses.js';

export async function crear(req, res, next) {
  try {
    const datos = await crearCliente(req.body);
    return responderExito(res, datos, 'Cliente registrado correctamente.', 201);
  } catch (error) {
    return next(error);
  }
}

export async function modificar(req, res, next) {
  try {
    const datos = await modificarCliente(req.params.id, req.body);
    return responderExito(res, datos, 'Cliente actualizado correctamente.');
  } catch (error) {
    return next(error);
  }
}

// ---- US4: consultas ----

export async function listar(req, res, next) {
  try {
    const datos = await listarClientes({
      q: req.query.q,
      rol: req.usuario.rol,
    });
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    const datos = await obtenerCliente(req.params.id, req.usuario.rol);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

// ---- US5: información propia ----

export async function obtenerPropio(req, res, next) {
  try {
    const datos = await obtenerClientePropio(req.usuario.id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

// ---- US9: membresía propia (FR-024) ----

export async function obtenerMembresiaPropia(req, res, next) {
  try {
    const datos = await obtenerMiMembresia(req.usuario.id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}

// ---- US5: rutina y progreso propios (FR-014, FR-015) ----

export async function obtenerRutinaPropia(req, res, next) {
  try {
    const datos = await obtenerMiRutina(req.usuario.id);
    // Estado vacío: el mensaje claro va dentro de `datos` (contrato) y
    // también en la cabecera del envolvente.
    return responderExito(res, datos, datos.mensaje ?? '');
  } catch (error) {
    return next(error);
  }
}

export async function obtenerProgresoPropio(req, res, next) {
  try {
    const datos = await obtenerMiProgreso(req.usuario.id);
    return responderExito(res, datos);
  } catch (error) {
    return next(error);
  }
}
