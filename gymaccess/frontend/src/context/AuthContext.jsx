// T019 [US1] Contexto de sesión: guarda token y usuario (R-06).

import { createContext, useContext, useEffect, useState } from 'react';

const ContextoSesion = createContext(null);
const CLAVE_SESION = 'gym_sesion';

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_SESION);
      if (guardada) setSesion(JSON.parse(guardada));
    } catch {
      localStorage.removeItem(CLAVE_SESION);
    }
    setCargando(false);
  }, []);

  const iniciar = (token, usuario) => {
    const nueva = { token, usuario };
    setSesion(nueva);
    localStorage.setItem(CLAVE_SESION, JSON.stringify(nueva));
  };

  const cerrar = () => {
    setSesion(null);
    localStorage.removeItem(CLAVE_SESION);
  };

  return (
    <ContextoSesion.Provider value={{ sesion, cargando, iniciar, cerrar }}>
      {children}
    </ContextoSesion.Provider>
  );
}

export function useAuth() {
  return useContext(ContextoSesion);
}
