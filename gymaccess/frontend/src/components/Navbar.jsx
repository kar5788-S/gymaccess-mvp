// Navbar flotante en cápsula (refactor "Dark Fitness Luxury").
// Fijo y centrado, solo se muestra con sesión iniciada; los enlaces se
// derivan del registro de módulos según el rol (FR-003: el servidor
// vuelve a validar cada operación).

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MODULOS } from '../navigation/rutas.js';

// Iconos SVG mínimos (trazo 1.6, 20×20) para un look limpio y deportivo.
const ICONOS = {
  resumen: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
    </>
  ),
  clientes: (
    <>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M4 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </>
  ),
  membresias: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </>
  ),
  pagos: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M14.5 9.8c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.3 5 3.9 0 1.1-1.1 1.9-2.5 1.9-1.1 0-2-.4-2.5-1.2" />
    </>
  ),
  acceso: (
    <>
      <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3z" />
      <path d="M9.2 11.8l2 2 3.6-3.8" />
    </>
  ),
  entrenamiento: (
    <>
      <path d="M7 8v8M4 9.5v5M17 8v8M20 9.5v5M7 12h10" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="8.5" cy="7.5" r="2.8" />
      <circle cx="16" cy="8.5" r="2.2" />
      <path d="M3.5 19c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      <path d="M14.5 14.2c2.6.2 4.5 2.2 4.5 4.8" />
    </>
  ),
};

function Icono({ nombre }) {
  const trazos = ICONOS[nombre];
  if (!trazos) return null;
  return (
    <svg
      className="icono-nav"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {trazos}
    </svg>
  );
}

export default function Navbar() {
  const { sesion, cerrar } = useAuth();
  const navegar = useNavigate();

  // Fijo únicamente para usuarios autenticados.
  if (!sesion) return null;

  const enlaces = MODULOS.filter((m) => m.roles.includes(sesion.usuario.rol));

  function alCerrarSesion() {
    cerrar();
    navegar('/login', { replace: true });
  }

  return (
    <header className="navbar-flotante" aria-label="Navegación principal">
      <NavLink to="/" className="marca-nav" end>
        GYM<span>ACCESS</span>
      </NavLink>

      <nav className="nav-enlaces">
        {enlaces.map((m) => (
          <NavLink
            key={m.clave}
            to={m.ruta}
            className={({ isActive }) => (isActive ? 'enlace-nav activo' : 'enlace-nav')}
          >
            <Icono nombre={m.icono} />
            <span>{m.etiqueta}</span>
          </NavLink>
        ))}
      </nav>

      <button type="button" className="boton-salir" onClick={alCerrarSesion}>
        Cerrar sesión
      </button>
    </header>
  );
}
