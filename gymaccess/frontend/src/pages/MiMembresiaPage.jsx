// T084 [US9] Mi membresía en solo lectura (FR-024): tipo, fechas y estado.
// Sin importes ni acciones de escritura: el cliente nunca gestiona su
// propia membresía, solo la consulta.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerMiMembresia } from '../services/clientes.api.js';

const ETIQUETAS_ESTADO = {
  activa: '✅ Activa',
  vencida: '⏰ Vencida',
  suspendida: '⛔ Suspendida',
  cancelada: '🚫 Cancelada',
};

export default function MiMembresiaPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [membresia, setMembresia] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    obtenerMiMembresia(token)
      .then((datos) => {
        if (activo) setMembresia(datos);
      })
      .catch((e) => {
        if (activo) setError(e.message);
      });
    return () => {
      activo = false;
    };
  }, [token]);

  return (
    <section>
      <h2>Mi membresía</h2>

      {error && (
        <p className="aviso" role="status">
          {error}
        </p>
      )}

      {membresia && (
        <div className="tarjeta">
          <p>
            <strong>Plan:</strong> {membresia.tipo.nombre}
          </p>
          {membresia.tipo.descripcion && (
            <p>
              <strong>Descripción:</strong> {membresia.tipo.descripcion}
            </p>
          )}
          <p>
            <strong>Estado:</strong>{' '}
            {ETIQUETAS_ESTADO[membresia.estado] ?? membresia.estado}
          </p>
          <p>
            <strong>Fecha de inicio:</strong> {membresia.fecha_inicio}
          </p>
          <p>
            <strong>Fecha de finalización:</strong> {membresia.fecha_vencimiento}
          </p>
          {membresia.estado === 'activa' && (
            <p className="exito">
              Su membresía está vigente hasta el {membresia.fecha_vencimiento}.
            </p>
          )}
          {membresia.estado === 'vencida' && (
            <p className="aviso">
              Su membresía venció el {membresia.fecha_vencimiento}. Acuda a
              recepción para renovarla.
            </p>
          )}
        </div>
      )}

      <p>
        ¿Necesita un cambio? Acuda a recepción: solo el personal autorizado
        asigna, renueva o cambia el estado de las membresías.
      </p>
    </section>
  );
}
