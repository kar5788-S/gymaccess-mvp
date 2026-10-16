// T030 [US3] Contrato de pagos (contracts/api.md).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({ clientes: [], membresias: [], pagos: [] }));

vi.mock('../../src/models/pago.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.pagos.length + 1;
    estado.pagos.push({
      id,
      cliente_id: datos.cliente_id,
      membresia_id: datos.membresia_id,
      monto: datos.monto,
      metodo: datos.metodo ?? 'efectivo',
      fecha_pago: datos.fecha_pago ?? '2026-10-14 10:00:00',
    });
    return id;
  }),
  findById: vi.fn(async (id) => {
    const p = estado.pagos.find((x) => x.id === Number(id));
    if (!p) return null;
    const m = estado.membresias.find((x) => x.id === p.membresia_id);
    const c = estado.clientes.find((x) => x.id === p.cliente_id);
    const t = { nombre: m?.tipo ?? 'Mensual' };
    return { ...p, cliente: c?.nombre_completo ?? '', tipo_membresia: t.nombre };
  }),
  listar: vi.fn(async ({ cliente_id } = {}) => {
    let filas = estado.pagos;
    if (cliente_id) filas = filas.filter((p) => p.cliente_id === Number(cliente_id));
    return Promise.all(
      filas.map(async (p) => {
        const m = estado.membresias.find((x) => x.id === p.membresia_id);
        const c = estado.clientes.find((x) => x.id === p.cliente_id);
        return {
          ...p,
          cliente: c?.nombre_completo ?? '',
          tipo_membresia: m?.tipo ?? 'Mensual',
          fecha_vencimiento: m?.fecha_vencimiento ?? null,
          membresia_estado: m?.estado ?? null,
        };
      })
    );
  }),
  findMembresiaDeCliente: vi.fn(async (membresiaId, clienteId) => {
    const m = estado.membresias.find(
      (x) =>
        x.id === Number(membresiaId) && x.cliente_id === Number(clienteId)
    );
    return m ? { ...m } : null;
  }),
  totalPagadoMembresia: vi.fn(async (membresiaId) =>
    estado.pagos
      .filter((p) => p.membresia_id === Number(membresiaId))
      .reduce((s, p) => s + p.monto, 0)
  ),
}));

vi.mock('../../src/models/membresia.model.js', () => ({
  crear: vi.fn(async () => 1),
  findById: vi.fn(async () => null),
  findEnCursoPorCliente: vi.fn(async () => null),
  findVigentePorCliente: vi.fn(async () => null),
  listar: vi.fn(async () => []),
  calcularAdeudoCliente: vi.fn(async () => 0),
  calcularAdeudoMembresia: vi.fn(async (membresiaId) => {
    const m = estado.membresias.find((x) => x.id === Number(membresiaId));
    if (!m) return null;
    const pagado = estado.pagos
      .filter((p) => p.membresia_id === m.id)
      .reduce((s, p) => s + p.monto, 0);
    return Math.max(0, m.precio - pagado);
  }),
  actualizar: vi.fn(async () => true),
}));

vi.mock('../../src/models/cliente.model.js', () => ({
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
  findById: vi.fn(async (id) =>
    estado.clientes.find((c) => c.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async () => null),
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
  firmarToken({ sub: 4, nombre: 'Carl', email: 'c@g.test', rol: 'cliente' });

const PAGO_VALIDO = {
  cliente_id: 1,
  membresia_id: 1,
  monto: 50,
  metodo: 'efectivo',
};

beforeEach(() => {
  estado.clientes = [{ id: 1, nombre_completo: 'Lucía Torres', estado: 'activo' }];
  estado.membresias = [
    {
      id: 1,
      cliente_id: 1,
      tipo_membresia_id: 1,
      tipo: 'Mensual',
      fecha_inicio: '2026-10-14',
      fecha_vencimiento: '2026-11-13',
      estado: 'activa',
      precio: 150,
    },
  ];
  estado.pagos = [];
});

describe('POST /api/pagos', () => {
  it('registra un pago con 201 y devuelve el saldo restante (FR-009)', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send(PAGO_VALIDO);

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      monto: 50,
      metodo: 'efectivo',
      saldo_pendiente: 100,
    });
  });

  it('responde 400 si el monto es cero o negativo', async () => {
    const cero = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ ...PAGO_VALIDO, monto: 0 });
    expect(cero.status).toBe(400);
    expect(cero.body.error.codigo).toBe('VALIDACION');

    const negativo = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ ...PAGO_VALIDO, monto: -20 });
    expect(negativo.status).toBe(400);
  });

  it('responde 400 si el método no es efectivo (R-18)', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ ...PAGO_VALIDO, metodo: 'tarjeta' });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
    expect(JSON.stringify(res.body.error.detalles)).toContain('efectivo');
  });

  it('responde 400 MEMBRESIA_REQUERIDA si la membresía no existe', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ ...PAGO_VALIDO, membresia_id: 999 });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('MEMBRESIA_REQUERIDA');
  });

  it('responde 400 MEMBRESIA_REQUERIDA si la membresía es de otro cliente (FR-007)', async () => {
    estado.clientes.push({ id: 2, nombre_completo: 'Otro Cliente', estado: 'activo' });

    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ ...PAGO_VALIDO, cliente_id: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('MEMBRESIA_REQUERIDA');
  });

  it('responde 403 para entrenador y cliente', async () => {
    for (const token of [tokenEntrena(), tokenCliente()]) {
      const res = await request(app)
        .post('/api/pagos')
        .set('Authorization', `Bearer ${token}`)
        .send(PAGO_VALIDO);
      expect(res.status).toBe(403);
    }
  });
});

describe('GET /api/pagos', () => {
  it('lista el historial para administrador y recepcionista', async () => {
    await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send(PAGO_VALIDO);

    for (const token of [tokenAdmin(), tokenRecep()]) {
      const res = await request(app)
        .get('/api/pagos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.datos).toHaveLength(1);
      expect(res.body.datos[0].metodo).toBe('efectivo');
    }
  });

  it('responde 403 para entrenador y cliente', async () => {
    const entrenador = await request(app)
      .get('/api/pagos')
      .set('Authorization', `Bearer ${tokenEntrena()}`);
    expect(entrenador.status).toBe(403);

    const cliente = await request(app)
      .get('/api/pagos')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(cliente.status).toBe(403);
  });
});

describe('FR-008: historial de pagos inmutable', () => {
  it('no existen endpoints DELETE ni PUT de pagos', async () => {
    await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send(PAGO_VALIDO);
    expect(estado.pagos).toHaveLength(1);

    const borrado = await request(app)
      .delete('/api/pagos/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(borrado.status).toBe(404);

    const editado = await request(app)
      .put('/api/pagos/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ monto: 999 });
    expect(editado.status).toBe(404);

    expect(estado.pagos).toHaveLength(1);
    expect(estado.pagos[0].monto).toBe(50);
  });
});
