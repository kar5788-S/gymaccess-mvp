// T053 [US5] Hook de cámara: getUserMedia, 5 muestras separadas ~300 ms
// y promedio de los descriptores (R-17). Solo vive en la pestaña abierta:
// los cuadros de video nunca se envían ni se almacenan (R-14).

import { useCallback, useEffect, useRef, useState } from 'react';
import { calcularDescriptor } from '../../services/descriptor-facial.js';

export const CANTIDAD_MUESTRAS = 5;
export const INTERVALO_MUESTRAS_MS = 300;

function promediar(muestras) {
  const promedio = new Array(128).fill(0);
  for (const muestra of muestras) {
    for (let i = 0; i < 128; i += 1) promedio[i] += muestra[i] / muestras.length;
  }
  return promedio;
}

export default function useCara() {
  const videoRef = useRef(null);
  const flujoRef = useRef(null);
  // estados: inactiva | iniciando | lista | capturando | error
  const [estado, setEstado] = useState('inactiva');
  const [mensaje, setMensaje] = useState('');

  const iniciar = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado('error');
      setMensaje('Su navegador no permite usar la cámara.');
      return false;
    }
    setEstado('iniciando');
    setMensaje('');
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      flujoRef.current = flujo;
      if (videoRef.current) {
        videoRef.current.srcObject = flujo;
        try {
          await videoRef.current.play();
        } catch {
          // El navegador puede rechazar play() automático: el cuadro igual
          // se muestra al tener metadatos.
        }
      }
      setEstado('lista');
      return true;
    } catch (e) {
      if (e?.name === 'NotAllowedError') {
        setEstado('error');
        setMensaje(
          'Permiso de cámara denegado. Habilite el acceso a la cámara en su navegador y vuelva a intentarlo.'
        );
      } else {
        setEstado('error');
        setMensaje(
          'No se pudo usar la cámara. Verifique que esté conectada y no esté en uso por otra aplicación.'
        );
      }
      return false;
    }
  }, []);

  const detener = useCallback(() => {
    if (flujoRef.current) {
      for (const pista of flujoRef.current.getTracks()) pista.stop();
      flujoRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setEstado('inactiva');
  }, []);

  // Toma N muestras con separación y devuelve el descriptor promedio
  // (128 números) o `null` si no se pudo identificar un rostro.
  const capturar = useCallback(async () => {
    setEstado('capturando');
    setMensaje('');
    try {
      const muestras = [];
      for (let i = 0; i < CANTIDAD_MUESTRAS; i += 1) {
        const descriptor = await calcularDescriptor(videoRef.current);
        if (descriptor) muestras.push(descriptor);
        if (i < CANTIDAD_MUESTRAS - 1) {
          await new Promise((resolver) => setTimeout(resolver, INTERVALO_MUESTRAS_MS));
        }
      }

      if (muestras.length === 0) {
        setEstado('lista');
        setMensaje(
          'No se pudo detectar el rostro. Acérquese a la cámara, con buena iluminación frontal y sin gorras ni gafas de sol.'
        );
        return null;
      }

      setEstado('lista');
      return promediar(muestras);
    } catch (e) {
      setEstado('lista');
      setMensaje(
        'No se pudo calcular el descriptor facial. Verifique que el modelo esté cargado e intente de nuevo.'
      );
      return null;
    }
  }, []);

  useEffect(() => () => detener(), [detener]);

  return { videoRef, estado, mensaje, setMensaje, iniciar, detener, capturar };
}
