// T072 [Polish] Smoke test de SeguimientoPage (patrón LoginPage.test.jsx):
// objetivos y progresos con sus estados vacíos (HU4).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SeguimientoPage from './SeguimientoPage.jsx';

const sesion = vi.hoisted(() => ({
  valor: {
    token: 'token-de-prueba',
    usuario: { id: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' },
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ sesion: sesion.valor }),
}));

vi.mock('../services/seguimiento.api.js', () => ({
  crearObjetivo: vi.fn(),
  listarObjetivos: vi.fn(),
  modificarObjetivo: vi.fn(),
  crearProgreso: vi.fn(),
  listarProgresos: vi.fn(),
}));

import { listarObjetivos, listarProgresos } from '../services/seguimiento.api.js';

beforeEach(() => {
  listarObjetivos.mockReset();
  listarProgresos.mockReset();
});

describe('SeguimientoPage', () => {
  it('muestra ambos formularios y los estados vacíos de objetivos y progresos', async () => {
    listarObjetivos.mockResolvedValue([]);
    listarProgresos.mockResolvedValue([]);

    render(<SeguimientoPage />);

    expect(
      await screen.findByText('Seguimiento de objetivos y progresos')
    ).toBeTruthy();
    expect(screen.getByText('Aún no hay objetivos registrados.')).toBeTruthy();
    expect(screen.getByText('Aún no hay progresos registrados.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar objetivo' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Registrar progreso' })
    ).toBeTruthy();
  });
});
