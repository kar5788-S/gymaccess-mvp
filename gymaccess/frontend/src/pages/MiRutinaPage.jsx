// T051 [US5] Mi rutina: plan vigente con sus ejercicios, objetivos y
// evolución del propio cliente, en modo SOLO LECTURA (HU5, FR-014, FR-015).
// El cliente_id se resuelve en el servidor desde la sesión: aquí solo se
// pinta lo que la API devuelve para el autenticado (SC-005).

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerMiRutina, obtenerMiProgreso } from '../services/clientes.api.js';

function progresoValor(valor, sufijo = '') {
  if (valor === null || valor === undefined || valor === '') return '—';
  return `${valor}${sufijo}`;
}

export default function MiRutinaPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [rutina, setRutina] = useState(null);
  const [vacio, setVacio] = useState('');
  const [objetivos, setObjetivos] = useState([]);
  const [progresos, setProgresos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const datosRutina = await obtenerMiRutina(token);
        setRutina(datosRutina.rutina);
        setVacio(datosRutina.mensaje ?? '');

        const { objetivos: listaObjetivos, progresos: historial } =
          await obtenerMiProgreso(token);
        setObjetivos(listaObjetivos);
        setProgresos(historial);
      } catch (e) {
        setError(e.message);
      }
    }
    cargar();
  }, [token]);

  return (
    <section>
      <h2>Mi rutina</h2>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!error && !rutina && (
        // Estado vacío: mensaje claro y sin tecnicismos (HU5 esc.3).
        <p className="ayuda">{vacio || 'Aún no tiene una rutina activa asignada.'}</p>
      )}

      {rutina && (
        <div className="tarjeta">
          <h3>
            {rutina.nombre} <span className="estado">{rutina.estado}</span>
          </h3>
          <p>
            Entrenador responsable: <strong>{rutina.entrenador ?? '—'}</strong>
          </p>
          <table className="tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Ejercicio</th>
                <th>Series</th>
                <th>Repeticiones</th>
                <th>Instrucciones</th>
              </tr>
            </thead>
            <tbody>
              {rutina.ejercicios.length === 0 && (
                <tr>
                  <td colSpan="5">Esta rutina aún no tiene ejercicios.</td>
                </tr>
              )}
              {rutina.ejercicios.map((ejercicio, indice) => (
                <tr key={ejercicio.id ?? indice}>
                  <td>{ejercicio.orden ?? indice + 1}</td>
                  <td>{ejercicio.nombre}</td>
                  <td>{progresoValor(ejercicio.series)}</td>
                  <td>{progresoValor(ejercicio.repeticiones)}</td>
                  <td>{progresoValor(ejercicio.instrucciones)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Mis objetivos</h3>
      <table className="tabla">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Meta</th>
            <th>Fecha límite</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {objetivos.length === 0 && (
            <tr>
              <td colSpan="4">Aún no tiene objetivos registrados.</td>
            </tr>
          )}
          {objetivos.map((objetivo) => (
            <tr key={objetivo.id}>
              <td>{objetivo.descripcion}</td>
              <td>{objetivo.meta || '—'}</td>
              <td>{objetivo.fecha_limite ?? '—'}</td>
              <td>{objetivo.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Mi evolución</h3>
      <table className="tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Peso</th>
            <th>Medidas</th>
            <th>Marca</th>
            <th>Comentario</th>
          </tr>
        </thead>
        <tbody>
          {progresos.length === 0 && (
            <tr>
              <td colSpan="5">Aún no tiene progresos registrados.</td>
            </tr>
          )}
          {progresos.map((progreso) => (
            <tr key={progreso.id}>
              <td>{progreso.fecha}</td>
              <td>{progreso.peso === null ? '—' : `${progreso.peso} kg`}</td>
              <td>{progreso.medidas ?? '—'}</td>
              <td>{progreso.marca ?? '—'}</td>
              <td>{progreso.comentario ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
