// T072 [Polish] Smoke test de AsignacionesPage (patrón LoginPage.test.jsx):
// el listado de asignaciones con su estado vacío (HU2).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AsignacionesPage from './AsignacionesPage.jsx';

const sesion = vi.hoisted(() => ({
  valor: {
    token: 'token-de-prueba',
    usuario: { id: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' },
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ sesion: sesion.valor }),
}));

vi.mock('../services/asignaciones.api.js', () => ({
  listarAsignaciones: vi.fn(),
  crearAsignacion: vi.fn(),
  cerrarAsignacion: vi.fn(),
}));

import { listarAsignaciones } from '../services/asignaciones.api.js';

beforeEach(() => {
  listarAsignaciones.mockReset();
});

describe('AsignacionesPage', () => {
  it('muestra el listado con su estado vacío cuando no hay asignaciones', async () => {
    listarAsignaciones.mockResolvedValue([]);

    render(<AsignacionesPage />);

    expect(await screen.findByText('Asignaciones de entrenador')).toBeTruthy();
    expect(
      screen.getByText('Aún no hay asignaciones registradas.')
    ).toBeTruthy();
    expect(listarAsignaciones).toHaveBeenCalled();
  });
});
