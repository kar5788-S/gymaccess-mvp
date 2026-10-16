// Barra de secciones del módulo: pestañas secundarias bajo el navbar.
// Se muestra solo cuando el módulo activo tiene más de una subvista
// permitida para el rol; así el navbar principal se mantiene limpio.

import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SUBVISTAS } from '../navigation/rutas.js';

export default function BarraModulo() {
  const { sesion } = useAuth();
  const { pathname } = useLocation();

  if (!sesion) return null;

  const clave = Object.keys(SUBVISTAS).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`)
  );
  if (!clave) return null;

  const secciones = SUBVISTAS[clave].filter((s) =>
    s.roles.includes(sesion.usuario.rol)
  );
  if (secciones.length < 2) return null;

  return (
    <nav className="barra-modulo" aria-label="Secciones del módulo">
      {secciones.map((s) => (
        <NavLink
          key={s.ruta}
          to={s.ruta}
          end
          className={({ isActive }) => (isActive ? 'subenlace activo' : 'subenlace')}
        >
          {s.etiqueta}
        </NavLink>
      ))}
    </nav>
  );
}
