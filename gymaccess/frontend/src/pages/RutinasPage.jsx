// T032 [US3] Rutinas de entrenamiento: alta con ejercicios, edición con
// reemplazo completo de la lista y archivar/reactivar (HU3, FR-009/FR-010).
// El entrenador solo ve su carga y el administrador todo (el servidor lo
// valida con 403 FUERA_DE_CARGA); el recepcionista la consulta en modo
// solo lectura — la página oculta la escritura y el servidor la rechaza.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  listarRutinas,
  crearRutina,
  obtenerRutina,
  modificarRutina,
  cambiarEstadoRutina,
} from '../services/rutinas.api.js';

const VACIO = { id: '', cliente_id: '', nombre: '', ejercicios: [] };
const EJERCICIO_VACIO = { nombre: '', series: '', repeticiones: '', instrucciones: '' };

function filaEjercicio(ejercicio) {
  return {
    nombre: ejercicio.nombre ?? '',
    series: ejercicio.series ?? '',
    repeticiones: ejercicio.repeticiones ?? '',
    instrucciones: ejercicio.instrucciones ?? '',
  };
}

// Normaliza a la forma del contrato: números donde apliquen y campos
// vacíos ausentes (undefined) para que el servidor los tome como nulos.
function ejerciciosNormalizados(lista) {
  return lista.map((e) => ({
    nombre: e.nombre.trim(),
    series:
      e.series === '' || e.series === null || e.series === undefined
        ? undefined
        : Number(e.series),
    repeticiones:
      e.repeticiones === '' || e.repeticiones === null || e.repeticiones === undefined
        ? undefined
        : Number(e.repeticiones),
    instrucciones: e.instrucciones.trim() || undefined,
  }));
}

