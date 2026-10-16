// T081 [US9] Contrato de la membresía propia del cliente (FR-024).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({
  clientes: [],
  membresias: [],
}));

vi.mock('../../src/models/cliente.model.js', () => ({
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
  findById: vi.fn(async (id) =>
    estado.clientes.find((c) => c.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async (usuarioId) =>
    estado.clientes.find((c) => c.usuario_id === Number(usuarioId)) ?? null
  ),
  findDuplicate: vi.fn(async () => null),
  listar: vi.fn(async () => estado.clientes),
}));

vi.mock('../../src/models/membresia.model.js', () => ({
  crear: vi.fn(async () => 1),
  findById: vi.fn(async () => null),
  findEnCursoPorCliente: vi.fn(async () => null),
  findVigentePorCliente: vi.fn(async (clienteId) => {
    const candidatas = estado.membresias
      .filter((x) => x.cliente_id === Number(clienteId))
      .sort((a, b) => b.id - a.id);
    const m = candidatas.find((x) => x.estado === 'activa') ?? candidatas[0];
    return m
      ? {
          ...m,
          tipo: m.tipo ?? 'Mensual',
          descripcion: m.descripcion ?? '30 días',
        }
      : null;
  }),
  listar: vi.fn(async () => estado.membresias),
  calcularAdeudoCliente: vi.fn(async () => 0),
  calcularAdeudoMembresia: vi.fn(async () => 0),
  actualizar: vi.fn(async () => true),
}));

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
}));

import app from '../../src/app.js';

const tokenCliente = () =>
  firmarToken({ sub: 9, nombre: 'Carl', email: 'c@g.test', rol: 'cliente' });
const tokenAdmin = () =>
  firmarToken({ sub: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 2, nombre: 'Ana', email: 'r@g.test', rol: 'recepcionista' });
const tokenEntrena = () =>
  firmarToken({ sub: 3, nombre: 'Eva', email: 'e@g.test', rol: 'entrenador' });

beforeEach(() => {
  estado.clientes = [
    { id: 1, nombre_completo: 'Carl López', usuario_id: 9, estado: 'activo' },
    { id: 2, nombre_completo: 'Sin Ficha', usuario_id: 8, estado: 'activo' },
  ];
  estado.membresias = [
    {
      id: 1,
      cliente_id: 1,
      tipo_membresia_id: 1,
      tipo: 'Mensual',
      descripcion: '30 días de acceso',
      fecha_inicio: '2026-10-14',
      fecha_vencimiento: '2026-11-13',
      estado: 'activa',
      precio: 150,
    },
  ];
});

describe('GET /api/clientes/mio/membresia', () => {
  it('devuelve tipo, fechas y estado de la membresía propia', async () => {
    const res = await request(app)
      .get('/api/clientes/mio/membresia')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toEqual({
      tipo: { id: 1, nombre: 'Mensual', descripcion: '30 días de acceso' },
      fecha_inicio: '2026-10-14',
      fecha_vencimiento: '2026-11-13',
      estado: 'activa',
    });
    // Solo lectura de estado y fechas: sin importes (FR-024).
    expect(JSON.stringify(res.body.datos)).not.toContain('precio');
    expect(JSON.stringify(res.body.datos)).not.toContain('saldo');
  });

  it('refleja el estado vencida cuando la fecha ya pasó', async () => {
    estado.membresias[0].estado = 'vencida';
    estado.membresias[0].fecha_vencimiento = '2026-09-13';

    const res = await request(app)
      .get('/api/clientes/mio/membresia')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({
      estado: 'vencida',
      fecha_vencimiento: '2026-09-13',
    });
  });

  it('responde 404 si el cliente no tiene membresía', async () => {
    estado.membresias = [];

    const res = await request(app)
      .get('/api/clientes/mio/membresia')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('NO_ENCONTRADO');
  });

  it('responde 404 si el usuario no tiene ficha de cliente', async () => {
    estado.clientes = [];
    const res = await request(app)
      .get('/api/clientes/mio/membresia')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(res.status).toBe(404);
  });

  it('responde 403 para administrador, recepcionista y entrenador', async () => {
    for (const token of [tokenAdmin(), tokenRecep(), tokenEntrena()]) {
      const res = await request(app)
        .get('/api/clientes/mio/membresia')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });

  it('responde 401 sin token', async () => {
    const res = await request(app).get('/api/clientes/mio/membresia');
    expect(res.status).toBe(401);
  });
});
