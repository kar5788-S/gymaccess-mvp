// T072 [Polish] Smoke test de DashboardPage (patrón LoginPage.test.jsx):
// tarjetas del administrador con su estado vacío y panel reducido del
// entrenador SIN cifras financieras (HU6, clarify Q1, T060).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './DashboardPage.jsx';

const sesion = vi.hoisted(() => ({
  valor: {
    token: 'token-de-prueba',
    usuario: { id: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' },
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ sesion: sesion.valor }),
}));

vi.mock('../services/dashboard.api.js', () => ({
  obtenerDashboard: vi.fn(),
  obtenerMiDashboard: vi.fn(),
}));

import { obtenerDashboard, obtenerMiDashboard } from '../services/dashboard.api.js';

const cerosAdmin = {
  clientes_total: 0,
  clientes_activos: 0,
  membresias_activas: 0,
  membresias_vencidas: 0,
  ingresos_periodo: 0,
  pagos_periodo: 0,
  accesos_autorizados: 0,
  accesos_rechazados: 0,
  entrenadores_activos: 0,
  clientes_con_entrenador: 0,
  rutinas_activas: 0,
  objetivos_en_curso: 0,
  objetivos_cumplidos: 0,
  progresos_recientes: 0,
};

beforeEach(() => {
  sesion.valor = {
    token: 'token-de-prueba',
    usuario: { id: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' },
  };
  obtenerDashboard.mockReset();
  obtenerMiDashboard.mockReset();
});

describe('DashboardPage', () => {
  it('muestra las tarjetas del administrador y su estado vacío en cero', async () => {
    obtenerDashboard.mockResolvedValue({ periodo: 'mes', indicadores: cerosAdmin });

    render(<DashboardPage />);

    expect(await screen.findByText('Dashboard administrativo')).toBeTruthy();
    expect(screen.getByText('Clientes totales')).toBeTruthy();
    expect(screen.getByText('Ingresos del periodo')).toBeTruthy();
    expect(
      screen.getByText('Aún no hay actividad registrada que mostrar en este periodo.')
    ).toBeTruthy();
    expect(obtenerDashboard).toHaveBeenCalledWith('token-de-prueba', 'mes');
    expect(obtenerMiDashboard).not.toHaveBeenCalled();
  });

  it('el entrenador ve su panel reducido sin cifras financieras', async () => {
    sesion.valor = {
      token: 'token-de-prueba',
      usuario: { id: 102, nombre: 'Eva', email: 'eva@g.test', rol: 'entrenador' },
    };
    obtenerMiDashboard.mockResolvedValue({
      periodo: 'mes',
      indicadores: {
        clientes_carga: 0,
        rutinas_activas: 0,
        objetivos_en_curso: 0,
        objetivos_cumplidos: 0,
        progresos_recientes: 0,
      },
    });

    render(<DashboardPage />);

    expect(await screen.findByText('Panel de mi carga')).toBeTruthy();
    expect(screen.getByText('Clientes en mi carga')).toBeTruthy();
    expect(screen.queryByText('Ingresos del periodo')).toBeNull();
    expect(screen.queryByText('Pagos del periodo')).toBeNull();
    expect(obtenerDashboard).not.toHaveBeenCalled();
  });
});
