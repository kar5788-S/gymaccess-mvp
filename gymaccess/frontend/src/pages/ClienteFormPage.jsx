// T035 [US3] Alta y modificación de clientes (US3-1…US3-5, FR-015).
// Duplicados: ante el aviso 409 se pide confirmación explícita (Q4).

import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { crearCliente, modificarCliente } from '../services/clientes.api.js';

const VACIO = {
  id: '',
  nombre_completo: '',
  telefono: '',
  correo: '',
  notas: '',
};

export default function ClienteFormPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [avisoDuplicado, setAvisoDuplicado] = useState(false);
  const [confirmarDuplicado, setConfirmarDuplicado] = useState(false);

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (campo !== 'id') {
      setAvisoDuplicado(false);
      setConfirmarDuplicado(false);
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    const datos = {
      nombre_completo: form.nombre_completo,
      telefono: form.telefono || undefined,
      correo: form.correo || undefined,
      notas: form.notas || undefined,
    };
    if (confirmarDuplicado) datos.confirmar_duplicado = true;

    try {
      if (form.id) {
        await modificarCliente(token, form.id, datos);
        setMensaje(`Cliente ${form.id} actualizado correctamente.`);
      } else {
        await crearCliente(token, datos);
        setMensaje('Cliente registrado correctamente.');
      }
      setForm(VACIO);
      setAvisoDuplicado(false);
      setConfirmarDuplicado(false);
    } catch (e) {
      setError(e.message);
      if (e.codigo === 'POSIBLE_DUPLICADO') {
        setAvisoDuplicado(true);
        setConfirmarDuplicado(false);
      }
    }
  }

  return (
    <section>
      <h2>Gestión de clientes</h2>

      <form className="formulario tarjeta" onSubmit={enviar}>
        <label htmlFor="c-id">ID a editar (vacío = registrar nuevo)</label>
        <input
          id="c-id"
          type="number"
          min="1"
          value={form.id}
          onChange={(e) => cambiar('id', e.target.value)}
        />

        <label htmlFor="c-nombre">Nombre completo *</label>
        <input
          id="c-nombre"
          value={form.nombre_completo}
          onChange={(e) => cambiar('nombre_completo', e.target.value)}
          required
        />

        <label htmlFor="c-tel">Teléfono</label>
        <input
          id="c-tel"
          value={form.telefono}
          onChange={(e) => cambiar('telefono', e.target.value)}
        />

        <label htmlFor="c-correo">Correo</label>
        <input
          id="c-correo"
          type="email"
          value={form.correo}
          onChange={(e) => cambiar('correo', e.target.value)}
        />
        <small>Debe indicar al menos un teléfono o un correo.</small>

        <label htmlFor="c-notas">Notas</label>
        <textarea
          id="c-notas"
          value={form.notas}
          onChange={(e) => cambiar('notas', e.target.value)}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {avisoDuplicado && (
          <label className="aviso">
            <input
              type="checkbox"
              checked={confirmarDuplicado}
              onChange={(e) => setConfirmarDuplicado(e.target.checked)}
            />{' '}
            Confirmar que desea guardar este posible cliente duplicado y
            volver a enviar.
          </label>
        )}

        <button type="submit">
          {form.id ? 'Guardar cambios' : 'Registrar cliente'}
        </button>
      </form>

      {mensaje && <p className="exito">{mensaje}</p>}
    </section>
  );
}
