// T057 [US5] Registro de información facial (HU5): elegir cliente,
// capturar desde la cámara y guardar. Muestra si ya cuenta con información
// facial sin exponer ningún dato biométrico (FR-017).

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import CapturaFacial from '../components/camara/CapturaFacial.jsx';
import { listarClientes } from '../services/clientes.api.js';
import { estadoRostro, registrarRostro } from '../services/rostros.api.js';

export default function RegistrarRostroPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [infoRostro, setInfoRostro] = useState(null);
  const [descriptor, setDescriptor] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    listarClientes(token)
      .then(setClientes)
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function consultarRostro(id) {
    setInfoRostro(null);
    setDescriptor(null);
    setMensaje('');
    setError('');
    if (!id) return;
    try {
      const datos = await estadoRostro(token, id);
      setInfoRostro(datos);
    } catch (e) {
      setError(e.message);
    }
  }

  function cambiarCliente(id) {
    setClienteId(id);
    consultarRostro(id);
  }

  function alCapturar(descriptorPromedio) {
    setDescriptor(descriptorPromedio);
    setMensaje('Rostro identificado. Revise los datos y guarde el registro.');
    setError('');
  }

  async function guardar() {
    if (!clienteId || !descriptor) return;
    setGuardando(true);
    setMensaje('');
    setError('');
    try {
      const datos = await registrarRostro(token, clienteId, descriptor);
      setDescriptor(null);
      setInfoRostro({
        cliente_id: datos.cliente_id,
        registrado: true,
        fecha_registro: datos.fecha_registro,
        estado: datos.estado,
      });
      setMensaje('Información facial registrada correctamente.');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  const clienteSeleccionado = clientes.find((c) => String(c.id) === String(clienteId));

  return (
    <section>
      <h2>Registro de rostro</h2>

      <form className="formulario tarjeta">
        <label htmlFor="r-cliente">Cliente *</label>
        <select
          id="r-cliente"
          value={clienteId}
          onChange={(e) => cambiarCliente(e.target.value)}
        >
          <option value="">Seleccione un cliente</option>
          {clientes
            .filter((c) => c.estado !== 'inactivo')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_completo}
              </option>
            ))}
        </select>
        <small>
          Solo se registra información facial de clientes activos; nunca se
          guardan imágenes, únicamente el descriptor numérico.
        </small>
      </form>

      {infoRostro && (
        <p className={infoRostro.registrado ? 'aviso' : 'exito'}>
          {infoRostro.registrado
            ? `Este cliente ya cuenta con información facial (registrada el ${infoRostro.fecha_registro}). Una nueva captura la reemplazará.`
            : 'Este cliente todavía no tiene información facial registrada.'}
        </p>
      )}

      {clienteId && (
        <CapturaFacial onDescriptor={alCapturar} textoBoton="Capturar rostro" />
      )}

      {descriptor && (
        <div className="tarjeta">
          <p>
            Descriptor capturado: <strong>128 valores</strong> — listo para
            guardar.
          </p>
          <button type="button" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar información facial'}
          </button>
        </div>
      )}

      {mensaje && <p className="exito">{mensaje}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {clienteSeleccionado && (
        <p>Cliente seleccionado: {clienteSeleccionado.nombre_completo}</p>
      )}
    </section>
  );
}
