// T033 [US3] Servicio de pagos: registro con método `efectivo` y
// `membresia_id` obligatorio (FR-007), historial sin DELETE (FR-008) y
// saldo `GREATEST(0, precio − SUM(monto))` sin saldos negativos (FR-009,
// R-19). Toda operación audita (T008).

import * as pagoModelo from '../models/pago.model.js';
import * as membresiaModelo from '../models/membresia.model.js';
import * as clienteModelo from '../models/cliente.model.js';
import { registrar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'pagos';

export function pagoPublico(pago) {
  if (!pago) return null;
  return {
    id: pago.id,
    cliente: { id: pago.cliente_id, nombre: pago.cliente },
    membresia: { id: pago.membresia_id, tipo: pago.tipo_membresia },
    monto: Number(pago.monto),
    fecha_pago: pago.fecha_pago,
    metodo: pago.metodo,
    ...(pago.saldo_pendiente !== undefined
      ? { saldo_pendiente: Number(pago.saldo_pendiente) }
      : {}),
  };
}

export async function registrarPago(datos, usuario = null) {
  const membresia = await pagoModelo.findMembresiaDeCliente(
    datos.membresia_id,
    datos.cliente_id
  );
  if (!membresia) {
    throw new AppError(
      codigosError.MEMBRESIA_REQUERIDA,
      'La membresía indicada no existe o no pertenece al cliente seleccionado.',
      400
    );
  }

  // El método fijado en el servidor es `efectivo` (R-18): si llega otro,
  // la validación lo rechaza antes; aquí se garantiza por redundancia.
  const metodo = datos.metodo && datos.metodo !== 'efectivo'
    ? null
    : 'efectivo';
  if (!metodo) {
    throw new AppError(
      codigosError.VALIDACION,
      'El único método de pago permitido es efectivo.',
      400
    );
  }

  const id = await pagoModelo.crear({
    cliente_id: datos.cliente_id,
    membresia_id: datos.membresia_id,
    monto: datos.monto,
    metodo,
    fecha_pago: datos.fecha_pago,
  });

  // Saldo posterior al pago: nunca negativo (FR-009 / R-19).
  const adeudo = await membresiaModelo.calcularAdeudoMembresia(
    datos.membresia_id
  );

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'registrar_pago',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Pago de $${Number(datos.monto).toFixed(2)} registrado contra la membresía ${datos.membresia_id}. Saldo restante: $${Number(adeudo).toFixed(2)}.`,
  });

  const pago = await pagoModelo.findById(id);
  return pagoPublico({ ...pago, saldo_pendiente: adeudo });
}

export async function listarPagos({ cliente_id, desde, hasta } = {}) {
  const pagos = await pagoModelo.listar({ cliente_id, desde, hasta });
  return pagos.map(pagoPublico);
}

// ---- US7: pagos y adeudos propios / del administrador (T071, FR-010) ----

// Adeudo por membresía: `{ precio, pagado, saldo_pendiente }` solo con
// saldos mayores que cero (FR-009/FR-010, contracts/api.md).
export function adeudoPublico(membresia) {
  const precio = Number(membresia.precio);
  const saldo = Number(membresia.saldo_pendiente);
  return {
    cliente_id: membresia.cliente_id,
    cliente: membresia.cliente,
    membresia_id: membresia.id,
    precio,
    pagado: precio - saldo,
    saldo_pendiente: saldo,
  };
}

// Solo administrador (matriz de permisos).
export async function listarAdeudos() {
  const membresias = await membresiaModelo.listar({});
  return membresias
    .filter((m) => Number(m.saldo_pendiente) > 0)
    .map(adeudoPublico);
}

// Resuelve el cliente desde el usuario de la sesión (no desde el body).
async function clienteDeUsuario(usuarioId) {
  const cliente = await clienteModelo.findByUsuarioId(usuarioId);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'No existe una ficha de cliente asociada a su usuario.',
      404
    );
  }
  return cliente;
}

// `GET /api/pagos/mios`: el cliente solo ve lo suyo (FR-010).
export async function listarPagosCliente(usuarioId) {
  const cliente = await clienteDeUsuario(usuarioId);
  return listarPagos({ cliente_id: cliente.id });
}

// `GET /api/adeudos/mios`: sus propios saldos, nunca los de terceros.
export async function listarAdeudosCliente(usuarioId) {
  const cliente = await clienteDeUsuario(usuarioId);
  const membresias = await membresiaModelo.listar({ cliente_id: cliente.id });
  return membresias
    .filter((m) => Number(m.saldo_pendiente) > 0)
    .map(adeudoPublico);
}
