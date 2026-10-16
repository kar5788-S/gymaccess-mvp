// T037 [US3] Registro de pago, historial y saldo pendiente (HU3, HU7).
// Solo efectivo (R-18) y siempre contra una membresía (FR-007).

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { listarAdeudos, listarPagos, registrarPago } from '../services/pagos.api.js';
import { listarClientes } from '../services/clientes.api.js';
import { listarMembresias } from '../services/membresias.api.js';

const VACIO = { cliente_id: '', membresia_id: '', monto: '' };

export default function PagosPage() {
  const { sesion } = useAuth();
  const token = sesion.token;
  // GET /api/adeudos es exclusivo del administrador (matriz de permisos).
  const esAdmin = sesion.usuario.rol === 'administrador';

  const [pagos, setPagos] = useState([]);
  const [adeudos, setAdeudos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (campo === 'cliente_id') {
      setForm((prev) => ({ ...prev, membresia_id: '' }));
    }
  }

  async function recargarPagos() {
    const datos = await listarPagos(token);
    setPagos(datos);
  }

  async function recargarAdeudos() {
    if (!esAdmin) return;
    try {
      setAdeudos(await listarAdeudos(token));
    } catch {
      // Solo el administrador puede consultar /api/adeudos; para los demás
      // roles la sección simplemente no se muestra.
      setAdeudos([]);
    }
  }

  useEffect(() => {
    Promise.all([recargarPagos(), listarClientes(token), recargarAdeudos()])
      .then(([, listaClientes]) => setClientes(listaClientes))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargarMembresias(clienteId) {
    if (!clienteId) {
      setMembresias([]);
      return;
    }
    try {
      const lista = await listarMembresias(token, { clienteId });
      setMembresias(lista);
      if (lista.length === 0) {
        setError('El cliente no tiene membresías registradas.');
      }
    } catch (e) {
      setError(e.message);
    }
  }

  const membresiaSeleccionada = membresias.find(
    (m) => String(m.id) === String(form.membresia_id)
  );

  async function enviar(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    try {
      const pago = await registrarPago(token, {
        cliente_id: Number(form.cliente_id),
        membresia_id: Number(form.membresia_id),
        monto: Number(form.monto),
        metodo: 'efectivo',
      });
      setMensaje(
        `Pago de $${pago.monto.toFixed(2)} registrado. Saldo pendiente: $${pago.saldo_pendiente.toFixed(2)}.`
      );
      setForm(VACIO);
      setMembresias([]);
      await recargarPagos();
      await recargarAdeudos();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h2>Pagos</h2>

      <form className="formulario tarjeta" onSubmit={enviar}>
        <label htmlFor="p-cliente">Cliente *</label>
        <select
          id="p-cliente"
          value={form.cliente_id}
          onChange={(e) => {
            cambiar('cliente_id', e.target.value);
            cargarMembresias(e.target.value);
          }}
          required
        >
          <option value="">Seleccione un cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre_completo}
            </option>
          ))}
        </select>

        <label htmlFor="p-membresia">Membresía *</label>
        <select
          id="p-membresia"
          value={form.membresia_id}
          onChange={(e) => cambiar('membresia_id', e.target.value)}
          required
          disabled={!form.cliente_id}
        >
          <option value="">Seleccione una membresía</option>
          {membresias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id} · {m.tipo.nombre} · vence {m.fecha_vencimiento} · saldo $
              {Number(m.saldo_pendiente).toFixed(2)}
            </option>
          ))}
        </select>

        <label htmlFor="p-monto">Monto *</label>
        <input
          id="p-monto"
          type="number"
          min="0.01"
          step="0.01"
          value={form.monto}
          onChange={(e) => cambiar('monto', e.target.value)}
          required
        />
        <small>Método de pago: efectivo (único permitido).</small>

        {membresiaSeleccionada && (
          <p>
            Saldo actual de la membresía:{' '}
            <strong>${Number(membresiaSeleccionada.saldo_pendiente).toFixed(2)}</strong>
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit">Registrar pago</button>
      </form>

      {mensaje && <p className="exito">{mensaje}</p>}

      <h3>Historial de pagos</h3>
      <table className="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Membresía</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Método</th>
          </tr>
        </thead>
        <tbody>
          {pagos.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.cliente.nombre}</td>
              <td>
                {p.membresia.id} · {p.membresia.tipo}
              </td>
              <td>${p.monto.toFixed(2)}</td>
              <td>{p.fecha_pago}</td>
              <td>{p.metodo}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* T072 [US7]: control financiero — solo administrador. */}
      {esAdmin && (
        <>
          <h3>Adeudos pendientes</h3>
          {adeudos.length === 0 ? (
            <p className="exito">No hay membresías con saldo pendiente. ✅</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Membresía</th>
                  <th>Precio</th>
                  <th>Pagado</th>
                  <th>Saldo pendiente</th>
                </tr>
              </thead>
              <tbody>
                {adeudos.map((a) => (
                  <tr key={a.membresia_id}>
                    <td>{a.cliente}</td>
                    <td>{a.membresia_id}</td>
                    <td>${Number(a.precio).toFixed(2)}</td>
                    <td>${Number(a.pagado).toFixed(2)}</td>
                    <td>${Number(a.saldo_pendiente).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
