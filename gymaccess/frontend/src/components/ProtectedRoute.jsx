// Ruta protegida con react-router: exige sesión (redirige a /login) y,
// si se indican roles, muestra un aviso sin navegación interna — la
// autoridad real de autorización sigue siendo el servidor (FR-003).

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, children }) {
  const { sesion } = useAuth();

  if (!sesion) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(sesion.usuario.rol)) {
    return (
      <section className="tarjeta">
        <h2>Acceso restringido</h2>
        <p className="aviso" role="alert">
          No tiene permisos para acceder a esta sección.
        </p>
      </section>
    );
  }

  return children;
}
