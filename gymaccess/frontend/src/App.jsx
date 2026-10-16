// Componente raíz (refactor "Dark Fitness Luxury"): rutas independientes
// por módulo con react-router, navbar flotante solo con sesión activa y
// guarda de rol en el cliente como complemento — la autoridad real de
// autorización sigue siendo el servidor (FR-003).

import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import BarraModulo from './components/BarraModulo.jsx';
import LoginPage from './pages/LoginPage.jsx';
import UsuariosPage from './pages/UsuariosPage.jsx';
import ClienteFormPage from './pages/ClienteFormPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import MiInformacionPage from './pages/MiInformacionPage.jsx';
import TiposMembresiaPage from './pages/TiposMembresiaPage.jsx';
import MembresiasPage from './pages/MembresiasPage.jsx';
import PagosPage from './pages/PagosPage.jsx';
import RegistrarRostroPage from './pages/RegistrarRostroPage.jsx';
import AccesoPage from './pages/AccesoPage.jsx';
import AccesosPage from './pages/AccesosPage.jsx';
import MiMembresiaPage from './pages/MiMembresiaPage.jsx';
import EntrenadoresPage from './pages/EntrenadoresPage.jsx';
import AsignacionesPage from './pages/AsignacionesPage.jsx';
import RutinasPage from './pages/RutinasPage.jsx';
import SeguimientoPage from './pages/SeguimientoPage.jsx';
import MiRutinaPage from './pages/MiRutinaPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { MODULOS } from './navigation/rutas.js';

// Acceso rápido a los módulos permitidos tras iniciar sesión.
function Bienvenida() {
  const { sesion } = useAuth();
  const accesos = MODULOS.filter((m) => m.roles.includes(sesion.usuario.rol));

  return (
    <section className="tarjeta">
      <h2>Bienvenido, {sesion.usuario.nombre}</h2>
      <p>
        Seleccione un módulo para comenzar. Las funciones disponibles dependen
        de su rol: <strong>{sesion.usuario.rol}</strong>.
      </p>
      <div className="acceso-rapido">
        {accesos.map((m) => (
          <NavLink key={m.clave} to={m.ruta} className="enlace-rapido">
            {m.etiqueta}
          </NavLink>
        ))}
      </div>
    </section>
  );
}

// /training: el entrenador entra a SU carga; el resto ve la gestión.
function VistaTraining() {
  const { sesion } = useAuth();
  if (sesion.usuario.rol === 'entrenador') {
    return <Navigate to="/training/mi-carga" replace />;
  }
  return <EntrenadoresPage />;
}

// /login solo se muestra sin sesión; con sesión se vuelve al inicio.
function RutaLogin() {
  const { sesion } = useAuth();
  if (sesion) return <Navigate to="/" replace />;
  return <LoginPage />;
}

function Aplicacion() {
  const { sesion, cargando } = useAuth();

  if (cargando) {
    return <div className="cargando-sesion">Cargando sesión…</div>;
  }

  return (
    <div className="aplicacion">
      {sesion && <Navbar />}
      <main className="contenido">
        {sesion && <BarraModulo />}
        <Routes>
          <Route path="/login" element={<RutaLogin />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Bienvenida />
              </ProtectedRoute>
            }
          />

          {/* Módulo: resumen operativo, estadísticas y KPIs */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['administrador', 'entrenador']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Módulo: registro y consulta de clientes */}
          <Route
            path="/clients"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista', 'entrenador']}>
                <ClientesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/registro"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista']}>
                <ClienteFormPage />
              </ProtectedRoute>
            }
          />

          {/* Módulo: tipos de membresías, asignación y renovación */}
          <Route
            path="/memberships"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista']}>
                <MembresiasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/memberships/tipos"
            element={
              <ProtectedRoute roles={['administrador']}>
                <TiposMembresiaPage />
              </ProtectedRoute>
            }
          />

          {/* Módulo: registro e historial de pagos */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista']}>
                <PagosPage />
              </ProtectedRoute>
            }
          />

          {/* Módulo: reconocimiento facial y control de acceso */}
          <Route
            path="/access"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista']}>
                <AccesoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/access/registro"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista', 'entrenador']}>
                <AccesosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/access/rostro"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista']}>
                <RegistrarRostroPage />
              </ProtectedRoute>
            }
          />

          {/* Módulo: entrenadores, asignaciones y rutinas */}
          <Route
            path="/training"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista', 'entrenador']}>
                <VistaTraining />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training/mi-carga"
            element={
              <ProtectedRoute roles={['entrenador']}>
                <EntrenadoresPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training/asignaciones"
            element={
              <ProtectedRoute roles={['administrador', 'recepcionista']}>
                <AsignacionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training/rutinas"
            element={
              <ProtectedRoute roles={['administrador', 'entrenador', 'recepcionista']}>
                <RutinasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training/seguimiento"
            element={
              <ProtectedRoute roles={['administrador', 'entrenador']}>
                <SeguimientoPage />
              </ProtectedRoute>
            }
          />

          {/* Administración: usuarios del sistema */}
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['administrador']}>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />

          {/* Módulo del cliente: consultas propias en solo lectura */}
          <Route
            path="/me/membership"
            element={
              <ProtectedRoute roles={['cliente']}>
                <MiMembresiaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/me/routine"
            element={
              <ProtectedRoute roles={['cliente']}>
                <MiRutinaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/me/info"
            element={
              <ProtectedRoute roles={['cliente']}>
                <MiInformacionPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Aplicacion />
      </AuthProvider>
    </BrowserRouter>
  );
}
