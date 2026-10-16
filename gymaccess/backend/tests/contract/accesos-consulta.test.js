// T075 [US8] Contrato de consulta de accesos (HU8, contracts/api.md).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({ clientes: [], accesos: [] }));

vi.mock('../../src/models/acceso.model.js', () => ({
  MOTIVOS_PERMITIDOS: [
    'membresia_vencida',
    'membresia_suspendida',
    'membresia_cancelada',
    'sin_membresia',
    'rostro_no_identificado',
  ],
  crear: vi.fn(async () => 1),
  listar: vi.fn(async ({ fecha, resultado, cliente_id } = {}) => {
    let filas = estado.accesos;
    if (fecha) filas = filas.filter((a) => a.fecha === fecha);
    if (resultado) filas = filas.filter((a) => a.resultado === resultado);
    if (cliente_id) filas = filas.filter((a) => a.cliente_id === Number(cliente_id));
    return filas.map((a) => ({
      ...a,
      cliente:
        estado.clientes.find((c) => c.id === a.cliente_id)?.nombre_completo ??
        null,
    }));
  }),
  contarHoy: vi.fn(async () => estado.accesos.length),
}));

vi.mock('../../src/models/cliente.model.js', () => ({
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
  findById: vi.fn(async () => null),
  findByUsuarioId: vi.fn(async (usuarioId) =>
    estado.clientes.find((c) => c.usuario_id === Number(usuarioId)) ?? null
  ),
  findDuplicate: vi.fn(async () => null),
  listar: vi.fn(async () => estado.clientes),
}));

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 2, nombre: 'Ana', email: 'r@g.test', rol: 'recepcionista' });
const tokenEntrena = () =>
  firmarToken({ sub: 3, nombre: 'Eva', email: 'e@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 9, nombre: 'Carl', email: 'c@g.test', rol: 'cliente' });

beforeEach(() => {
  estado.clientes = [
    { id: 1, nombre_completo: 'Lucía Torres', usuario_id: null, estado: 'activo' },
    { id: 2, nombre_completo: 'Carl López', usuario_id: 9, estado: 'activo' },
  ];
  estado.accesos = [
    { id: 1, cliente_id: 1, resultado: 'autorizado', motivo_rechazo: null, fecha: '2026-10-14', hora: '08:05:00' },
    { id: 2, cliente_id: 1, resultado: 'rechazado', motivo_rechazo: 'membresia_vencida', fecha: '2026-10-14', hora: '19:40:00' },
    { id: 3, cliente_id: 2, resultado: 'autorizado', motivo_rechazo: null, fecha: '2026-10-15', hora: '07:10:00' },
    { id: 4, cliente_id: null, resultado: 'rechazado', motivo_rechazo: 'rostro_no_identificado', fecha: '2026-10-15', hora: '20:00:00' },
  ];
});

describe('GET /api/accesos', () => {
  it('devuelve el historial completo a administrador y recepcionista', async () => {
    for (const token of [tokenAdmin(), tokenRecep()]) {
      const res = await request(app)
        .get('/api/accesos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.datos).toHaveLength(4);
    }
  });

  it('filtra por fecha', async () => {
    const res = await request(app)
      .get('/api/accesos?fecha=2026-10-14')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(2);
    expect(res.body.datos.every((a) => a.fecha === '2026-10-14')).toBe(true);
  });

  it('filtra por resultado', async () => {
    const res = await request(app)
      .get('/api/accesos?resultado=rechazado')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(2);
    expect(res.body.datos.every((a) => a.resultado === 'rechazado')).toBe(true);
    expect(res.body.datos.map((a) => a.motivo)).toContain('membresia_vencida');
  });

  it('el entrenador consulta la asistencia con cliente, fechas y resultado (HU8-2)', async () => {
    const res = await request(app)
      .get('/api/accesos')
      .set('Authorization', `Bearer ${tokenEntrena()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(4);
    for (const fila of res.body.datos) {
      expect(fila).toHaveProperty('fecha');
      expect(fila).toHaveProperty('hora');
      expect(fila).toHaveProperty('resultado');
      expect(fila).toHaveProperty('cliente');
    }
  });

  it('lista vacía con 200 no es error (HU8-4)', async () => {
    estado.accesos = [];
    const res = await request(app)
      .get('/api/accesos?fecha=2026-01-01')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toEqual([]);
  });

  it('responde 403 para cliente (debe usar /mios)', async () => {
    const res = await request(app)
      .get('/api/accesos')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/accesos/mios', () => {
  it('el cliente ve únicamente sus propios registros (HU8-3)', async () => {
    const res = await request(app)
      .get('/api/accesos/mios')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0]).toMatchObject({
      cliente: { id: 2, nombre: 'Carl López' },
      resultado: 'autorizado',
    });
  });

  it('responde 403 para administrador, recepcionista y entrenador', async () => {
    for (const token of [tokenAdmin(), tokenRecep(), tokenEntrena()]) {
      const res = await request(app)
        .get('/api/accesos/mios')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});
