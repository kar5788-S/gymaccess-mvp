// T043 [US5] Contrato de consulta de la información propia:
// GET /api/clientes/mio devuelve solo la ficha del cliente de la sesión
// (FR-010, US5-1, US5-2).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({ clientes: [] }));

vi.mock('../../src/models/cliente.model.js', () => ({
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
  findById: vi.fn(async (id) =>
    estado.clientes.find((c) => c.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async (usuarioId) => {
    const c = estado.clientes.find((x) => x.usuario_id === Number(usuarioId));
    return c ? { ...c } : null;
  }),
  findDuplicate: vi.fn(async () => null),
  listar: vi.fn(async () => estado.clientes),
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

const tokenCliente = (sub = 4) =>
  firmarToken({ sub, nombre: 'Carl', email: 'c@g.test', rol: 'cliente' });
const tokenAdmin = () =>
  firmarToken({ sub: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' });

beforeEach(() => {
  estado.clientes = [
    {
      id: 10,
      nombre_completo: 'Carl Cliente',
      telefono: '555-7777',
      correo: 'carl@g.test',
      notas: 'Ficha propia',
      usuario_id: 4,
    },
    {
      id: 11,
      nombre_completo: 'Otro Cliente',
      telefono: '555-8888',
      correo: 'otro@g.test',
      notas: 'Ficha ajena',
      usuario_id: 99,
    },
  ];
});

describe('GET /api/clientes/mio', () => {
  it('devuelve únicamente la ficha propia del cliente autenticado', async () => {
    const res = await request(app)
      .get('/api/clientes/mio')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({
      id: 10,
      nombre_completo: 'Carl Cliente',
      usuario_id: 4,
    });
    expect(res.body.datos.id).not.toBe(11);
  });

  it('responde 404 con mensaje claro si no hay ficha vinculada', async () => {
    const res = await request(app)
      .get('/api/clientes/mio')
      .set('Authorization', `Bearer ${tokenCliente(555)}`);

    expect(res.status).toBe(404);
    expect(res.body.error.mensaje).toContain('ficha de cliente vinculada');
  });

  it('no resuelve como /:id: la ruta /mio tiene precedencia', async () => {
    // Si /mio cayera en /:id, el rol cliente recibiría 403 en lugar de 200.
    const res = await request(app)
      .get('/api/clientes/mio')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(200);
  });

  it('otros roles reciben 403 en /mio', async () => {
    const res = await request(app)
      .get('/api/clientes/mio')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(403);
  });

  it('el cliente no puede consultar fichas de terceros (US5-2)', async () => {
    const res = await request(app)
      .get('/api/clientes/11')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('Ficha ajena');
  });
});
