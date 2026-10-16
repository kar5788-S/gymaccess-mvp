// T046/T073/T080 [US5/US7/US8] Consulta de lo propio del cliente:
// ficha (FR-010), pagos, adeudos y historial de accesos (HU8-3).
// Nunca expone datos de terceros (R-27) ni descriptores (FR-017).

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { miInformacion } from '../services/clientes.api.js';
import { listarMisAdeudos, listarMisPagos } from '../services/pagos.api.js';
import { listarMisAccesos } from '../services/accesos.api.js';

export default function MiInformacionPage() {
  const { sesion } = useAuth();
  const token = sesion.token;

  const [ficha, setFicha] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [adeudos, setAdeudos] = useState([]);
  const [accesos, setAccesos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    Promise.all([
      miInformacion(token),
      listarMisPagos(token),
      listarMisAdeudos(token),
      listarMisAccesos(token),
    ])
      .then(([datosFicha, datosPagos, datosAdeudos, datosAccesos]) => {
        if (!activo) return;
        setFicha(datosFicha);
        setPagos(datosPagos);
        setAdeudos(datosAdeudos);
        setAccesos(datosAccesos);
      })
      .catch((e) => {
        if (activo) setError(e.message);
      });
    return () => {
      activo = false;
    };
  }, [token]);

  if (error) {
    return (
      <section>
        <h2>Mi información</h2>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!ficha) {
    return (
      <section>
        <h2>Mi información</h2>
        <p>Cargando…</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Mi información</h2>

      <div className="tarjeta">
        <p>
          <strong>Nombre completo:</strong> {ficha.nombre_completo}
        </p>
        <p>
          <strong>Teléfono:</strong> {ficha.telefono || '—'}
        </p>
        <p>
          <strong>Correo:</strong> {ficha.correo || '—'}
        </p>
        {ficha.notas && (
          <p>
            <strong>Notas:</strong> {ficha.notas}
          </p>
        )}
      </div>

      <h3>Mi saldo pendiente</h3>
      {adeudos.length === 0 ? (
        <p className="exito">No tiene adeudos pendientes. ✅</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Membresía</th>
              <th>Precio</th>
              <th>Pagado</th>
              <th>Saldo pendiente</th>
            </tr>
          </thead>
          <tbody>
            {adeudos.map((a) => (
              <tr key={a.membresia_id}>
                <td>
                  {a.membresia_id} · {a.cliente}
                </td>
                <td>${Number(a.precio).toFixed(2)}</td>
                <td>${Number(a.pagado).toFixed(2)}</td>
                <td>${Number(a.saldo_pendiente).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Mis pagos</h3>
      {pagos.length === 0 ? (
        <p>Todavía no registra pagos.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Membresía</th>
              <th>Monto</th>
              <th>Método</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id}>
                <td>{p.fecha_pago}</td>
                <td>
                  {p.membresia.id} · {p.membresia.tipo}
                </td>
                <td>${Number(p.monto).toFixed(2)}</td>
                <td>{p.metodo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Mis accesos recientes</h3>
      {accesos.length === 0 ? (
        <p>No registra intentos de acceso todavía.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Resultado</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {accesos.map((a) => (
              <tr key={a.id}>
                <td>{a.fecha}</td>
                <td>{a.hora}</td>
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
