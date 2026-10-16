// T054 [US5] Captura facial: video de la cámara + cuadro de la muestra,
// con estados de permiso denegado, cámara no disponible y captura en curso.
// La cámara solo se usa mientras el componente está montado (R-14).

import { useEffect, useRef, useState } from 'react';
import useCara from './useCara.js';

export default function CapturaFacial({ onDescriptor, textoBoton = 'Capturar rostro' }) {
  const { videoRef, estado, mensaje, iniciar, detener, capturar } = useCara();
  const lienzoRef = useRef(null);
  const [cuadro, setCuadro] = useState(null);

  useEffect(() => {
    iniciar();
    return () => detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enCurso = estado === 'capturando';
  const lista = estado === 'lista';

  async function manejarCaptura() {
    setCuadro(null);

    // Congela el cuadro actual en el canvas (feedback visual para la persona).
    const video = videoRef.current;
    const lienzo = lienzoRef.current;
    if (video && lienzo && video.videoWidth > 0) {
      lienzo.width = video.videoWidth;
      lienzo.height = video.videoHeight;
      lienzo.getContext('2d').drawImage(video, 0, 0);
      setCuadro(lienzo.toDataURL('image/jpeg', 0.8));
    }

    const descriptor = await capturar();
    if (descriptor && onDescriptor) onDescriptor(descriptor);
  }

  if (estado === 'error') {
    return (
      <div className="camara tarjeta">
        <p className="error" role="alert">
          {mensaje}
        </p>
        <button type="button" className="accion" onClick={iniciar}>
          Reintentar cámara
        </button>
      </div>
    );
  }

  return (
    <div className="camara tarjeta">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Vista previa de la cámara"
      />

      {cuadro && (
        <figure>
          <img src={cuadro} alt="Último cuadro capturado" />
          <figcaption>Último cuadro capturado</figcaption>
        </figure>
      )}

      {enCurso && (
        <p className="exito" role="status">
          Capturando 5 muestras… mantenga la quietud.
        </p>
      )}

      {mensaje && !enCurso && (
        <p className={estado === 'error' ? 'error' : 'aviso'} role="status">
          {mensaje}
        </p>
      )}

      <div className="acciones">
        <button type="button" onClick={manejarCaptura} disabled={!lista}>
          {enCurso ? 'Capturando…' : textoBoton}
        </button>
        <button type="button" className="accion" onClick={detener} disabled={!lista}>
          Apagar cámara
        </button>
        {estado === 'inactiva' && (
          <button type="button" className="accion" onClick={iniciar}>
            Encender cámara
          </button>
        )}
      </div>
    </div>
  );
}
