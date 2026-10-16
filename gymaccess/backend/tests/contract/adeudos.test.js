// T070 [US7] Contrato de adeudos y pagos propios (FR-010, contracts/api.md).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => {
  function filaMembresia(m) {
    const tipo = estado.tipos.find((t) => t.id === m.tipo_membresia_id);
    const cliente = estado.clientes.find((c) => c.id === m.cliente_id);
    const pagado = estado.pagos
      .filter((p) => p.membresia_id === m.id)
      .reduce((suma, p) => suma + p.monto, 0);
    return {
      ...m,
      cliente: cliente?.nombre_completo ?? '',
      tipo: tipo?.nombre ?? '',
      descripcion: tipo?.descripcion ?? null,
      saldo_pendiente: Math.max(0, m.precio - pagado),
    };
  }

  function filaPago(p) {
    const m = estado.membresias.find((x) => x.id === p.membresia_id);
    const c = estado.clientes.find((x) => x.id === p.cliente_id);
    return {
      ...p,
      cliente: c?.nombre_completo ?? '',
      tipo_membresia:
        estado.tipos.find((t) => t.id === m?.tipo_membresia_id)?.nombre ?? '',
    };
  }

  return { clientes: [], tipos: [], membresias: [], pagos: [], filaMembresia, filaPago };
});

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

vi.mock('../../src/models/tipoMembresia.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.tipos.length + 1;
    estado.tipos.push({ id, ...datos, estado: datos.estado ?? 'activo' });
    return id;
  }),
  findById: vi.fn(async (id) =>
    estado.tipos.find((t) => t.id === Number(id)) ?? null
  ),
  findByNombre: vi.fn(async () => null),
  listar: vi.fn(async () => estado.tipos),
  actualizar: vi.fn(async () => true),
}));

vi.mock('../../src/models/membresia.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.membresias.length + 1;
    estado.membresias.push({ id, ...datos });
    return id;
  }),
  findById: vi.fn(async (id) => {
    const m = estado.membresias.find((x) => x.id === Number(id));
    return m ? estado.filaMembresia(m) : null;
  }),
  findEnCursoPorCliente: vi.fn(async () => null),
  findVigentePorCliente: vi.fn(async () => null),
  listar: vi.fn(async ({ cliente_id } = {}) => {
    let filas = estado.membresias.map(estado.filaMembresia);
    if (cliente_id) filas = filas.filter((m) => m.cliente_id === Number(cliente_id));
    return filas;
  }),
  calcularAdeudoCliente: vi.fn(async () => 0),
  calcularAdeudoMembresia: vi.fn(async () => 0),
  actualizar: vi.fn(async () => true),
}));

vi.mock('../../src/models/pago.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.pagos.length + 1;
    estado.pagos.push({ id, ...datos, fecha_pago: '2026-10-15 09:00:00' });
    return id;
  }),
  findById: vi.fn(async (id) => {
    const p = estado.pagos.find((x) => x.id === Number(id));
    return p ? estado.filaPago(p) : null;
  }),
  listar: vi.fn(async ({ cliente_id, desde, hasta } = {}) => {
    let filas = estado.pagos.map(estado.filaPago);
    if (cliente_id) filas = filas.filter((p) => p.cliente_id === Number(cliente_id));
    if (desde) filas = filas.filter((p) => String(p.fecha_pago).slice(0, 10) >= desde);
    if (hasta) filas = filas.filter((p) => String(p.fecha_pago).slice(0, 10) <= hasta);
    return filas;
  }),
  findMembresiaDeCliente: vi.fn(async () => null),
  totalPagadoMembresia: vi.fn(async () => 0),
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
  estado.tipos = [
    { id: 1, nombre: 'Mensual', descripcion: '30 días', duracion_dias: 30, precio: 150, estado: 'activo' },
    { id: 2, nombre: 'Anual', descripcion: '365 días', duracion_dias: 365, precio: 1400, estado: 'activo' },
  ];
  // Lucía: 150 pagados de 150 → sin adeudo.
  // Carl: 1000 pagados de 1400 → adeudo de 400.
  estado.membresias = [
    { id: 1, cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-10-14', fecha_vencimiento: '2026-11-13', estado: 'activa', precio: 150 },
    { id: 2, cliente_id: 2, tipo_membresia_id: 2, fecha_inicio: '2026-01-01', fecha_vencimiento: '2027-01-01', estado: 'activa', precio: 1400 },
  ];
  estado.pagos = [
    { id: 1, cliente_id: 1, membresia_id: 1, monto: 150, metodo: 'efectivo', fecha_pago: '2026-10-14 09:00:00' },
    { id: 2, cliente_id: 2, membresia_id: 2, monto: 1000, metodo: 'efectivo', fecha_pago: '2026-01-02 09:00:00' },
  ];
});

describe('GET /api/adeudos', () => {
  it('lista solo los saldos mayores que cero (FR-009/FR-010)', async () => {
    const res = await request(app)
      .get('/api/adeudos')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0]).toMatchObject({
      cliente_id: 2,
      cliente: 'Carl López',
      membresia_id: 2,
      precio: 1400,
      pagado: 1000,
      saldo_pendiente: 400,
    });
  });

  it('responde 403 para recepcionista, entrenador y cliente', async () => {
    for (const token of [tokenRecep(), tokenEntrena(), tokenCliente()]) {
      const res = await request(app)
        .get('/api/adeudos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});

describe('GET /api/adeudos/mios', () => {
  it('el cliente ve solo sus propios saldos pendientes', async () => {
    const res = await request(app)
      .get('/api/adeudos/mios')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0]).toMatchObject({
      cliente_id: 2,
      saldo_pendiente: 400,
    });
  });

  it('con todo saldado devuelve lista vacía', async () => {
    estado.pagos = [
      { id: 1, cliente_id: 1, membresia_id: 1, monto: 150, metodo: 'efectivo', fecha_pago: '2026-10-14 09:00:00' },
      { id: 2, cliente_id: 2, membresia_id: 2, monto: 1400, metodo: 'efectivo', fecha_pago: '2026-01-02 09:00:00' },
    ];

    const res = await request(app)
      .get('/api/adeudos/mios')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(0);
  });

  it('responde 403 para administrador y entrenador', async () => {
    for (const token of [tokenAdmin(), tokenEntrena()]) {
      const res = await request(app)
        .get('/api/adeudos/mios')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});

describe('GET /api/pagos/mios', () => {
  it('el cliente ve únicamente sus propios pagos', async () => {
    const res = await request(app)
      .get('/api/pagos/mios')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0].monto).toBe(1000);
    expect(res.body.datos[0].cliente.nombre).toBe('Carl López');
  });

  it('responde 403 para recepcionista y entrenador', async () => {
    for (const token of [tokenRecep(), tokenEntrena()]) {
      const res = await request(app)
        .get('/api/pagos/mios')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});
