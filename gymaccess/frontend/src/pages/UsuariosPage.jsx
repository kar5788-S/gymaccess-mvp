// T027 [US2] Página de administración de usuarios (US2-1…US2-5).
// Solo accesible con sesión de administrador; el servidor valida igual.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
} from '../services/usuarios.api.js';

const ROLES = ['administrador', 'recepcionista', 'entrenador', 'cliente'];
const ESTADOS = ['activo', 'deshabilitado'];

export default function UsuariosPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [usuarios, setUsuarios] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    contraseña: '',
    rol: 'recepcionista',
  });

  async function cargar() {
    try {
      setUsuarios(await listarUsuarios(token));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function crear(evento) {
    evento.preventDefault();
    setError('');
    setMensaje('');
    try {
      await crearUsuario(token, form);
      setMensaje('Usuario creado correctamente.');
      setForm({ nombre: '', email: '', contraseña: '', rol: 'recepcionista' });
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function guardar(id) {
    setError('');
    setMensaje('');
    const usuario = usuarios.find((u) => u.id === id);
    try {
      await actualizarUsuario(token, id, {
        rol: usuario.rol,
        estado: usuario.estado,
      });
      setMensaje('Usuario actualizado correctamente.');
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  function cambiar(id, campo, valor) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [campo]: valor } : u))
    );
  }

  return (
    <section>
      <h2>Usuarios del sistema</h2>

      <form className="formulario tarjeta" onSubmit={crear}>
        <h3>Registrar usuario</h3>

        <label htmlFor="u-nombre">Nombre</label>
        <input
          id="u-nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
        />

        <label htmlFor="u-email">Correo</label>
        <input
          id="u-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <label htmlFor="u-pass">Contraseña</label>
        <input
          id="u-pass"
          type="password"
          value={form.contraseña}
          onChange={(e) => setForm({ ...form, contraseña: e.target.value })}
          required
        />
        <small>
          Mínimo 8 caracteres, al menos una mayúscula y un número.
        </small>

        <label htmlFor="u-rol">Rol</label>
        <select
          id="u-rol"
          value={form.rol}
          onChange={(e) => setForm({ ...form, rol: e.target.value })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <button type="submit">Crear usuario</button>
      </form>

      {mensaje && <p className="exito">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <table className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.rol}
                  onChange={(e) => cambiar(u.id, 'rol', e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={u.estado}
                  onChange={(e) => cambiar(u.id, 'estado', e.target.value)}
                >
                  {ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="acciones">
                <button type="button" className="accion" onClick={() => guardar(u.id)}>
                  Guardar cambios
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
