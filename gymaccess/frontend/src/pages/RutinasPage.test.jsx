// T072 [Polish] Smoke test de RutinasPage (patrón LoginPage.test.jsx):
// el listado con su estado vacío para el administrador y la vista en
// solo lectura del recepcionista sin formulario (HU3, T032/T033).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RutinasPage from './RutinasPage.jsx';

const sesion = vi.hoisted(() => ({
  valor: {
    token: 'token-de-prueba',
    usuario: { id: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' },
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ sesion: sesion.valor }),
}));

vi.mock('../services/rutinas.api.js', () => ({
  listarRutinas: vi.fn(),
  crearRutina: vi.fn(),
  obtenerRutina: vi.fn(),
  modificarRutina: vi.fn(),
  cambiarEstadoRutina: vi.fn(),
}));

import { listarRutinas } from '../services/rutinas.api.js';

beforeEach(() => {
  sesion.valor = {
    token: 'token-de-prueba',
    usuario: { id: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' },
  };
  listarRutinas.mockReset();
});

describe('RutinasPage', () => {
  it('muestra el listado con su estado vacío y el formulario para el administrador', async () => {
    listarRutinas.mockResolvedValue([]);

    render(<RutinasPage />);

    expect(await screen.findByText('Rutinas de entrenamiento')).toBeTruthy();
    expect(
      screen.getByText('Aún no hay rutinas registradas para su carga.')
    ).toBeTruthy();
    expect(screen.getByLabelText(/ID del cliente/)).toBeTruthy();
  });

  it('el recepcionista consulta en solo lectura: sin formulario de escritura', async () => {
    sesion.valor = {
      token: 'token-de-prueba',
      usuario: { id: 2, nombre: 'Rita', email: 'r@g.test', rol: 'recepcionista' },
    };
    listarRutinas.mockResolvedValue([
      {
        id: 1,
        cliente_id: 10,
        cliente: 'Lucía',
        entrenador_id: 1,
        entrenador: 'Eva',
        nombre: 'Plan A',
        estado: 'activa',
      },
    ]);

    render(<RutinasPage />);

    expect(await screen.findByText('Plan A')).toBeTruthy();
    expect(screen.queryByLabelText(/ID del cliente/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });
});
