// T067 [US6] Terminal del punto de acceso (HU6): captura facial →
// identificación → validación de membresía → resultado claro.
// El backend registra el intento antes de responder (FR-015).

import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import CapturaFacial from '../components/camara/CapturaFacial.jsx';
import { enviarIntento } from '../services/accesos.api.js';

export default function AccesoPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [ultimoIntento, setUltimoIntento] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  function pintarResultado(datos) {
    setUltimoIntento(datos);
    setError('');
  }

  async function alCapturar(descriptor) {
    setEnviando(true);
    try {
      const datos = await enviarIntento(token, descriptor);
      pintarResultado(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  // Simula la cámara no disponible o la captura fallida (descriptor null).
  async function intentarSinCamara() {
    setEnviando(true);
    try {
      const datos = await enviarIntento(token, null);
      pintarResultado(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const autorizado = ultimoIntento?.resultado === 'autorizado';

  return (
    <section>
      <h2>Control de acceso</h2>
      <p>
        Capture el rostro de la persona que desea ingresar. El sistema solo
        identifica a clientes registrados y verifica su membresía.
      </p>

      <CapturaFacial
        onDescriptor={alCapturar}
        textoBoton="Identificar y autorizar acceso"
      />

      {enviando && (
        <p className="exito" role="status">
          Verificando…
        </p>
      )}

      {ultimoIntento && (
        <div
          className={`tarjeta resultado-acceso ${autorizado ? 'exito' : 'error'}`}
          role="status"
        >
          {autorizado ? (
            <>
              <h3>✅ Acceso autorizado</h3>
              <p>
                <strong>{ultimoIntento.cliente.nombre}</strong> — membresía{' '}
                <strong>{ultimoIntento.membresia.estado}</strong>, vence el{' '}
                {ultimoIntento.membresia.fecha_vencimiento}.
              </p>
            </>
          ) : (
            <>
              <h3>⛔ Acceso rechazado</h3>
              <p>
                {ultimoIntento.motivo === 'rostro_no_identificado'
                  ? 'No fue posible identificar al cliente. Asegúrese de que esté registrado y repita la captura.'
                  : `Motivo: ${ultimoIntento.motivo === 'sin_membresia'
                      ? 'el cliente no tiene una membresía vigente.'
                      : `membresía ${ultimoIntento.membresia?.estado ?? ultimoIntento.motivo}.`}`}
              </p>
              {ultimoIntento.cliente && (
                <p>
                  Cliente identificado: <strong>{ultimoIntento.cliente.nombre}</strong>
                </p>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="acciones">
        <button type="button" className="accion" onClick={intentarSinCamara} disabled={enviando}>
          Registrar intento sin cámara (prueba)
        </button>
      </div>
    </section>
  );
}
