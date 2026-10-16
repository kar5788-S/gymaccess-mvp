// T066 [US6] Intento de acceso desde la terminal (HU6); US8 agrega el
// historial propio.

import { apiFetch } from './http.js';

// `descriptor` es la lista de 128 números o `null` para simular la cámara
// no disponible / captura fallida (contracts/api.md).
export async function enviarIntento(token, descriptor) {
  const cuerpo = await apiFetch('/api/accesos/intento', {
    metodo: 'POST',
    datos: { descriptor },
    token,
  });
  return cuerpo.datos;
}

export async function listarAccesos(token, { fecha, resultado, clienteId } = {}) {
  const parametros = new URLSearchParams();
  if (fecha) parametros.set('fecha', fecha);
  if (resultado) parametros.set('resultado', resultado);
  if (clienteId) parametros.set('cliente_id', clienteId);
  const consulta = parametros.toString();
  const ruta = consulta ? `/api/accesos?${consulta}` : '/api/accesos';
  const cuerpo = await apiFetch(ruta, { token });
  return cuerpo.datos;
}

export async function listarMisAccesos(token, { fecha, resultado } = {}) {
  const parametros = new URLSearchParams();
  if (fecha) parametros.set('fecha', fecha);
  if (resultado) parametros.set('resultado', resultado);
  const consulta = parametros.toString();
  const ruta = consulta ? `/api/accesos/mios?${consulta}` : '/api/accesos/mios';
  const cuerpo = await apiFetch(ruta, { token });
  return cuerpo.datos;
}
