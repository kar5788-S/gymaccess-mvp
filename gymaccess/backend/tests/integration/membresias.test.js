// T029 [US2] Integración: alta de cliente → alta de tipo → asignación →
// consulta con fechas y estado correctos (HU2 completo por HTTP).

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
  findVigentePorCliente: vi.fn(async (clienteId) => {
    const candidatas = estado.membresias
      .filter((x) => x.cliente_id === Number(clienteId))
      .sort((a, b) => b.id - a.id);
    const m = candidatas.find((x) => x.estado === 'activa') ?? candidatas[0];
    return m ? estado.filaMembresia(m) : null;
  }),
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

beforeEach(() => {
  estado.clientes = [];
  estado.tipos = [];
  estado.membresias = [];
  estado.pagos = [];
});

describe('Flujo de asignación de membresías', () => {
  it('cliente → tipo → asignación → consulta con fechas correctas', async () => {
    // 1. El recepcionista da de alta al cliente.
    const cliente = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({
        nombre_completo: 'Lucía Torres',
        telefono: '555-1234',
        correo: 'lucia@g.test',
      });
    expect(cliente.status).toBe(201);

    // 2. El administrador crea el tipo de membresía.
    const tipo = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Mensual', descripcion: '30 días', duracion_dias: 30, precio: 150 });
    expect(tipo.status).toBe(201);

    // 3. Se asigna la membresía con fecha de inicio fija.
    const asignada = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({
        cliente_id: cliente.body.datos.id,
        tipo_membresia_id: tipo.body.datos.id,
        fecha_inicio: '2026-10-14',
      });
    expect(asignada.status).toBe(201);
    expect(asignada.body.datos.fecha_vencimiento).toBe('2026-11-13');
    expect(asignada.body.datos.estado).toBe('activa');

    // 4. La consulta por cliente devuelve la membresía con saldo completo.
    const consulta = await request(app)
      .get(`/api/membresias?cliente_id=${cliente.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(consulta.status).toBe(200);
    expect(consulta.body.datos).toHaveLength(1);
    expect(consulta.body.datos[0]).toMatchObject({
      cliente: { id: cliente.body.datos.id, nombre: 'Lucía Torres' },
      tipo: { id: tipo.body.datos.id, nombre: 'Mensual' },
      fecha_inicio: '2026-10-14',
      fecha_vencimiento: '2026-11-13',
      estado: 'activa',
      precio: 150,
      saldo_pendiente: 150,
    });

    // 5. Una segunda asignación al mismo cliente se rechaza (FR-004).
    const duplicada = await request(app)
      .post('/api/membresias')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({
        cliente_id: cliente.body.datos.id,
        tipo_membresia_id: tipo.body.datos.id,
        fecha_inicio: '2026-12-01',
      });
    expect(duplicada.status).toBe(409);
    expect(duplicada.body.error.codigo).toBe('MEMBRESIA_ACTIVA_EXISTENTE');
  });
});
