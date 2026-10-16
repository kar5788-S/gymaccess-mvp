// T060 [US6] Dashboard por rol (HU6, FR-016…FR-019):
// - Administrador: tarjetas con los 14 indicadores agregados por periodo.
// - Entrenador: panel reducido SOLO de su carga y sin cifras financieras
//   (clarify Q1, respuesta B).
// Solo se pintan cifras: el backend jamás envía nombres de clientes.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerDashboard, obtenerMiDashboard } from '../services/dashboard.api.js';

const ETIQUETAS_ADMIN = [
  ['clientes_total', 'Clientes totales'],
  ['clientes_activos', 'Clientes activos'],
  ['membresias_activas', 'Membresías activas'],
  ['membresias_vencidas', 'Membresías vencidas'],
  ['ingresos_periodo', 'Ingresos del periodo'],
  ['pagos_periodo', 'Pagos del periodo'],
  ['accesos_autorizados', 'Accesos autorizados'],
  ['accesos_rechazados', 'Accesos rechazados'],
  ['entrenadores_activos', 'Entrenadores activos'],
  ['clientes_con_entrenador', 'Clientes con entrenador'],
  ['rutinas_activas', 'Rutinas activas'],
  ['objetivos_en_curso', 'Objetivos en curso'],
  ['objetivos_cumplidos', 'Objetivos cumplidos'],
  ['progresos_recientes', 'Progresos recientes'],
];

const ETIQUETAS_ENTRENADOR = [
  ['clientes_carga', 'Clientes en mi carga'],
  ['rutinas_activas', 'Rutinas activas'],
  ['objetivos_en_curso', 'Objetivos en curso'],
  ['objetivos_cumplidos', 'Objetivos cumplidos'],
  ['progresos_recientes', 'Progresos recientes'],
];

const ETIQUETAS_PERIODOS = [
  ['mes', 'Mes en curso'],
  ['30d', 'Últimos 30 días'],
  ['historico', 'Histórico'],
];

function formatoValor(clave, valor) {
  if (clave === 'ingresos_periodo') {
    return `S/ ${Number(valor).toFixed(2)}`;
  }
  return String(valor);
}

export default function DashboardPage() {
  const { sesion } = useAuth();
  const token = sesion.token;
  const esEntrenador = sesion.usuario.rol === 'entrenador';

  const [periodo, setPeriodo] = useState('mes');
  const [indicadores, setIndicadores] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const etiquetas = esEntrenador ? ETIQUETAS_ENTRENADOR : ETIQUETAS_ADMIN;

  useEffect(() => {
    async function cargar() {
      setMensaje('');
      setError('');
      try {
        const datos = esEntrenador
          ? await obtenerMiDashboard(token, periodo)
          : await obtenerDashboard(token, periodo);
        setIndicadores(datos.indicadores);
        if (Object.values(datos.indicadores).every((v) => Number(v) === 0)) {
          setMensaje(
            'Aún no hay actividad registrada que mostrar en este periodo.'
          );
        }
      } catch (e) {
        setIndicadores(null);
        setError(e.message);
      }
    }
    cargar();
  }, [token, periodo, esEntrenador]);

  return (
    <section>
      <h2>{esEntrenador ? 'Panel de mi carga' : 'Dashboard administrativo'}</h2>

      <div className="acciones">
        <label htmlFor="periodo">Periodo: </label>
        <select
          id="periodo"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
        >
          {ETIQUETAS_PERIODOS.map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {mensaje && !error && <p className="ayuda">{mensaje}</p>}

      {indicadores && (
        <div className="indicadores">
          {etiquetas.map(([clave, etiqueta]) => (
            <div className="tarjeta indicador" key={clave}>
              <span className="valor">{formatoValor(clave, indicadores[clave] ?? 0)}</span>
              <span className="etiqueta">{etiqueta}</span>
            </div>
          ))}
        </div>
      )}

      {esEntrenador && (
        <p className="ayuda">
          Su panel muestra únicamente cifras de su carga: no incluye
          información financiera.
        </p>
      )}
    </section>
  );
}
