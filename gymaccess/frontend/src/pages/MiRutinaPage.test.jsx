// T072 [Polish] Smoke test de MiRutinaPage (patrón LoginPage.test.jsx):
// el cliente ve su rutina activa con ejercicios o el estado vacío con
// mensaje claro, junto a sus objetivos y evolución (HU5, FR-015).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MiRutinaPage from './MiRutinaPage.jsx';

const sesion = vi.hoisted(() => ({
  valor: {
    token: 'token-de-prueba',
    usuario: { id: 50, nombre: 'Clara', email: 'c@g.test', rol: 'cliente' },
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ sesion: sesion.valor }),
}));

vi.mock('../services/clientes.api.js', () => ({
  obtenerMiRutina: vi.fn(),
  obtenerMiProgreso: vi.fn(),
}));

import { obtenerMiRutina, obtenerMiProgreso } from '../services/clientes.api.js';

beforeEach(() => {
  obtenerMiRutina.mockReset();
  obtenerMiProgreso.mockReset();
});

describe('MiRutinaPage', () => {
  it('muestra el estado vacío con mensaje claro cuando no hay rutina activa', async () => {
    obtenerMiRutina.mockResolvedValue({
      rutina: null,
      mensaje: 'Aún no tiene una rutina activa asignada.',
    });
    obtenerMiProgreso.mockResolvedValue({ objetivos: [], progresos: [] });

    render(<MiRutinaPage />);

    expect(await screen.findByText('Mi rutina')).toBeTruthy();
    expect(
      screen.getByText('Aún no tiene una rutina activa asignada.')
    ).toBeTruthy();
    expect(screen.getByText('Aún no tiene objetivos registrados.')).toBeTruthy();
    expect(screen.getByText('Aún no tiene progresos registrados.')).toBeTruthy();
  });

  it('pinta la rutina activa con su entrenador y sus ejercicios', async () => {
    obtenerMiRutina.mockResolvedValue({
      rutina: {
        id: 1,
        nombre: 'Plan de fuerza',
        estado: 'activa',
        entrenador: 'Eva Fuerza',
        ejercicios: [
          {
            id: 1,
            orden: 1,
            nombre: 'Press de banca',
            series: 4,
            repeticiones: 8,
            instrucciones: null,
          },
        ],
      },
    });
    obtenerMiProgreso.mockResolvedValue({ objetivos: [], progresos: [] });

    render(<MiRutinaPage />);

    expect(await screen.findByText('Plan de fuerza')).toBeTruthy();
    expect(screen.getByText('Eva Fuerza')).toBeTruthy();
    expect(screen.getByText('Press de banca')).toBeTruthy();
    expect(screen.getByText('Aún no tiene progresos registrados.')).toBeTruthy();
  });
});
