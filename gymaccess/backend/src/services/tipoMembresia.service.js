// T014 [US1] Servicio de tipos de membresía: crear, listar y modificar
// sin alterar las membresías ya asignadas (FR-002: el precio congelado
// vive en la membresía, research R-09). Toda acción crítica audita (T008).

import * as tipoModelo from '../models/tipoMembresia.model.js';
import { registrar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'membresias';

function tipoPublico(tipo) {
  if (!tipo) return null;
  return {
    id: tipo.id,
    nombre: tipo.nombre,
    descripcion: tipo.descripcion,
    duracion_dias: tipo.duracion_dias,
    precio: Number(tipo.precio),
    estado: tipo.estado,
  };
}

export async function crearTipoMembresia(datos, usuario = null) {
  const existente = await tipoModelo.findByNombre(datos.nombre);
  if (existente) {
    throw new AppError(
      codigosError.DUPLICADO,
      'Ya existe un tipo de membresía con ese nombre. Use otro nombre.',
      409
    );
  }

  const id = await tipoModelo.crear({
    nombre: datos.nombre,
    descripcion: datos.descripcion ?? null,
    duracion_dias: datos.duracion_dias,
    precio: datos.precio,
  });

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'crear_tipo_membresia',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Se creó el tipo de membresía "${datos.nombre}" por ${datos.duracion_dias} días.`,
  });

  return tipoPublico(await tipoModelo.findById(id));
}

export async function listarTiposMembresia({ estado } = {}) {
  const tipos = await tipoModelo.listar({ estado });
  return tipos.map(tipoPublico);
}

export async function modificarTipoMembresia(id, datos, usuario = null) {
  const tipo = await tipoModelo.findById(id);
  if (!tipo) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El tipo de membresía no existe.',
      404
    );
  }

  if (datos.nombre && datos.nombre !== tipo.nombre) {
    const duplicado = await tipoModelo.findByNombre(datos.nombre, id);
    if (duplicado) {
      throw new AppError(
        codigosError.DUPLICADO,
        'Ya existe otro tipo de membresía con ese nombre.',
        409
      );
    }
  }

  const campos = {};
  for (const permitido of ['nombre', 'descripcion', 'duracion_dias', 'precio', 'estado']) {
    if (datos[permitido] !== undefined) campos[permitido] = datos[permitido];
  }

  await tipoModelo.actualizar(id, campos);

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'modificar_tipo_membresia',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Se modificó el tipo de membresía "${tipo.nombre}". Las membresías ya asignadas conservan sus fechas y su precio.`,
  });

  return tipoPublico(await tipoModelo.findById(id));
}
