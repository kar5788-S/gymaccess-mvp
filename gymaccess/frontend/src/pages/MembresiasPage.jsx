// T027 [US2] Asignación y consulta de membresías (HU2, HU4).
// Muestra estado, vencimiento y saldo pendiente; los roles sin permiso
// reciben 403 desde el servidor, no solo desde el menú (FR-016).

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  asignarMembresia,
  cambiarEstadoMembresia,
  listarMembresias,
  renovarMembresia,
} from '../services/membresias.api.js';
import { listarClientes } from '../services/clientes.api.js';
import { listarTiposMembresia } from '../services/tipos-membresia.api.js';

const VACIO = {
  cliente_id: '',
  tipo_membresia_id: '',
  fecha_inicio: '',
};

export default function MembresiasPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [membresias, setMembresias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function recargar(estado = filtroEstado) {
    const lista = await listarMembresias(token, { estado: estado || undefined });
    setMembresias(lista);
    return lista;
  }

  useEffect(() => {
    Promise.all([
      recargar(''),
      listarClientes(token),
      listarTiposMembresia(token, 'activo'),
    ])
      .then(([, listaClientes, listaTipos]) => {
        setClientes(listaClientes);
        setTipos(listaTipos);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function enviar(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    try {
      const creada = await asignarMembresia(token, {
        cliente_id: Number(form.cliente_id),
        tipo_membresia_id: Number(form.tipo_membresia_id),
        fecha_inicio: form.fecha_inicio,
      });
      setMensaje(
        `Membresía asignada: vence el ${creada.fecha_vencimiento}.`
      );
      setForm(VACIO);
      await recargar('');
      setFiltroEstado('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function aplicarFiltro(estado) {
    setFiltroEstado(estado);
    setError('');
    try {
      const lista = await recargar(estado);
      if (lista.length === 0) {
        setMensaje(`No hay membresías con estado "${estado || 'todos'}".`);
      } else {
        setMensaje('');
      }
    } catch (e) {
      setError(e.message);
    }
  }

  // ---- US4: renovación y gestión de estados ----

  async function ejecutarAccion(tipoAccion, membresia) {
    setMensaje('');
    setError('');
    try {
      if (tipoAccion === 'renovar') {
        const renovada = await renovarMembresia(token, membresia.id);
        setMensaje(
          `Membresía renovada: nuevo vencimiento ${renovada.fecha_vencimiento}.`
        );
      } else {
        const actualizada = await cambiarEstadoMembresia(
          token,
          membresia.id,
          tipoAccion
        );
        setMensaje(
          `Membresía ${membresia.id} ahora está "${actualizada.estado}". Vencimiento: ${actualizada.fecha_vencimiento}.`
        );
      }
      await recargar(filtroEstado);
    } catch (e) {
      setError(e.message);
    }
  }

  function confirmar(tipoAccion, membresia) {
    const descripciones = {
      renovar: `Se sumará la duración del plan al vencimiento actual (${membresia.fecha_vencimiento}). ¿Continuar?`,
      suspendida: 'La membresía dejará de autorizar acceso. ¿Suspenderla?',
      cancelada: 'La cancelación es definitiva y no se puede deshacer. ¿Cancelarla?',
      activa: 'La membresía volverá a estar activa (conserva su fecha de vencimiento original). ¿Reactivarla?',
    };
    const etiquetas = {
      renovar: 'Renovar',
      suspendida: 'Suspender',
      cancelada: 'Cancelar',
      activa: 'Reactivar',
    };
    if (window.confirm(`${etiquetas[tipoAccion]} membresía. ${descripciones[tipoAccion]}`)) {
      ejecutarAccion(tipoAccion, membresia);
    }
  }

  return (
    <section>
      <h2>Membresías</h2>

      <form className="formulario tarjeta" onSubmit={enviar}>
        <label htmlFor="m-cliente">Cliente *</label>
        <select
          id="m-cliente"
          value={form.cliente_id}
          onChange={(e) => cambiar('cliente_id', e.target.value)}
          required
        >
          <option value="">Seleccione un cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre_completo}
            </option>
          ))}
        </select>

        <label htmlFor="m-tipo">Tipo de membresía *</label>
        <select
          id="m-tipo"
          value={form.tipo_membresia_id}
          onChange={(e) => cambiar('tipo_membresia_id', e.target.value)}
          required
        >
          <option value="">Seleccione un plan</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre} · {t.duracion_dias} días · ${t.precio.toFixed(2)}
            </option>
          ))}
        </select>

        <label htmlFor="m-inicio">Fecha de inicio *</label>
        <input
          id="m-inicio"
          type="date"
          value={form.fecha_inicio}
          onChange={(e) => cambiar('fecha_inicio', e.target.value)}
          required
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit">Asignar membresía</button>
      </form>

      {mensaje && <p className="exito">{mensaje}</p>}

      <form className="acciones" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="m-estado">Filtrar por estado:</label>
        <select
          id="m-estado"
          value={filtroEstado}
          onChange={(e) => aplicarFiltro(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="activa">Activas</option>
          <option value="vencida">Vencidas</option>
          <option value="suspendida">Suspendidas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </form>

      <table className="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Inicio</th>
            <th>Vencimiento</th>
            <th>Estado</th>
            <th>Saldo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {membresias.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.cliente.nombre}</td>
              <td>{m.tipo.nombre}</td>
              <td>{m.fecha_inicio}</td>
              <td>{m.fecha_vencimiento}</td>
              <td>{m.estado}</td>
              <td>
                {m.saldo_pendiente !== undefined
                  ? `$${Number(m.saldo_pendiente).toFixed(2)}`
                  : '—'}
              </td>
              <td className="acciones">
                {(m.estado === 'activa' || m.estado === 'vencida') && (
                  <button
                    type="button"
                    className="accion"
                    onClick={() => confirmar('renovar', m)}
                  >
                    Renovar
                  </button>
                )}
                {m.estado === 'activa' && (
                  <button
                    type="button"
                    className="accion"
                    onClick={() => confirmar('suspendida', m)}
                  >
                    Suspender
                  </button>
                )}
                {(m.estado === 'activa' || m.estado === 'vencida') && (
                  <button
                    type="button"
                    className="accion"
                    onClick={() => confirmar('cancelada', m)}
                  >
                    Cancelar
                  </button>
                )}
                {m.estado === 'suspendida' && (
                  <button
                    type="button"
                    className="accion"
                    onClick={() => confirmar('activa', m)}
                  >
                    Reactivar
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
