// T050 [US5] Servicio de información facial (FR-011, FR-017, FR-022).
// Registra o reemplaza el descriptor en la misma fila, nunca lo expone y
// lo elimina cuando el cliente pasa a inactivo (R-27).

import * as rostroModelo from '../models/rostro.model.js';
import * as clienteModelo from '../models/cliente.model.js';
import { DIMENSIONES_DESCRIPTOR, esDescriptorValido, serializarDescriptor } from '../utils/descriptor.js';
import { registrar as auditar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'rostros';

// Forma pública: NUNCA incluye `descriptor_facial` (FR-017).
export function rostroPublico(rostro, clienteId) {
  if (!rostro) return null;
  return {
    cliente_id: rostro.cliente_id ?? clienteId,
    fecha_registro: rostro.fecha_registro,
    estado: rostro.estado,
  };
}

export async function registrarRostro(datos, usuario = null) {
  const cliente = await clienteModelo.findById(datos.cliente_id);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El cliente no existe. Regístrelo antes de capturar su rostro.',
      404
    );
  }
  if (cliente.estado === 'inactivo') {
    throw new AppError(
      codigosError.CLIENTE_NO_ACTIVO,
      'El cliente está dado de baja. Reactívelo antes de registrar su información facial.',
      409
    );
  }

  if (!esDescriptorValido(datos.descriptor)) {
    throw new AppError(
      codigosError.DESCRIPTOR_INVALIDO,
      `El descriptor facial debe tener exactamente ${DIMENSIONES_DESCRIPTOR} valores numéricos.`,
      400
    );
  }

  // 128 float32 little-endian → 512 bytes exactos (R-15).
  const buffer = serializarDescriptor(datos.descriptor);
  const { reemplazado } = await rostroModelo.guardar({
    cliente_id: cliente.id,
    descriptor_facial: buffer,
  });

  await auditar({
    usuarioId: usuario?.id ?? null,
    accion: reemplazado ? 'reemplazar_rostro' : 'registrar_rostro',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Información facial ${reemplazado ? 'reemplazada' : 'registrada'} para el cliente "${cliente.nombre_completo}".`,
  });

  const rostro = await rostroModelo.findByClienteId(cliente.id);
  return rostroPublico(rostro, cliente.id);
}

// Consulta de metadatos: `registrado: false` no es error (contracts/api.md).
export async function estadoRostro(clienteId) {
  const cliente = await clienteModelo.findById(clienteId);
  if (!cliente) {
    throw new AppError(codigosError.NO_ENCONTRADO, 'El cliente no existe.', 404);
  }

  const rostro = await rostroModelo.findByClienteId(clienteId);
  return {
    cliente_id: Number(clienteId),
    registrado: Boolean(rostro),
    fecha_registro: rostro?.fecha_registro ?? null,
    estado: rostro?.estado ?? null,
  };
}

// Excepción única a la prohibición de borrado (FR-022 / R-27).
export async function eliminarRostroPorCliente(clienteId) {
  return rostroModelo.eliminarPorCliente(clienteId);
}

// Descriptores activos para el cotejo del servidor (US6; no sale de aquí).
export async function listarDescriptores() {
  return rostroModelo.listarConDescriptor();
}
