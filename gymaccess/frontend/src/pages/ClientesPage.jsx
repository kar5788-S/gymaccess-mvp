// T041 [US4] Consulta de clientes con búsqueda (US4-1…US4-4).
// El servidor limita los campos según el rol: para el entrenador solo
// llegan nombre y contacto, por lo que la tabla no muestra nada más.

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { listarClientes } from '../services/clientes.api.js';

export default function ClientesPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function buscar(termino) {
    setError('');
    setMensaje('');
    try {
      const datos = await listarClientes(token, termino);
      setClientes(datos);
      if (datos.length === 0) {
        setMensaje('No se encontraron clientes con esa búsqueda.');
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    buscar('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function enviarBusqueda(evento) {
    evento.preventDefault();
    buscar(busqueda);
  }

  const conNotas = clientes.some((c) => c.notas !== undefined);

  return (
    <section>
      <h2>Consulta de clientes</h2>

      <form className="acciones" onSubmit={enviarBusqueda}>
        <input
          type="search"
          placeholder="Buscar por nombre, teléfono o correo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar clientes"
        />
        <button type="submit" className="accion">
          Buscar
        </button>
      </form>

      {mensaje && <p className="exito">{mensaje}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <table className="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre completo</th>
            <th>Teléfono</th>
            <th>Correo</th>
            {conNotas && <th>Notas</th>}
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.nombre_completo}</td>
              <td>{c.telefono || '—'}</td>
              <td>{c.correo || '—'}</td>
              {conNotas && <td>{c.notas || '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
