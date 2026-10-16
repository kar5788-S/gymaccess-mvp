// T040 [US4] Servicio de progresos de clientes (HU4, FR-012, FR-025).
// - El entrenador solo registra y consulta progresos de su carga (403
//   FUERA_DE_CARGA; clarify Q4: el cliente nunca escribe los propios).
// - El historial se ordena por fecha ascendente con rango desde/hasta.
// - Solo se modifican registros, jamás se eliminan (R-32, FR-025).

import * as progresoModelo from '../models/progreso.model.js';
import * as clienteModelo from '../models/cliente.model.js';
import * as objetivoModelo from '../models/objetivo.model.js';
import {
  perfilDeEntrenador,
  exigirCargaDeCliente,
  clientesDeCarga,
} from './asignacion.service.js';
import { registrar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'progresos';
const MENSAJE_PROGRESO_NO_EXISTE = 'El progreso indicado no existe.';
const CAMPOS_MODIFICABLES = [
  'objetivo_id',
  'fecha',
  'peso',
  'medidas',
  'marca',
  'comentario',
];

// Normaliza fechas a 'AAAA-MM-DD' (mysql2 devuelve DATE como Date y el
// contrato exige fechas, no marcas de tiempo ISO).
function aFechaISO(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string') return valor.slice(0, 10);
  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  return valor;
}

// Forma pública del contrato: se reutiliza en las consultas propias del
// cliente (US5, GET /api/clientes/mio/progreso).
export function progresoPublico(progreso) {
  if (!progreso) return null;
  return {
    id: progreso.id,
    cliente_id: progreso.cliente_id,
    cliente: progreso.cliente ?? null,
    objetivo_id: progreso.objetivo_id,
    objetivo: progreso.objetivo ?? null,
    fecha: aFechaISO(progreso.fecha),
    peso: progreso.peso,
    medidas: progreso.medidas,
    marca: progreso.marca,
    comentario: progreso.comentario,
  };
}

// El objetivo, cuando se indica, debe existir y pertenecer al mismo cliente.
async function validarObjetivoDeCliente(objetivo_id, cliente_id) {
  if (objetivo_id === undefined || objetivo_id === null) return;
  const objetivo = await objetivoModelo.findById(objetivo_id);
  if (!objetivo || objetivo.cliente_id !== Number(cliente_id)) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El objetivo indicado no existe para ese cliente.',
      404
    );
  }
}

export async function registrarProgreso(datos, usuario = null) {
  const cliente = await clienteModelo.findById(datos.cliente_id);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El cliente indicado no existe.',
      404
    );
  }
  await exigirCargaDeCliente(usuario, datos.cliente_id);
  await validarObjetivoDeCliente(datos.objetivo_id, datos.cliente_id);

  const id = await progresoModelo.crear({
    cliente_id: datos.cliente_id,
    objetivo_id: datos.objetivo_id ?? null,
    fecha: datos.fecha,
    peso: datos.peso,
    medidas: datos.medidas,
    marca: datos.marca,
    comentario: datos.comentario,
  });

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'registrar_progreso',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Progreso #${id} del cliente ${datos.cliente_id} en ${datos.fecha}`,
  });

  return progresoPublico(await progresoModelo.findById(id));
}

export async function listarProgresos(filtros = {}, usuario = null) {
  const perfil = await perfilDeEntrenador(usuario);

  if (!perfil) {
    const filas = await progresoModelo.listar(filtros);
    return filas.map(progresoPublico);
  }

  if (filtros.cliente_id !== undefined) {
    // Filtrar por un cliente ajeno no revela información (SC-004).
    await exigirCargaDeCliente(usuario, filtros.cliente_id);
    const filas = await progresoModelo.listar(filtros);
    return filas.map(progresoPublico);
  }

  const cliente_ids = await clientesDeCarga(perfil);
  if (cliente_ids.length === 0) return [];

  const filas = await progresoModelo.listar({ ...filtros, cliente_ids });
  return filas.map(progresoPublico);
}

export async function modificarProgreso(id, campos, usuario = null) {
  const existente = await progresoModelo.findById(id);
  if (!existente) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_PROGRESO_NO_EXISTE, 404);
  }
  await exigirCargaDeCliente(usuario, existente.cliente_id);

  const cambios = {};
  for (const campo of CAMPOS_MODIFICABLES) {
    if (campos[campo] !== undefined) cambios[campo] = campos[campo];
  }

  if (cambios.objetivo_id !== undefined && cambios.objetivo_id !== null) {
    await validarObjetivoDeCliente(cambios.objetivo_id, existente.cliente_id);
  }

  if (Object.keys(cambios).length > 0) {
    // Corrección del registro: actualización auditada, sin eliminación.
    await progresoModelo.actualizar(id, cambios);
    await registrar({
      usuarioId: usuario?.id ?? null,
      accion: 'modificar_progreso',
      modulo: MODULO,
      resultado: 'exitoso',
      descripcion: `Progreso #${id}: campos ${Object.keys(cambios).join(', ')}`,
    });
  }

  return progresoPublico(await progresoModelo.findById(id));
}
