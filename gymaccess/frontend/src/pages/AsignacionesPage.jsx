// T023 [US2] Asignación de entrenadores a clientes: alta, listado de
// vigencias (activas y cerradas con sus fechas) y cierre manual.
// Una reasignación cierra automáticamente la anterior (FR-005, Q2);
// el historial nunca se borra (SC-008). Administrador y recepcionista.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  listarAsignaciones,
  crearAsignacion,
  cerrarAsignacion,
} from '../services/asignaciones.api.js';

const VACIO = { cliente_id: '', entrenador_id: '' };

export default function AsignacionesPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [asignaciones, setAsignaciones] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function recargar() {
    const datos = await listarAsignaciones(token);
    setAsignaciones(datos);
    return datos;
  }

  useEffect(() => {
    recargar().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function enviar(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    try {
      await crearAsignacion(token, {
        cliente_id: Number(form.cliente_id),
        entrenador_id: Number(form.entrenador_id),
      });
      setMensaje('Cliente asignado al entrenador correctamente.');
      setForm(VACIO);
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cerrar(asignacion) {
    setMensaje('');
    setError('');
    try {
      await cerrarAsignacion(token, asignacion.id);
      setMensaje(
        `La asignación a "${asignacion.entrenador}" quedó cerrada. El historial se conserva.`
      );
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h2>Asignaciones de entrenador</h2>

      <form className="formulario tarjeta" onSubmit={enviar}>
        <label htmlFor="a-cliente">ID del cliente *</label>
        <input
          id="a-cliente"
          type="number"
          min="1"
          value={form.cliente_id}
          onChange={(e) => cambiar('cliente_id', e.target.value)}
          required
        />

        <label htmlFor="a-entrenador">ID del entrenador *</label>
        <input
          id="a-entrenador"
          type="number"
          min="1"
          value={form.entrenador_id}
          onChange={(e) => cambiar('entrenador_id', e.target.value)}
          required
        />

        <p className="ayuda">
          Si el cliente ya tiene entrenador vigente, esa asignación se cierra
          automáticamente y se conserva en el historial.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="acciones">
          <button type="submit">Asignar entrenador</button>
        </div>
      </form>

      {mensaje && <p className="exito">{mensaje}</p>}

      <table className="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Entrenador</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {asignaciones.length === 0 && (
            <tr>
              <td colSpan="7">Aún no hay asignaciones registradas.</td>
            </tr>
          )}
          {asignaciones.map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>{a.cliente}</td>
              <td>{a.entrenador}</td>
              <td>{a.fecha_inicio}</td>
              <td>{a.fecha_fin ?? '—'}</td>
              <td>{a.estado}</td>
              <td className="acciones">
                {a.estado === 'activa' && (
                  <button type="button" className="accion" onClick={() => cerrar(a)}>
                    Cerrar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
