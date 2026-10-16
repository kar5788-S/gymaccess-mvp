// T037 [US4] Contrato de consulta de clientes: proyección por rol
// (FR-009, Q2), búsqueda ?q= y denegación al rol cliente (FR-010).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const BASE = [
  {
    id: 1,
    nombre_completo: 'Laura Gómez',
    telefono: '555-1111',
    correo: 'laura@g.test',
    notas: 'Nota sensible de Laura',
    usuario_id: null,
  },
  {
    id: 2,
    nombre_completo: 'Pedro Sol',
    telefono: '555-3333',
    correo: 'pedro@g.test',
    notas: 'Nota sensible de Pedro',
    usuario_id: null,
  },
];

const estado = vi.hoisted(() => ({ clientes: [] }));

function aplicarFiltro(clientes, { q, campos } = {}) {
  let resultado = clientes;
  if (q) {
    const v = q.toLowerCase();
    resultado = resultado.filter(
      (c) =>
        (c.nombre_completo || '').toLowerCase().includes(v) ||
        (c.telefono || '').includes(q) ||
        (c.correo || '').toLowerCase().includes(v)
    );
  }
  if (campos && campos.length) {
    resultado = resultado.map((c) => {
      const copia = {};
      for (const k of campos) copia[k] = c[k];
      return copia;
    });
  }
  return resultado;
}

vi.mock('../../src/models/cliente.model.js', () => ({
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
  findById: vi.fn(async (id) => {
    const c = estado.clientes.find((x) => x.id === Number(id));
    return c ? { ...c } : null;
  }),
  findByUsuarioId: vi.fn(async () => null),
  findDuplicate: vi.fn(async () => null),
  listar: vi.fn(async (opciones = {}) =>
    aplicarFiltro(estado.clientes, opciones)
  ),
}));

vi.mock('../../src/models/usuario.model.js', () => ({
  findByEmail: vi.fn(async () => null),
  findById: vi.fn(async () => null),
  listar: vi.fn(async () => []),
  crear: vi.fn(),
  actualizar: vi.fn(),
  actualizarIntentos: vi.fn(),
  limpiarBloqueo: vi.fn(),
}));

import app from '../../src/app.js';

const token = (rol) =>
  firmarToken({ sub: 10, nombre: 'U', email: `${rol}@g.test`, rol });

beforeEach(() => {
  estado.clientes = BASE.map((c) => ({ ...c }));
});

describe('GET /api/clientes', () => {
  it('admin y recepcionista reciben la ficha completa', async () => {
    for (const rol of ['administrador', 'recepcionista']) {
      const res = await request(app)
        .get('/api/clientes')
        .set('Authorization', `Bearer ${token(rol)}`);

      expect(res.status).toBe(200);
      expect(res.body.datos).toHaveLength(2);
      expect(res.body.datos[0]).toHaveProperty('notas');
    }
  });

  it('entrenador recibe únicamente nombre y contacto (Q2, FR-009)', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token('entrenador')}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(2);
    for (const cliente of res.body.datos) {
      expect(Object.keys(cliente).sort()).toEqual([
        'correo',
        'id',
        'nombre_completo',
        'telefono',
      ]);
      expect(cliente).not.toHaveProperty('notas');
    }
  });

  it('filtra por nombre o contacto con ?q=', async () => {
    const res = await request(app)
      .get('/api/clientes?q=Pedro')
      .set('Authorization', `Bearer ${token('administrador')}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0].nombre_completo).toBe('Pedro Sol');
  });

  it('sin coincidencias devuelve lista vacía con mensaje claro (no error)', async () => {
    const res = await request(app)
      .get('/api/clientes?q=zzz-no-existe')
      .set('Authorization', `Bearer ${token('recepcionista')}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.datos).toEqual([]);
  });

  it('rol cliente recibe 403 en la lista', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token('cliente')}`);

    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('SIN_PERMISO');
  });
});

describe('GET /api/clientes/:id', () => {
  it('devuelve la ficha a los roles autorizados', async () => {
    const res = await request(app)
      .get('/api/clientes/1')
      .set('Authorization', `Bearer ${token('administrador')}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({ nombre_completo: 'Laura Gómez' });
  });

  it('entrenador ve solo nombre y contacto en el detalle', async () => {
    const res = await request(app)
      .get('/api/clientes/1')
      .set('Authorization', `Bearer ${token('entrenador')}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).not.toHaveProperty('notas');
  });

  it('un cliente autenticado recibe 403 al consultar a terceros (US5-2)', async () => {
    const res = await request(app)
      .get('/api/clientes/1')
      .set('Authorization', `Bearer ${token('cliente')}`);

    expect(res.status).toBe(403);
  });

  it('responde 404 si no existe', async () => {
    const res = await request(app)
      .get('/api/clientes/999')
      .set('Authorization', `Bearer ${token('administrador')}`);

    expect(res.status).toBe(404);
  });
});
