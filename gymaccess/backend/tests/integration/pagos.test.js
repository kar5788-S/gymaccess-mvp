// T039 [US3] Integración: alta → membresía → pago parcial (saldo > 0) →
// pago mayor al saldo (saldo en 0 y pago conservado en el historial).

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
      tipo_membresia: estado.tipos.find((t) => t.id === m?.tipo_membresia_id)?.nombre ?? '',
      fecha_vencimiento: m?.fecha_vencimiento ?? null,
      membresia_estado: m?.estado ?? null,
    };
  }

  return { clientes: [], tipos: [], membresias: [], pagos: [], filaMembresia, filaPago };
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
      fecha_pago: datos.fecha_pago ?? '2026-10-14 12:00:00',
    });
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

describe('Flujo de pagos y saldo', () => {
  it('pago parcial deja saldo > 0; exceder el saldo queda en 0 sin perder el pago', async () => {
    const cliente = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre_completo: 'Lucía Torres', telefono: '555-1234' });
    expect(cliente.status).toBe(201);

    const tipo = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Mensual', duracion_dias: 30, precio: 150 });
    expect(tipo.status).toBe(201);

    const membresia = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({
        cliente_id: cliente.body.datos.id,
        tipo_membresia_id: tipo.body.datos.id,
        fecha_inicio: '2026-10-14',
      });
    expect(membresia.status).toBe(201);

    // Pago parcial: 50 de 150 → saldo 100.
    const parcial = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({
        cliente_id: cliente.body.datos.id,
        membresia_id: membresia.body.datos.id,
        monto: 50,
      });
    expect(parcial.status).toBe(201);
    expect(parcial.body.datos.saldo_pendiente).toBe(100);

    // Pago que excede el saldo: 500 → saldo en 0 y pago conservado.
    const excedido = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({
        cliente_id: cliente.body.datos.id,
        membresia_id: membresia.body.datos.id,
        monto: 500,
      });
    expect(excedido.status).toBe(201);
    expect(excedido.body.datos.saldo_pendiente).toBe(0);

    // El historial conserva ambos pagos (FR-008: sin borrado).
    const historial = await request(app)
      .get('/api/pagos')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(historial.status).toBe(200);
    expect(historial.body.datos).toHaveLength(2);

    // La consulta de la membresía refleja el saldo final en cero.
    const consulta = await request(app)
      .get(`/api/membresias?cliente_id=${cliente.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(consulta.body.datos[0].saldo_pendiente).toBe(0);
  });
});
