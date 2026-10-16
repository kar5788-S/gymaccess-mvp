// T043 [US4] Llamadas de objetivos y progresos (contracts/api.md).

import { apiFetch } from './http.js';

export async function crearObjetivo(token, datos) {
  const cuerpo = await apiFetch('/api/objetivos', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function listarObjetivos(token, filtros = {}) {
  const parametros = new URLSearchParams();
  if (filtros.cliente_id !== undefined) parametros.set('cliente_id', filtros.cliente_id);
  if (filtros.estado) parametros.set('estado', filtros.estado);
  const consulta = parametros.toString();
  const cuerpo = await apiFetch(
    `/api/objetivos${consulta ? `?${consulta}` : ''}`,
    { token }
  );
  return cuerpo.datos;
}

export async function modificarObjetivo(token, id, datos) {
  const cuerpo = await apiFetch(`/api/objetivos/${id}`, {
    metodo: 'PUT',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function crearProgreso(token, datos) {
  const cuerpo = await apiFetch('/api/progresos', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function listarProgresos(token, filtros = {}) {
  const parametros = new URLSearchParams();
  if (filtros.cliente_id !== undefined) parametros.set('cliente_id', filtros.cliente_id);
  if (filtros.objetivo_id !== undefined)
    parametros.set('objetivo_id', filtros.objetivo_id);
  if (filtros.desde) parametros.set('desde', filtros.desde);
  if (filtros.hasta) parametros.set('hasta', filtros.hasta);
  const consulta = parametros.toString();
  const cuerpo = await apiFetch(
    `/api/progresos${consulta ? `?${consulta}` : ''}`,
    { token }
  );
  return cuerpo.datos;
}
