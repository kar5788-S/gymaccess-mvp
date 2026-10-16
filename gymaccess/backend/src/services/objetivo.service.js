// T039 [US4] Servicio de objetivos de entrenamiento (HU4, FR-011, FR-013).
// - El entrenador solo trabaja con clientes de su carga (403
//   FUERA_DE_CARGA; clarify 2026-10-15 Q5: el recepcionista no accede).
// - Cumplir un objetivo solo cambia `estado`: los progresos ya
//   registrados no se alteran ni desaparecen (R-32, FR-013).
// - Sin borrado físico: modificar es actualización auditada (FR-025).

import * as objetivoModelo from '../models/objetivo.model.js';
import * as clienteModelo from '../models/cliente.model.js';
import {
  perfilDeEntrenador,
  exigirCargaDeCliente,
  clientesDeCarga,
} from './asignacion.service.js';
import { registrar } from './auditoria.service.js';
import { AppError, codigosError } from '../utils/errors.js';

const MODULO = 'objetivos';
const MENSAJE_OBJETIVO_NO_EXISTE = 'El objetivo indicado no existe.';
const CAMPOS_MODIFICABLES = ['descripcion', 'meta', 'fecha_limite', 'estado'];

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
export function objetivoPublico(objetivo) {
  if (!objetivo) return null;
  return {
    id: objetivo.id,
    cliente_id: objetivo.cliente_id,
    cliente: objetivo.cliente ?? null,
    descripcion: objetivo.descripcion,
    meta: objetivo.meta,
    fecha_limite: aFechaISO(objetivo.fecha_limite),
    estado: objetivo.estado,
  };
}

export async function crearObjetivo(datos, usuario = null) {
  const cliente = await clienteModelo.findById(datos.cliente_id);
  if (!cliente) {
    throw new AppError(
      codigosError.NO_ENCONTRADO,
      'El cliente indicado no existe.',
      404
    );
  }
  await exigirCargaDeCliente(usuario, datos.cliente_id);

  const id = await objetivoModelo.crear({
    cliente_id: datos.cliente_id,
    descripcion: datos.descripcion,
    meta: datos.meta,
    fecha_limite: datos.fecha_limite,
    estado: 'en curso',
  });

  await registrar({
    usuarioId: usuario?.id ?? null,
    accion: 'crear_objetivo',
    modulo: MODULO,
    resultado: 'exitoso',
    descripcion: `Objetivo #${id} del cliente ${datos.cliente_id}: ${datos.descripcion}`,
  });

  return objetivoPublico(await objetivoModelo.findById(id));
}

export async function listarObjetivos(filtros = {}, usuario = null) {
  const perfil = await perfilDeEntrenador(usuario);

  if (!perfil) {
    const filas = await objetivoModelo.listar(filtros);
    return filas.map(objetivoPublico);
  }

  if (filtros.cliente_id !== undefined) {
    // Filtrar por un cliente ajeno no revela información (SC-004).
    await exigirCargaDeCliente(usuario, filtros.cliente_id);
    const filas = await objetivoModelo.listar(filtros);
    return filas.map(objetivoPublico);
  }

  const cliente_ids = await clientesDeCarga(perfil);
  if (cliente_ids.length === 0) return [];

  const filas = await objetivoModelo.listar({ ...filtros, cliente_ids });
  return filas.map(objetivoPublico);
}

export async function modificarObjetivo(id, campos, usuario = null) {
  const existente = await objetivoModelo.findById(id);
  if (!existente) {
    throw new AppError(codigosError.NO_ENCONTRADO, MENSAJE_OBJETIVO_NO_EXISTE, 404);
  }
  await exigirCargaDeCliente(usuario, existente.cliente_id);

  const cambios = {};
  for (const campo of CAMPOS_MODIFICABLES) {
    if (campos[campo] !== undefined) cambios[campo] = campos[campo];
  }

  if (Object.keys(cambios).length > 0) {
    // Cumplir (estado) o corregir datos: solo se actualiza la fila del
    // objetivo; la tabla de progresos no se toca (FR-013).
    await objetivoModelo.actualizar(id, cambios);
    await registrar({
      usuarioId: usuario?.id ?? null,
      accion: 'modificar_objetivo',
      modulo: MODULO,
      resultado: 'exitoso',
      descripcion: `Objetivo #${id}: campos ${Object.keys(cambios).join(', ')} (progresos intactos)`,
    });
  }

  return objetivoPublico(await objetivoModelo.findById(id));
}
