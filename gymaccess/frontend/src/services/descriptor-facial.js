// T055 [US5] Carga del modelo facial local y cálculo del descriptor.
// Los pesos se sirven desde `frontend/public/modelos/` (R-13): sin
// descargas externas en tiempo de ejecución.

import * as faceapi from '@vladmandic/face-api';

const RUTA_MODELOS = '/modelos';

let promesaModelos = null;

// Carga perezosa y única de las tres redes necesarias (R-13).
export function cargarModelos() {
  if (!promesaModelos) {
    promesaModelos = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(RUTA_MODELOS),
      faceapi.nets.faceLandmark68Net.loadFromUri(RUTA_MODELOS),
      faceapi.nets.faceRecognitionNet.loadFromUri(RUTA_MODELOS),
    ]);
  }
  return promesaModelos;
}

export async function modelosCargados() {
  try {
    await cargarModelos();
    return true;
  } catch {
    promesaModelos = null; // permite reintentar
    return false;
  }
}

// Detecta el rostro del cuadro actual y devuelve el descriptor de 128
// números, o `null` si no se detectó ningún rostro.
export async function calcularDescriptor(video) {
  await cargarModelos();
  const deteccion = await faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!deteccion) return null;
  return Array.from(deteccion.descriptor);
}
