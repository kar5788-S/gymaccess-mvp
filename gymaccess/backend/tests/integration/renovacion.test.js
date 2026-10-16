// T046 [US4] Integración: suspensión → reactivación con fecha_vencimiento
// idéntica (R-21 / clarify 2026-10-14) y renovación con pago previo (FR-005,
// FR-023).

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
  actualizar: vi.fn(async () => true),
  findById: vi.fn(async (id) =>
    estado.clientes.find((c) => c.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async () => null),
  findDuplicate: vi.fn(async (datos, excludeId) =>
    estado.clientes.find(
      (c) =>
        c.id !== Number(excludeId ?? -1) &&
        c.nombre_completo === datos.nombre_completo &&
        (c.telefono === datos.telefono || c.correo === datos.correo)
    ) ?? null
  ),
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
  findByNombre: vi.fn(async (nombre, excludeId) =>
    estado.tipos.find(
      (t) => t.nombre === nombre && t.id !== Number(excludeId ?? -1)
    ) ?? null
  ),
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

vi.mock('../../src/models/pago.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.pagos.length + 1;
    estado.pagos.push({
      id,
      cliente_id: datos.cliente_id,
      membresia_id: datos.membresia_id,
      monto: datos.monto,
      metodo: datos.metodo ?? 'efectivo',
      fecha_pago: datos.fecha_pago ?? '2026-10-14 13:00:00',
    });
    return id;
  }),
  findById: vi.fn(async () => null),
  listar: vi.fn(async () => []),
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

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' });

beforeEach(() => {
  estado.clientes = [];
  estado.tipos = [];
  estado.membresias = [];
  estado.pagos = [];
});

async function prepararMembresia() {
  const cliente = await request(app)
    .post('/api/clientes')
    .set('Authorization', `Bearer ${tokenAdmin()}`)
    .send({ nombre_completo: 'Lucía Torres', telefono: '555-1234' });

  const tipo = await request(app)
    .post('/api/tipos-membresia')
    .set('Authorization', `Bearer ${tokenAdmin()}`)
    .send({ nombre: 'Mensual', duracion_dias: 30, precio: 150 });

  const membresia = await request(app)
    .post('/api/membresias')
    .set('Authorization', `Bearer ${tokenAdmin()}`)
    .send({
      cliente_id: cliente.body.datos.id,
      tipo_membresia_id: tipo.body.datos.id,
      fecha_inicio: '2026-10-14',
    });

  return { cliente: cliente.body.datos, tipo: tipo.body.datos, membresia: membresia.body.datos };
}

describe('Ciclo de vida de la membresía', () => {
  it('suspender y reactivar conserva la fecha de vencimiento idéntica (R-21)', async () => {
    const { membresia } = await prepararMembresia();
    const vencimientoOriginal = membresia.fecha_vencimiento;
    expect(vencimientoOriginal).toBe('2026-11-13');

    const suspendida = await request(app)
      .put(`/api/membresias/${membresia.id}/estado`)
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'suspendida' });
    expect(suspendida.status).toBe(200);
    expect(suspendida.body.datos.estado).toBe('suspendida');

    const reactivada = await request(app)
      .put(`/api/membresias/${membresia.id}/estado`)
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'activa' });
    expect(reactivada.status).toBe(200);
    expect(reactivada.body.datos.estado).toBe('activa');
    expect(reactivada.body.datos.fecha_vencimiento).toBe(vencimientoOriginal);
    expect(estado.membresias[0].fecha_vencimiento).toBe(vencimientoOriginal);
  });

  it('renovar exige adeudo en cero y suma la duración del plan', async () => {
    const { cliente, membresia } = await prepararMembresia();

    // Sin pagar: la renovación queda bloqueada (FR-023).
    const sinPagar = await request(app)
      .post(`/api/membresias/${membresia.id}/renovar`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(sinPagar.status).toBe(409);
    expect(sinPagar.body.error.codigo).toBe('ADEUDO_PENDIENTE');

    // Se salda la membresía y ahora sí se renueva.
    const pago = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: cliente.id, membresia_id: membresia.id, monto: 150 });
    expect(pago.status).toBe(201);
    expect(pago.body.datos.saldo_pendiente).toBe(0);

    const renovada = await request(app)
      .post(`/api/membresias/${membresia.id}/renovar`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(renovada.status).toBe(200);
    expect(renovada.body.datos.fecha_vencimiento).toBe('2026-12-13');
    expect(renovada.body.datos.estado).toBe('activa');
  });
});
