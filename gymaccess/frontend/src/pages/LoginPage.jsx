// T020 [US1] Página de inicio de sesión (US1-1, US1-2).
// Muestra un mensaje de error claro sin detalles internos (FR-002).
// Rediseño "Dark Fitness Luxury": split-screen 50/50 con hero
// minimalista a la izquierda y el formulario a la derecha.

import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { iniciarSesion } from '../services/auth.api.js';

export default function LoginPage() {
  const { iniciar } = useAuth();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const datos = await iniciarSesion(email, contrasena);
      iniciar(datos.token, datos.usuario);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-login">
      {/* Lado izquierdo: hero minimalista del producto. */}
      <aside className="login-hero" aria-hidden="true">
        <div className="login-hero-contenido">
          <p className="login-hero-marca">
            GYM<span>ACCESS</span>
          </p>
          <h2 className="login-hero-titulo">Controla quién entra, sin filas</h2>
          <p className="login-hero-texto">
            Acceso por reconocimiento facial, membresías al día y control
            operativo del gimnasio en un solo lugar.
          </p>
          <ul className="login-hero-lista">
            <li>
              <span className="login-hero-punto" />
              Reconocimiento facial en tiempo real
            </li>
            <li>
              <span className="login-hero-punto" />
              Membresías y pagos siempre visibles
            </li>
            <li>
              <span className="login-hero-punto" />
              Entrenadores, rutinas y seguimiento
            </li>
          </ul>
        </div>
      </aside>

      {/* Lado derecho: formulario centrado sobre fondo oscuro traslúcido. */}
      <main className="login-panel">
        <form className="tarjeta login-formulario" onSubmit={enviar}>
          <h1>Sistema de Gestión para Gimnasio</h1>
          <p className="subtitulo">Inicie sesión para continuar</p>

          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </main>
    </div>
  );
}
