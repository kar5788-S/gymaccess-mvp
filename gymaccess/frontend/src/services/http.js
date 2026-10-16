// Cliente HTTP compartido: envolvente JSON {exito, datos, error} (R-09).

const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:4000';

export async function apiFetch(ruta, { metodo = 'GET', datos, token } = {}) {
  const cabeceras = { 'Content-Type': 'application/json' };
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: datos !== undefined ? JSON.stringify(datos) : undefined,
  });

  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok || !cuerpo?.exito) {
    const error = new Error(
      cuerpo?.error?.mensaje ||
        'No se pudo comunicar con el servidor. Intente de nuevo.'
    );
    error.codigo = cuerpo?.error?.codigo || 'ERROR_INTERNO';
    error.status = respuesta.status;
    error.detalles = cuerpo?.error?.detalles;
    throw error;
  }

  return cuerpo;
}
