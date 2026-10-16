// T018 [US1] Alta, listado y modificación de tipos de membresía (US1-1…US1-3).
// Solo administrador: el servidor rechaza a cualquier otro rol con 403.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  crearTipoMembresia,
  listarTiposMembresia,
  modificarTipoMembresia,
} from '../services/tipos-membresia.api.js';

const VACIO = {
  id: '',
  nombre: '',
  descripcion: '',
  duracion_dias: '',
  precio: '',
};

export default function TiposMembresiaPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function recargar() {
    const datos = await listarTiposMembresia(token);
    setTipos(datos);
    return datos;
  }

  useEffect(() => {
    recargar().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function editar(tipo) {
    setForm({
      id: String(tipo.id),
      nombre: tipo.nombre,
      descripcion: tipo.descripcion ?? '',
      duracion_dias: String(tipo.duracion_dias),
      precio: String(tipo.precio),
    });
    setMensaje('');
    setError('');
  }

  function cancelarEdicion() {
    setForm(VACIO);
    setMensaje('');
    setError('');
  }

  async function enviar(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    const datos = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      duracion_dias: Number(form.duracion_dias),
      precio: Number(form.precio),
    };

    try {
      if (form.id) {
        await modificarTipoMembresia(token, form.id, datos);
        setMensaje(`Tipo de membresía ${form.id} actualizado correctamente.`);
      } else {
        await crearTipoMembresia(token, datos);
        setMensaje('Tipo de membresía creado correctamente.');
      }
      setForm(VACIO);
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cambiarEstado(tipo, estado) {
    setMensaje('');
    setError('');
    try {
      await modificarTipoMembresia(token, tipo.id, { estado });
      setMensaje(
        estado === 'inactivo'
          ? `El tipo "${tipo.nombre}" quedó inactivo. Las membresías ya asignadas no cambian.`
          : `El tipo "${tipo.nombre}" volvió a estar activo.`
      );
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h2>Tipos de membresía</h2>

      <form className="formulario tarjeta" onSubmit={enviar}>
        <label htmlFor="t-id">ID a editar (vacío = crear nuevo)</label>
        <input
          id="t-id"
          type="number"
          min="1"
          value={form.id}
          onChange={(e) => cambiar('id', e.target.value)}
        />

        <label htmlFor="t-nombre">Nombre *</label>
        <input
          id="t-nombre"
          maxLength={100}
          value={form.nombre}
          onChange={(e) => cambiar('nombre', e.target.value)}
          required
        />

        <label htmlFor="t-descripcion">Descripción</label>
        <input
          id="t-descripcion"
          maxLength={255}
          value={form.descripcion}
          onChange={(e) => cambiar('descripcion', e.target.value)}
        />

        <label htmlFor="t-duracion">Duración en días *</label>
        <input
          id="t-duracion"
          type="number"
          min="1"
          value={form.duracion_dias}
          onChange={(e) => cambiar('duracion_dias', e.target.value)}
          required
        />

        <label htmlFor="t-precio">Precio *</label>
        <input
          id="t-precio"
          type="number"
          min="0"
          step="0.01"
          value={form.precio}
          onChange={(e) => cambiar('precio', e.target.value)}
          required
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="acciones">
          <button type="submit">
            {form.id ? 'Guardar cambios' : 'Crear tipo de membresía'}
          </button>
          {form.id && (
            <button type="button" className="accion" onClick={cancelarEdicion}>
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {mensaje && <p className="exito">{mensaje}</p>}

      <table className="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Duración (días)</th>
            <th>Precio</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tipos.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.nombre}</td>
              <td>{t.descripcion || '—'}</td>
              <td>{t.duracion_dias}</td>
              <td>${t.precio.toFixed(2)}</td>
              <td>{t.estado}</td>
              <td className="acciones">
                <button type="button" className="accion" onClick={() => editar(t)}>
                  Editar
                </button>
                {t.estado === 'activo' ? (
                  <button
                    type="button"
                    className="accion"
                    onClick={() => cambiarEstado(t, 'inactivo')}
                  >
                    Inactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="accion"
                    onClick={() => cambiarEstado(t, 'activo')}
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
