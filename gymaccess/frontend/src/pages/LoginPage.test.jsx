// T050 [Pulido] Prueba de la página de login: muestra el mensaje de
// error de la API sin detalles internos (FR-002, US1-2).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

vi.mock('../services/auth.api.js', () => ({
  iniciarSesion: vi.fn(),
}));

import { iniciarSesion } from '../services/auth.api.js';

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  iniciarSesion.mockReset();
});

describe('LoginPage', () => {
  it('muestra el mensaje de error devuelto por la API', async () => {
    iniciarSesion.mockRejectedValue(
      Object.assign(new Error('Correo o contraseña incorrectos.'), {
        codigo: 'CREDENCIALES_INVALIDAS',
      })
    );

    renderLogin();

    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'admin@gimnasio.test' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Mala12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Correo o contraseña incorrectos.'
      );
    });
    expect(iniciarSesion).toHaveBeenCalledWith(
      'admin@gimnasio.test',
      'Mala12345'
    );
  });

  it('guarda la sesión en localStorage al iniciar correctamente', async () => {
    iniciarSesion.mockResolvedValue({
      token: 'token-de-prueba',
      usuario: { id: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Correo'), {
      target: { value: 'admin@gimnasio.test' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Admin1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(localStorage.getItem('gym_sesion')).toContain('token-de-prueba');
    });
  });
});
