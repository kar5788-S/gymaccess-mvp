// T036 [US3] Llamadas de pagos (registro e historial; US7 agrega adeudos).

import { apiFetch } from './http.js';

export async function registrarPago(token, datos) {
  const cuerpo = await apiFetch('/api/pagos', {
    metodo: 'POST',
    datos,
    token,
  });
  return cuerpo.datos;
}

export async function listarPagos(token, { clienteId, desde, hasta } = {}) {
  const parametros = new URLSearchParams();
  if (clienteId) parametros.set('cliente_id', clienteId);
  if (desde) parametros.set('desde', desde);
  if (hasta) parametros.set('hasta', hasta);
  const consulta = parametros.toString();
  const ruta = consulta ? `/api/pagos?${consulta}` : '/api/pagos';
  const cuerpo = await apiFetch(ruta, { token });
  return cuerpo.datos;
}

// ---- US7: consultas propias del cliente y de adeudos (FR-010) ----

export async function listarMisPagos(token) {
  const cuerpo = await apiFetch('/api/pagos/mios', { token });
  return cuerpo.datos;
}

export async function listarAdeudos(token) {
  const cuerpo = await apiFetch('/api/adeudos', { token });
  return cuerpo.datos;
}

export async function listarMisAdeudos(token) {
  const cuerpo = await apiFetch('/api/adeudos/mios', { token });
  return cuerpo.datos;
}
