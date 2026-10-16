// T014 [US1] + T066 [US7] Perfiles de entrenador.
// - Administrador: alta, listado con la columna `clientes_asignados`,
//   ficha con la carga vigente y modificación con baja lógica `inactivo`
//   (FR-001, FR-003, FR-025).
// - Recepcionista: consulta en SOLO LECTURA (T067; el servidor rechaza
//   la escritura con 403 — FR-021).
// - Entrenador: ve ÚNICAMENTE su propia carga (`/mio/clientes`) con
//   estados de membresía y sin importes (HU7, Principio VI); con carga
//   vacía muestra el estado "carga 0" sin error.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  crearEntrenador,
  listarConCarga,
  modificarEntrenador,
  obtenerConClientes,
  obtenerMiCarga,
} from '../services/entrenadores.api.js';

const VACIO = {
  id: '',
  usuario_id: '',
  nombre: '',
  telefono: '',
  especialidad: '',
};

// Tabla reutilizada por la vista propia del entrenador y por la ficha.
function TablaCarga({ clientes, vacio }) {
  return (
    <table className="tabla">
      <thead>
        <tr>
          <th>ID</th>
          <th>Cliente</th>
          <th>Correo</th>
          <th>Teléfono</th>
          <th>Estado</th>
          <th>Membresía</th>
          <th>Vence</th>
        </tr>
      </thead>
      <tbody>
        {clientes.length === 0 && (
          <tr>
            <td colSpan="7">{vacio}</td>
          </tr>
        )}
        {clientes.map((cliente) => (
          <tr key={cliente.id}>
            <td>{cliente.id}</td>
            <td>{cliente.nombre_completo}</td>
            <td>{cliente.correo || '—'}</td>
            <td>{cliente.telefono || '—'}</td>
            <td>{cliente.estado}</td>
            <td>{cliente.membresia?.estado ?? 'Sin membresía'}</td>
            <td>{cliente.membresia?.fecha_vencimiento ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function EntrenadoresPage() {
  const { sesion } = useAuth();
  const token = sesion.token;
  const esEntrenador = sesion.usuario.rol === 'entrenador';
  const soloLectura = sesion.usuario.rol === 'recepcionista';

  const [entrenadores, setEntrenadores] = useState([]);
  const [miCarga, setMiCarga] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  // Cada rol consulta su propio recurso: el entrenador nunca pide el
  // listado completo (el servidor lo rechaza con 403).
  async function recargar() {
    if (esEntrenador) {
      const datos = await obtenerMiCarga(token);
      setMiCarga(datos);
      return datos;
    }
    const datos = await listarConCarga(token);
    setEntrenadores(datos);
    return datos;
  }

  useEffect(() => {
    recargar().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function editar(entrenador) {
    setForm({
      id: String(entrenador.id),
      usuario_id: String(entrenador.usuario_id),
      nombre: entrenador.nombre,
      telefono: entrenador.telefono ?? '',
      especialidad: entrenador.especialidad ?? '',
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
      telefono: form.telefono.trim() || undefined,
      especialidad: form.especialidad.trim() || undefined,
    };

    try {
      if (form.id) {
        await modificarEntrenador(token, form.id, datos);
        setMensaje(`Entrenador ${form.id} actualizado correctamente.`);
      } else {
        await crearEntrenador(token, {
          usuario_id: Number(form.usuario_id),
          ...datos,
        });
        setMensaje('Entrenador registrado correctamente.');
      }
      setForm(VACIO);
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cambiarEstado(entrenador, estado) {
    setMensaje('');
    setError('');
    try {
      await modificarEntrenador(token, entrenador.id, { estado });
      setMensaje(
        estado === 'inactivo'
          ? `El entrenador "${entrenador.nombre}" quedó inactivo. Sus asignaciones y rutinas se conservan como historial.`
          : `El entrenador "${entrenador.nombre}" volvió a estar activo.`
      );
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function verCarga(entrenador) {
    setMensaje('');
    setError('');
    try {
      const datos = await obtenerConClientes(token, entrenador.id);
      setFicha(datos);
    } catch (e) {
      setError(e.message);
    }
  }

  // ---- Vista propia del entrenador (HU7): solo su carga ----
  if (esEntrenador) {
    return (
      <section>
        <h2>Mi carga</h2>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="ayuda">
          Clientes con asignación vigente con su cuenta. Solo se muestran
          estados y fechas de membresía: esta vista no incluye importes.
        </p>
        <TablaCarga
          clientes={miCarga}
          vacio="Aún no tiene clientes en su carga (carga 0). Asigne un cliente para verlo aquí."
        />
      </section>
    );
  }

  // ---- Personal (administrador con escritura; recepcionista solo lee) ----
  return (
    <section>
      <h2>Personal de entrenadores</h2>

      {!soloLectura && (
        <form className="formulario tarjeta" onSubmit={enviar}>
          <label htmlFor="e-id">ID a editar (vacío = registrar nuevo)</label>
          <input
            id="e-id"
            type="number"
            min="1"
            value={form.id}
            onChange={(e) => cambiar('id', e.target.value)}
          />

          <label htmlFor="e-usuario">ID de la cuenta (rol entrenador) *</label>
          <input
            id="e-usuario"
            type="number"
            min="1"
            value={form.usuario_id}
            onChange={(e) => cambiar('usuario_id', e.target.value)}
            required
            disabled={Boolean(form.id)}
          />

          <label htmlFor="e-nombre">Nombre *</label>
          <input
            id="e-nombre"
            maxLength={100}
            value={form.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            required
          />

          <label htmlFor="e-telefono">Teléfono</label>
          <input
            id="e-telefono"
            maxLength={30}
            value={form.telefono}
            onChange={(e) => cambiar('telefono', e.target.value)}
          />

          <label htmlFor="e-especialidad">Especialidad</label>
          <input
            id="e-especialidad"
            maxLength={120}
            value={form.especialidad}
            onChange={(e) => cambiar('especialidad', e.target.value)}
          />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="acciones">
            <button type="submit">
              {form.id ? 'Guardar cambios' : 'Registrar entrenador'}
            </button>
            {form.id && (
              <button type="button" className="accion" onClick={cancelarEdicion}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      )}

      {mensaje && <p className="exito">{mensaje}</p>}
      {error && soloLectura && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <table className="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cuenta</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Especialidad</th>
            <th>Estado</th>
            <th>Clientes a cargo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {entrenadores.length === 0 && (
            <tr>
              <td colSpan="8">Aún no hay entrenadores registrados.</td>
            </tr>
          )}
          {entrenadores.map((ent) => (
            <tr key={ent.id}>
              <td>{ent.id}</td>
              <td>{ent.usuario?.email ?? '—'}</td>
              <td>{ent.nombre}</td>
              <td>{ent.telefono || '—'}</td>
              <td>{ent.especialidad || '—'}</td>
              <td>{ent.estado}</td>
              <td>{ent.clientes_asignados ?? 0}</td>
              <td className="acciones">
                <button type="button" className="accion" onClick={() => verCarga(ent)}>
                  Ver carga
                </button>
                {!soloLectura && (
                  <>
                    <button
                      type="button"
                      className="accion"
                      onClick={() => editar(ent)}
                    >
                      Editar
                    </button>
                    {ent.estado === 'activo' ? (
                      <button
                        type="button"
                        className="accion"
                        onClick={() => cambiarEstado(ent, 'inactivo')}
                      >
                        Dar de baja
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="accion"
                        onClick={() => cambiarEstado(ent, 'activo')}
                      >
                        Reactivar
                      </button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {ficha && (
        <div className="tarjeta">
          <div className="acciones">
            <h3>
              Carga de {ficha.nombre} ({ficha.clientes.length} cliente(s) vigente(s))
            </h3>
            <button type="button" className="accion" onClick={() => setFicha(null)}>
              Cerrar detalle
            </button>
          </div>
          <TablaCarga
            clientes={ficha.clientes}
            vacio="Este entrenador no tiene clientes con asignación vigente."
          />
        </div>
      )}
    </section>
  );
}
