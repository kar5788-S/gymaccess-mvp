// T020 [US2] Contrato de asignación de membresías (contracts/api.md).

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

  return { clientes: [], tipos: [], membresias: [], pagos: [], filaMembresia };
});

vi.mock('../../src/models/cliente.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.clientes.length + 1;
    estado.clientes.push({
      id,
      nombre_completo: datos.nombre_completo,
      telefono: datos.telefono ?? null,
      correo: datos.correo ?? null,
      notas: datos.notas ?? null,
      usuario_id: datos.usuario_id ?? null,
      estado: 'activo',
    });
    return id;
  }),
  actualizar: vi.fn(async (id, campos) => {
    const c = estado.clientes.find((x) => x.id === Number(id));
    if (c) Object.assign(c, campos);
    return Boolean(c);
  }),
  findById: vi.fn(async (id) =>
    estado.clientes.find((c) => c.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async () => null),
  findDuplicate: vi.fn(async () => null),
  listar: vi.fn(async () => estado.clientes),
}));

vi.mock('../../src/models/tipoMembresia.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.tipos.length + 1;
    estado.tipos.push({
      id,
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      duracion_dias: datos.duracion_dias,
      precio: datos.precio,
      estado: datos.estado ?? 'activo',
    });
    return id;
  }),
  findById: vi.fn(async (id) =>
    estado.tipos.find((t) => t.id === Number(id)) ?? null
  ),
  findByNombre: vi.fn(async () => null),
  listar: vi.fn(async () => estado.tipos),
  actualizar: vi.fn(async (id, campos) => {
    const t = estado.tipos.find((x) => x.id === Number(id));
    if (t) Object.assign(t, campos);
    return Boolean(t);
  }),
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
  findEnCursoPorCliente: vi.fn(async (clienteId) => {
    const m = estado.membresias.find(
      (x) =>
        x.cliente_id === Number(clienteId) &&
        ['activa', 'suspendida'].includes(x.estado)
    );
    return m ? estado.filaMembresia(m) : null;
  }),
  findVigentePorCliente: vi.fn(async () => null),
  listar: vi.fn(async ({ cliente_id, estado: filtro } = {}) => {
    let filas = estado.membresias.map(estado.filaMembresia);
    if (cliente_id) filas = filas.filter((m) => m.cliente_id === Number(cliente_id));
    if (filtro) filas = filas.filter((m) => m.estado === filtro);
    return filas;
  }),
  calcularAdeudoCliente: vi.fn(async (clienteId) => {
    return estado.membresias
      .filter((m) => m.cliente_id === Number(clienteId))
      .reduce((suma, m) => {
        const pagado = estado.pagos
          .filter((p) => p.membresia_id === m.id)
          .reduce((s, p) => s + p.monto, 0);
        return suma + Math.max(0, m.precio - pagado);
      }, 0);
  }),
  calcularAdeudoMembresia: vi.fn(async () => 0),
  actualizar: vi.fn(async (id, campos) => {
    const m = estado.membresias.find((x) => x.id === Number(id));
    if (m) Object.assign(m, campos);
    return Boolean(m);
  }),
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

beforeEach(async () => {
  estado.clientes = [
    { id: 1, nombre_completo: 'Lucía Torres', estado: 'activo' },
    { id: 2, nombre_completo: 'Baja Cliente', estado: 'inactivo' },
  ];
  estado.tipos = [
    { id: 1, nombre: 'Mensual', descripcion: '30 días', duracion_dias: 30, precio: 150, estado: 'activo' },
    { id: 2, nombre: 'Retirado', descripcion: null, duracion_dias: 30, precio: 100, estado: 'inactivo' },
  ];
  estado.membresias = [];
  estado.pagos = [];
});

describe('POST /api/membresias', () => {
  it('asigna una membresía con 201 y vencimiento calculado (FR-003)', async () => {
    const res = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      fecha_inicio: '2026-10-14',
      fecha_vencimiento: '2026-11-13',
      estado: 'activa',
      precio: 150,
      saldo_pendiente: 150,
    });
  });

  it('responde 404 si el cliente no existe', async () => {
    const res = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 999, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });

    expect(res.status).toBe(404);
  });

  it('responde 409 CLIENTE_NO_ACTIVO si el cliente está dado de baja', async () => {
    const res = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 2, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CLIENTE_NO_ACTIVO');
  });

  it('responde 409 MEMBRESIA_ACTIVA_EXISTENTE si ya tiene una en curso (FR-004)', async () => {
    await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });

    const res = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-11-14' });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('MEMBRESIA_ACTIVA_EXISTENTE');
  });

  it('responde 409 ADEUDO_PENDIENTE si el cliente debe (FR-023 / R-26)', async () => {
    // Membresía pasada con precio 150 y solo 50 pagados: adeudo de 100.
    estado.membresias.push({
      id: 9,
      cliente_id: 1,
      tipo_membresia_id: 1,
      fecha_inicio: '2026-06-01',
      fecha_vencimiento: '2026-07-01',
      estado: 'vencida',
      precio: 150,
    });
    estado.pagos.push({ id: 1, membresia_id: 9, monto: 50 });

    const res = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ADEUDO_PENDIENTE');
    expect(res.body.error.detalles.adeudo).toBe(100);
  });

  it('responde 409 ESTADO_NO_PERMITE con un tipo inactivo', async () => {
    const res = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 2, fecha_inicio: '2026-10-14' });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ESTADO_NO_PERMITE');
  });

  it('responde 400 si la fecha de inicio no tiene formato válido', async () => {
    const res = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: 'mañana' });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 403 para entrenador y cliente (matriz de permisos)', async () => {
    for (const token of [tokenEntrena(), tokenCliente()]) {
      const res = await request(app)
        .post('/api/membresias')
        .set('Authorization', `Bearer ${token}`)
        .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });
      expect(res.status).toBe(403);
    }
  });
});

describe('GET /api/membresias', () => {
  it('lista con saldo para administrador y recepcionista', async () => {
    await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });

    const res = await request(app)
      .get('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0]).toHaveProperty('saldo_pendiente', 150);
  });

  it('el entrenador no recibe precios ni saldos (Principio VI)', async () => {
    await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });

    const res = await request(app)
      .get('/api/membresias')
      .set('Authorization', `Bearer ${tokenEntrena()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0]).not.toHaveProperty('precio');
    expect(res.body.datos[0]).not.toHaveProperty('saldo_pendiente');
  });

  it('responde 404 ante un cliente_id inexistente', async () => {
    const res = await request(app)
      .get('/api/membresias?cliente_id=999')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(404);
  });

  it('responde 403 para cliente (solo consulta lo propio)', async () => {
    const res = await request(app)
      .get('/api/membresias')
      .set('Authorization', `Bearer ${tokenCliente()}`);

    expect(res.status).toBe(403);
  });
});

describe('FR-008: sin eliminación física de membresías', () => {
  it('no existe endpoint DELETE /api/membresias/:id', async () => {
    await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, tipo_membresia_id: 1, fecha_inicio: '2026-10-14' });

    const res = await request(app)
      .delete('/api/membresias/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(404);
    expect(estado.membresias).toHaveLength(1);
  });
});
