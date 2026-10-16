// T061 [US6] Cotejo facial en el servidor (R-14, R-16): aritmética pura
// sobre vectores de 128 dimensiones, sin TensorFlow.js en el backend.
// Coincidencia válida si la distancia euclidiana ≤ umbral.

import { obtenerUmbral } from '../config/facial.js';
import { DIMENSIONES_DESCRIPTOR } from '../utils/descriptor.js';

// Distancia euclidiana entre dos vectores del mismo tamaño.
export function distanciaEuclidiana(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Los dos vectores deben tener la misma dimensión.');
  }
  let suma = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diferencia = a[i] - b[i];
    suma += diferencia * diferencia;
  }
  return Math.sqrt(suma);
}

// Regla de coincidencia (R-16): distancia ≤ umbral.
export function esCoincidencia(distancia, umbral = obtenerUmbral()) {
  return distancia <= umbral;
}

// Mejor candidato entre los descriptores almacenados; `null` si ninguno
// alcanza el umbral (rostro no identificado).
export function mejorCoincidencia(descriptores, objetivo, umbral = obtenerUmbral()) {
  let mejor = null;
  for (const candidato of descriptores) {
    if (candidato.valores.length !== DIMENSIONES_DESCRIPTOR) continue;
    const distancia = distanciaEuclidiana(candidato.valores, objetivo);
    if (esCoincidencia(distancia, umbral) && (!mejor || distancia < mejor.distancia)) {
      mejor = { cliente_id: candidato.cliente_id, distancia };
    }
  }
  return mejor;
}