export default function RutinasPage() {
  const { sesion } = useAuth();
  const token = sesion.token;
  const soloLectura = sesion.usuario.rol === 'recepcionista';

  const [rutinas, setRutinas] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function recargar() {
    const datos = await listarRutinas(token);
    setRutinas(datos);
    return datos;
  }

  useEffect(() => {
    recargar().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function cambiarEjercicio(indice, campo, valor) {
    setForm((prev) => ({
      ...prev,
      ejercicios: prev.ejercicios.map((e, i) =>
        i === indice ? { ...e, [campo]: valor } : e
      ),
    }));
  }

  function agregarEjercicio() {
    setForm((prev) => ({ ...prev, ejercicios: [...prev.ejercicios, { ...EJERCICIO_VACIO }] }));
  }

  function quitarEjercicio(indice) {
    setForm((prev) => ({
      ...prev,
      ejercicios: prev.ejercicios.filter((_, i) => i !== indice),
    }));
  }

  function nuevaRutina() {
    setForm(VACIO);
    setMensaje('');
    setError('');
  }

  async function editar(rutina) {
    setMensaje('');
    setError('');
    try {
      const detalle = await obtenerRutina(token, rutina.id);
      setForm({
        id: String(detalle.rutina.id),
        cliente_id: String(detalle.rutina.cliente_id),
        nombre: detalle.rutina.nombre,
        ejercicios: detalle.ejercicios.map(filaEjercicio),
      });
    } catch (e) {
      setError(e.message);
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    const ejercicios = ejerciciosNormalizados(form.ejercicios);
    if (ejercicios.length === 0) {
      setError('La rutina debe incluir al menos un ejercicio.');
      return;
    }

    try {
      if (form.id) {
        await modificarRutina(token, form.id, {
          nombre: form.nombre.trim(),
          ejercicios,
        });
        setMensaje('Rutina actualizada correctamente.');
      } else {
        await crearRutina(token, {
          cliente_id: Number(form.cliente_id),
          nombre: form.nombre.trim(),
          ejercicios,
        });
        setMensaje('Rutina creada y activada. La anterior, si existía, pasó a archivada.');
      }
      setForm(VACIO);
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cambiarEstado(rutina, estado) {
    setMensaje('');
    setError('');
    try {
      await cambiarEstadoRutina(token, rutina.id, estado);
      setMensaje(
        estado === 'archivada'
          ? `La rutina "${rutina.nombre}" pasó a archivada. El historial se conserva.`
          : `La rutina "${rutina.nombre}" volvió a estar activa.`
      );
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h2>Rutinas de entrenamiento</h2>

      {!soloLectura && (
        <form className="formulario tarjeta" onSubmit={enviar}>
          <label htmlFor="r-cliente">ID del cliente *</label>
          <input
            id="r-cliente"
            type="number"
            min="1"
            value={form.cliente_id}
            onChange={(e) => cambiar('cliente_id', e.target.value)}
            required
            disabled={Boolean(form.id)}
          />

          <label htmlFor="r-nombre">Nombre de la rutina *</label>
          <input
            id="r-nombre"
            maxLength={150}
            value={form.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            required
          />

          <fieldset>
            <legend>Ejercicios * (al menos uno)</legend>
            {form.ejercicios.length === 0 && (
              <p className="ayuda">Aún no ha agregado ejercicios.</p>
            )}
            {form.ejercicios.map((ejercicio, indice) => (
              <div className="ejercicio" key={indice}>
                <label htmlFor={`ej-nombre-${indice}`}>Nombre *</label>
                <input
                  id={`ej-nombre-${indice}`}
                  maxLength={150}
                  value={ejercicio.nombre}
                  onChange={(e) => cambiarEjercicio(indice, 'nombre', e.target.value)}
                  required
                />

                <label htmlFor={`ej-series-${indice}`}>Series</label>
                <input
                  id={`ej-series-${indice}`}
                  type="number"
                  min="1"
                  value={ejercicio.series}
                  onChange={(e) => cambiarEjercicio(indice, 'series', e.target.value)}
                />

                <label htmlFor={`ej-reps-${indice}`}>Repeticiones</label>
                <input
                  id={`ej-reps-${indice}`}
                  type="number"
                  min="1"
                  value={ejercicio.repeticiones}
                  onChange={(e) => cambiarEjercicio(indice, 'repeticiones', e.target.value)}
                />

                <label htmlFor={`ej-inst-${indice}`}>Instrucciones</label>
                <input
                  id={`ej-inst-${indice}`}
                  maxLength={255}
                  value={ejercicio.instrucciones}
                  onChange={(e) => cambiarEjercicio(indice, 'instrucciones', e.target.value)}
                />

                <button
                  type="button"
                  className="accion"
                  onClick={() => quitarEjercicio(indice)}
                >
                  Quitar ejercicio
                </button>
              </div>
            ))}
            <button type="button" className="accion" onClick={agregarEjercicio}>
              Agregar ejercicio
            </button>
          </fieldset>

          <p className="ayuda">
            Cada ejercicio debe indicar series o repeticiones mayores que cero, o
            instrucciones.
          </p>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="acciones">
            <button type="submit">{form.id ? 'Guardar cambios' : 'Crear rutina'}</button>
            {form.id && (
              <button type="button" className="accion" onClick={nuevaRutina}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      )}

      {mensaje && <p className="exito">{mensaje}</p>}
      {error && !form.id && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <table className="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Entrenador</th>
            <th>Nombre</th>
            <th>Estado</th>
            {!soloLectura && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {rutinas.length === 0 && (
            <tr>
              <td colSpan={soloLectura ? 5 : 6}>
                {soloLectura
                  ? 'Aún no hay rutinas registradas.'
                  : 'Aún no hay rutinas registradas para su carga.'}
              </td>
            </tr>
          )}
          {rutinas.map((rutina) => (
            <tr key={rutina.id}>
              <td>{rutina.id}</td>
              <td>{rutina.cliente}</td>
              <td>{rutina.entrenador}</td>
              <td>{rutina.nombre}</td>
              <td>{rutina.estado}</td>
              {!soloLectura && (
                <td className="acciones">
                  <button type="button" className="accion" onClick={() => editar(rutina)}>
                    Editar
                  </button>
                  {rutina.estado === 'activa' ? (
                    <button
                      type="button"
                      className="accion"
                      onClick={() => cambiarEstado(rutina, 'archivada')}
                    >
                      Archivar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="accion"
                      onClick={() => cambiarEstado(rutina, 'activa')}
                    >
                      Reactivar
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
