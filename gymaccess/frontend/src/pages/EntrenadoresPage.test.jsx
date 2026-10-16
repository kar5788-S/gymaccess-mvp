// T072 [Polish] Smoke test de EntrenadoresPage (patrón LoginPage.test.jsx):
// el personal con su conteo de carga para administrador y recepcionista
// (este en solo lectura), y la vista propia del entrenador con estado
// vacío "carga 0" (HU7, T066/T067).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EntrenadoresPage from './EntrenadoresPage.jsx';

const sesion = vi.hoisted(() => ({
  valor: {
    token: 'token-de-prueba',
    usuario: { id: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' },
  },
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ sesion: sesion.valor }),
}));

vi.mock('../services/entrenadores.api.js', () => ({
  crearEntrenador: vi.fn(),
  listarConCarga: vi.fn(),
  modificarEntrenador: vi.fn(),
  obtenerConClientes: vi.fn(),
  obtenerMiCarga: vi.fn(),
}));

import {
  listarConCarga,
  obtenerConClientes,
  obtenerMiCarga,
} from '../services/entrenadores.api.js';

function sesionCon(rol) {
  sesion.valor = {
    token: 'token-de-prueba',
    usuario: { id: 10, nombre: 'Persona', email: 'p@g.test', rol },
  };
}

beforeEach(() => {
  sesionCon('administrador');
  listarConCarga.mockReset();
  obtenerConClientes.mockReset();
  obtenerMiCarga.mockReset();
});

describe('EntrenadoresPage', () => {
  it('lista el personal para el administrador con estado vacío y formulario de alta', async () => {
    listarConCarga.mockResolvedValue([]);

    render(<EntrenadoresPage />);

    expect(await screen.findByText('Personal de entrenadores')).toBeTruthy();
    expect(screen.getByText('Aún no hay entrenadores registrados.')).toBeTruthy();
    expect(screen.getByLabelText(/ID de la cuenta/)).toBeTruthy();
  });

  it('muestra la columna de clientes a cargo con el conteo', async () => {
    listarConCarga.mockResolvedValue([
      {
        id: 1,
        usuario_id: 9,
        nombre: 'Eva Fuerza',
        telefono: '999111222',
        especialidad: 'Fuerza',
        estado: 'activo',
        usuario: { id: 9, email: 'eva@g.test', rol: 'entrenador' },
        clientes_asignados: 3,
      },
    ]);

    render(<EntrenadoresPage />);

    expect(await screen.findByText('Eva Fuerza')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver carga' })).toBeTruthy();
  });

  it('el recepcionista consulta en solo lectura: sin formulario ni edición', async () => {
    sesionCon('recepcionista');
    listarConCarga.mockResolvedValue([
      {
        id: 1,
        usuario_id: 9,
        nombre: 'Eva Fuerza',
        telefono: null,
        especialidad: null,
        estado: 'activo',
        usuario: { id: 9, email: 'eva@g.test', rol: 'entrenador' },
        clientes_asignados: 1,
      },
    ]);

    render(<EntrenadoresPage />);

    expect(await screen.findByText('Eva Fuerza')).toBeTruthy();
    expect(screen.queryByLabelText(/ID de la cuenta/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver carga' })).toBeTruthy();
  });

  it('el entrenador abre su carga con estado vacío "carga 0" y sin listado general', async () => {
    sesionCon('entrenador');
    obtenerMiCarga.mockResolvedValue([]);

    render(<EntrenadoresPage />);

    expect(await screen.findByText('Mi carga')).toBeTruthy();
    expect(screen.getByText(/carga 0/)).toBeTruthy();
    expect(listarConCarga).not.toHaveBeenCalled();
  });
});
