// T044 [US4] Seguimiento: alta y cumplimiento de objetivos, registro de
// progresos y su historial ordenado por fecha (HU4, FR-011…FR-013).
// Solo administrador y entrenador de la carga (el servidor aplica 403
// FUERA_DE_CARGA); el recepcionista no accede (clarify Q5).

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  crearObjetivo,
  listarObjetivos,
  modificarObjetivo,
  crearProgreso,
  listarProgresos,
} from '../services/seguimiento.api.js';

const OBJETIVO_VACIO = {
  id: '',
  cliente_id: '',
  descripcion: '',
  meta: '',
  fecha_limite: '',
};

const PROGRESO_VACIO = {
  cliente_id: '',
  objetivo_id: '',
  fecha: '',
  peso: '',
  medidas: '',
  marca: '',
  comentario: '',
};

function hoyISO() {
  const f = new Date();
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(
    f.getDate()
  ).padStart(2, '0')}`;
}

export default function SeguimientoPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [objetivos, setObjetivos] = useState([]);
  const [progresos, setProgresos] = useState([]);
  const [formObjetivo, setFormObjetivo] = useState(OBJETIVO_VACIO);
  const [formProgreso, setFormProgreso] = useState({ ...PROGRESO_VACIO, fecha: hoyISO() });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function recargar() {
    const [listaObjetivos, historial] = await Promise.all([
      listarObjetivos(token),
      listarProgresos(token),
    ]);
    setObjetivos(listaObjetivos);
    setProgresos(historial);
  }

  useEffect(() => {
    recargar().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function cambiarObjetivo(campo, valor) {
    setFormObjetivo((prev) => ({ ...prev, [campo]: valor }));
  }

  function cambiarProgreso(campo, valor) {
    setFormProgreso((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviarObjetivo(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');
    try {
      if (formObjetivo.id) {
        await modificarObjetivo(token, formObjetivo.id, {
          descripcion: formObjetivo.descripcion.trim(),
          meta: formObjetivo.meta.trim() || undefined,
          fecha_limite: formObjetivo.fecha_limite || undefined,
        });
        setMensaje('Objetivo actualizado correctamente.');
      } else {
        await crearObjetivo(token, {
          cliente_id: Number(formObjetivo.cliente_id),
          descripcion: formObjetivo.descripcion.trim(),
          meta: formObjetivo.meta.trim() || undefined,
          fecha_limite: formObjetivo.fecha_limite || undefined,
        });
        setMensaje('Objetivo registrado correctamente.');
      }
      setFormObjetivo(OBJETIVO_VACIO);
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cumplir(objetivo, estado) {
    setMensaje('');
    setError('');
    try {
      await modificarObjetivo(token, objetivo.id, { estado });
      setMensaje(
        estado === 'cumplido'
          ? `El objetivo "${objetivo.descripcion}" quedó cumplido. Sus progresos se conservan intactos.`
          : `El objetivo "${objetivo.descripcion}" volvió a estar en curso.`
      );
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  async function enviarProgreso(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');

    const hayDato =
      formProgreso.peso !== '' ||
      formProgreso.medidas.trim() !== '' ||
      formProgreso.marca.trim() !== '' ||
      formProgreso.comentario.trim() !== '';
    if (!hayDato) {
      setError('Debe registrar al menos un dato: peso, medidas, marca o comentario.');
      return;
    }

    try {
      await crearProgreso(token, {
        cliente_id: Number(formProgreso.cliente_id),
        objetivo_id: formProgreso.objetivo_id ? Number(formProgreso.objetivo_id) : undefined,
        fecha: formProgreso.fecha,
        peso: formProgreso.peso === '' ? undefined : Number(formProgreso.peso),
        medidas: formProgreso.medidas.trim() || undefined,
        marca: formProgreso.marca.trim() || undefined,
        comentario: formProgreso.comentario.trim() || undefined,
      });
      setMensaje('Progreso registrado correctamente.');
      setFormProgreso({ ...PROGRESO_VACIO, fecha: hoyISO() });
      await recargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h2>Seguimiento de objetivos y progresos</h2>

      <form className="formulario tarjeta" onSubmit={enviarObjetivo}>
        <h3>Objetivo</h3>

        <label htmlFor="o-cliente">ID del cliente *</label>
        <input
          id="o-cliente"
          type="number"
          min="1"
          value={formObjetivo.cliente_id}
          onChange={(e) => cambiarObjetivo('cliente_id', e.target.value)}
          required
          disabled={Boolean(formObjetivo.id)}
        />

        <label htmlFor="o-descripcion">Descripción *</label>
        <input
          id="o-descripcion"
          maxLength={255}
          value={formObjetivo.descripcion}
          onChange={(e) => cambiarObjetivo('descripcion', e.target.value)}
          required
        />

        <label htmlFor="o-meta">Meta</label>
        <input
          id="o-meta"
          maxLength={255}
          value={formObjetivo.meta}
          onChange={(e) => cambiarObjetivo('meta', e.target.value)}
        />

        <label htmlFor="o-fecha">Fecha límite (AAAA-MM-DD)</label>
        <input
          id="o-fecha"
          type="date"
          value={formObjetivo.fecha_limite}
          onChange={(e) => cambiarObjetivo('fecha_limite', e.target.value)}
        />

        <div className="acciones">
          <button type="submit">{formObjetivo.id ? 'Guardar cambios' : 'Registrar objetivo'}</button>
          {formObjetivo.id && (
            <button
              type="button"
              className="accion"
              onClick={() => setFormObjetivo(OBJETIVO_VACIO)}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <table className="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Descripción</th>
            <th>Meta</th>
            <th>Fecha límite</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {objetivos.length === 0 && (
            <tr>
              <td colSpan="7">Aún no hay objetivos registrados.</td>
            </tr>
          )}
          {objetivos.map((objetivo) => (
            <tr key={objetivo.id}>
              <td>{objetivo.id}</td>
              <td>{objetivo.cliente}</td>
              <td>{objetivo.descripcion}</td>
              <td>{objetivo.meta || '—'}</td>
              <td>{objetivo.fecha_limite ?? '—'}</td>
              <td>{objetivo.estado}</td>
              <td className="acciones">
                <button
                  type="button"
                  className="accion"
                  onClick={() =>
                    setFormObjetivo({
                      id: String(objetivo.id),
                      cliente_id: String(objetivo.cliente_id),
                      descripcion: objetivo.descripcion,
                      meta: objetivo.meta ?? '',
                      fecha_limite: objetivo.fecha_limite ?? '',
                    })
                  }
                >
                  Editar
                </button>
                {objetivo.estado === 'en curso' ? (
                  <button
                    type="button"
                    className="accion"
                    onClick={() => cumplir(objetivo, 'cumplido')}
                  >
                    Cumplir
                  </button>
                ) : (
                  <button
                    type="button"
                    className="accion"
                    onClick={() => cumplir(objetivo, 'en curso')}
                  >
                    Reabrir
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="formulario tarjeta" onSubmit={enviarProgreso}>
        <h3>Registrar progreso</h3>

        <label htmlFor="p-cliente">ID del cliente *</label>
        <input
          id="p-cliente"
          type="number"
          min="1"
          value={formProgreso.cliente_id}
          onChange={(e) => cambiarProgreso('cliente_id', e.target.value)}
          required
        />

        <label htmlFor="p-objetivo">ID del objetivo (opcional)</label>
        <input
          id="p-objetivo"
          type="number"
          min="1"
          value={formProgreso.objetivo_id}
          onChange={(e) => cambiarProgreso('objetivo_id', e.target.value)}
        />

        <label htmlFor="p-fecha">Fecha *</label>
        <input
          id="p-fecha"
          type="date"
          value={formProgreso.fecha}
          onChange={(e) => cambiarProgreso('fecha', e.target.value)}
          required
        />

        <label htmlFor="p-peso">Peso (kg)</label>
        <input
          id="p-peso"
          type="number"
          step="0.01"
          min="0"
          value={formProgreso.peso}
          onChange={(e) => cambiarProgreso('peso', e.target.value)}
        />

        <label htmlFor="p-medidas">Medidas</label>
        <input
          id="p-medidas"
          maxLength={255}
          placeholder="pecho 98 cm, cintura 84 cm"
          value={formProgreso.medidas}
          onChange={(e) => cambiarProgreso('medidas', e.target.value)}
        />

        <label htmlFor="p-marca">Marca</label>
        <input
          id="p-marca"
          maxLength={255}
          placeholder="5 km en 26 min"
          value={formProgreso.marca}
          onChange={(e) => cambiarProgreso('marca', e.target.value)}
        />

        <label htmlFor="p-comentario">Comentario</label>
        <input
          id="p-comentario"
          maxLength={255}
          value={formProgreso.comentario}
          onChange={(e) => cambiarProgreso('comentario', e.target.value)}
        />

        <p className="ayuda">
          Debe indicar al menos un dato: peso, medidas, marca o comentario.
        </p>

        <div className="acciones">
          <button type="submit">Registrar progreso</button>
        </div>
      </form>

      {mensaje && <p className="exito">{mensaje}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <h3>Historial de progresos</h3>
      <table className="tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Objetivo</th>
            <th>Peso</th>
            <th>Medidas</th>
            <th>Marca</th>
            <th>Comentario</th>
          </tr>
        </thead>
        <tbody>
          {progresos.length === 0 && (
            <tr>
              <td colSpan="7">Aún no hay progresos registrados.</td>
            </tr>
          )}
          {progresos.map((progreso) => (
            <tr key={progreso.id}>
              <td>{progreso.fecha}</td>
              <td>{progreso.cliente}</td>
              <td>{progreso.objetivo ?? '—'}</td>
              <td>{progreso.peso ?? '—'}</td>
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
