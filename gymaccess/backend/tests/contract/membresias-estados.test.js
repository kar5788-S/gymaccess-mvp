// T040 [US4] Contrato de estados y renovación (contracts/api.md, R-20/R-21).

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
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
  findById: vi.fn(async (id) =>
    estado.clientes.find((c) => c.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async () => null),
  findDuplicate: vi.fn(async () => null),
  listar: vi.fn(async () => estado.clientes),
}));

vi.mock('../../src/models/tipoMembresia.model.js', () => ({
  crear: vi.fn(async () => 1),
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
  findEnCursoPorCliente: vi.fn(async (clienteId) => {
    const m = estado.membresias.find(
      (x) =>
        x.cliente_id === Number(clienteId) &&
        ['activa', 'suspendida'].includes(x.estado)
    );
    return m ? estado.filaMembresia(m) : null;
  }),
  findVigentePorCliente: vi.fn(async () => null),
  listar: vi.fn(async () => estado.membresias.map(estado.filaMembresia)),
  calcularAdeudoCliente: vi.fn(async (clienteId) =>
    estado.membresias
      .filter((m) => m.cliente_id === Number(clienteId))
      .reduce((suma, m) => {
        const pagado = estado.pagos
          .filter((p) => p.membresia_id === m.id)
          .reduce((s, p) => s + p.monto, 0);
        return suma + Math.max(0, m.precio - pagado);
      }, 0)
  ),
  calcularAdeudoMembresia: vi.fn(async (membresiaId) => {
    const m = estado.membresias.find((x) => x.id === Number(membresiaId));
    if (!m) return null;
    const pagado = estado.pagos
      .filter((p) => p.membresia_id === m.id)
      .reduce((s, p) => s + p.monto, 0);
    return Math.max(0, m.precio - pagado);
  }),
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

function sembrar(overrides = {}) {
  estado.clientes = [{ id: 1, nombre_completo: 'Lucía Torres', estado: 'activo' }];
  estado.tipos = [
    { id: 1, nombre: 'Mensual', descripcion: '30 días', duracion_dias: 30, precio: 150, estado: 'activo' },
  ];
  estado.membresias = [
    {
      id: 1,
      cliente_id: 1,
      tipo_membresia_id: 1,
      fecha_inicio: '2026-10-14',
      fecha_vencimiento: '2026-11-13',
      estado: 'activa',
      precio: 150,
      ...overrides,
    },
  ];
  // Membresía saldada por defecto (150 de 150): la renovación no debe
  // bloquearse; el caso con adeudo la sobreescribe.
  estado.pagos = [{ id: 1, membresia_id: 1, monto: 150 }];
}

beforeEach(() => sembrar());

describe('POST /api/membresias/:id/renovar', () => {
  it('renueva una membresía activa sumando la duración al vencimiento (FR-005)', async () => {
    const res = await request(app)
      .post('/api/membresias/1/renovar')
      .set('Authorization', `Bearer ${tokenRecep()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.fecha_vencimiento).toBe('2026-12-13');
    expect(res.body.datos.estado).toBe('activa');
  });

  it('renueva una membresía vencida', async () => {
    sembrar({ estado: 'vencida', fecha_vencimiento: '2026-09-13' });

    const res = await request(app)
      .post('/api/membresias/1/renovar')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.fecha_vencimiento).toBe('2026-10-13');
  });

  it('responde 409 ESTADO_NO_PERMITE al renovar una suspendida (FR-005)', async () => {
    sembrar({ estado: 'suspendida' });

    const res = await request(app)
      .post('/api/membresias/1/renovar')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ESTADO_NO_PERMITE');
  });

  it('responde 409 ESTADO_NO_PERMITE al renovar una cancelada (terminal)', async () => {
    sembrar({ estado: 'cancelada' });

    const res = await request(app)
      .post('/api/membresias/1/renovar')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ESTADO_NO_PERMITE');
  });

  it('responde 409 ADEUDO_PENDIENTE si la membresía debe (FR-023)', async () => {
    estado.pagos = [{ id: 1, membresia_id: 1, monto: 50 }]; // adeudo de 100

    const res = await request(app)
      .post('/api/membresias/1/renovar')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ADEUDO_PENDIENTE');
    expect(res.body.error.detalles.adeudo).toBe(100);
  });

  it('responde 404 si la membresía no existe', async () => {
    const res = await request(app)
      .post('/api/membresias/999/renovar')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(res.status).toBe(404);
  });

  it('responde 403 para entrenador y cliente', async () => {
    for (const token of [tokenEntrena(), tokenCliente()]) {
      const res = await request(app)
        .post('/api/membresias/1/renovar')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});

describe('PUT /api/membresias/:id/estado', () => {
  it('la reactivación desde suspendida conserva fecha_vencimiento (R-21)', async () => {
    sembrar({ estado: 'suspendida' });
    const vencimientoOriginal = estado.membresias[0].fecha_vencimiento;

    const res = await request(app)
      .put('/api/membresias/1/estado')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'activa' });

    expect(res.status).toBe(200);
    expect(res.body.datos.estado).toBe('activa');
    expect(res.body.datos.fecha_vencimiento).toBe(vencimientoOriginal);
    expect(estado.membresias[0].fecha_vencimiento).toBe(vencimientoOriginal);
  });

  it('suspende una membresía activa y después la cancela', async () => {
    const suspendida = await request(app)
      .put('/api/membresias/1/estado')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'suspendida' });
    expect(suspendida.status).toBe(200);
    expect(suspendida.body.datos.estado).toBe('suspendida');

    // Desde suspendida solo se puede reactivar (R-20).
    const cancelada = await request(app)
      .put('/api/membresias/1/estado')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'cancelada' });
    expect(cancelada.status).toBe(409);
    expect(cancelada.body.error.codigo).toBe('ESTADO_NO_PERMITE');
  });

  it('la cancelación es terminal: no admite reactivación', async () => {
    const cancelada = await request(app)
      .put('/api/membresias/1/estado')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'cancelada' });
    expect(cancelada.status).toBe(200);

    const reactivada = await request(app)
      .put('/api/membresias/1/estado')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'activa' });
    expect(reactivada.status).toBe(409);
    expect(reactivada.body.error.codigo).toBe('ESTADO_NO_PERMITE');
  });

  it('responde 409 si el estado actual ya es el solicitado', async () => {
    const res = await request(app)
      .put('/api/membresias/1/estado')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'activa' });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ESTADO_NO_PERMITE');
  });

  it('responde 400 ante un estado fuera del catálogo', async () => {
    const res = await request(app)
      .put('/api/membresias/1/estado')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'volando' });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 403 para recepcionista, entrenador y cliente (solo administrador)', async () => {
    for (const token of [tokenRecep(), tokenEntrena(), tokenCliente()]) {
      const res = await request(app)
        .put('/api/membresias/1/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'suspendida' });
      expect(res.status).toBe(403);
    }
  });
});
