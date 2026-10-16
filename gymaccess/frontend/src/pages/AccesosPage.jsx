// T078 [US8] Historial de accesos con filtros de fecha y resultado, y
// estado vacío con mensaje claro (HU8-4). Visible para administrador,
// recepcionista y entrenador (asistencia).

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { listarAccesos } from '../services/accesos.api.js';

export default function AccesosPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [accesos, setAccesos] = useState([]);
  const [fecha, setFecha] = useState('');
  const [resultado, setResultado] = useState('');
  const [consultado, setConsultado] = useState(false);
  const [error, setError] = useState('');

  async function consultar(filtros = { fecha, resultado }) {
    setError('');
    try {
      const datos = await listarAccesos(token, {
        fecha: filtros.fecha || undefined,
        resultado: filtros.resultado || undefined,
      });
      setAccesos(datos);
      setConsultado(true);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    consultar({ fecha: '', resultado: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function aplicar() {
    consultar({ fecha, resultado });
  }

  function limpiar() {
    setFecha('');
    setResultado('');
    consultar({ fecha: '', resultado: '' });
  }

  return (
    <section>
      <h2>Registro de accesos</h2>
      <p>
        Cada intento de acceso queda registrado con su fecha y hora. Los
        filtros son opcionales.
      </p>

      <form
        className="acciones"
        onSubmit={(e) => {
          e.preventDefault();
          aplicar();
        }}
      >
        <label htmlFor="a-fecha">Fecha:</label>
        <input
          id="a-fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />

        <label htmlFor="a-resultado">Resultado:</label>
        <select
          id="a-resultado"
          value={resultado}
          onChange={(e) => setResultado(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="autorizado">Autorizados</option>
          <option value="rechazado">Rechazados</option>
        </select>

        <button type="submit">Filtrar</button>
        <button type="button" className="accion" onClick={limpiar}>
          Limpiar filtros
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {consultado && accesos.length === 0 && !error && (
        <p className="aviso">
          No hay registros de acceso que coincidan con los filtros
          seleccionados.
        </p>
      )}

      {accesos.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Resultado</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {accesos.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.fecha}</td>
                <td>{a.hora}</td>
                <td>{a.cliente ? a.cliente.nombre : '—'}</td>
                <td>{a.resultado}</td>
                <td>{a.motivo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
