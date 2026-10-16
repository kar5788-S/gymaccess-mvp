// T069 [US6] Integración del flujo central: cliente → rostro → membresía →
// intento de acceso autorizado → rechazos por estado, vencimiento por fecha
// y rostro no identificado; historial registrado (FR-015) y consulta propia.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';
import { serializarDescriptor } from '../../src/utils/descriptor.js';

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

  return {
    clientes: [],
    tipos: [],
    membresias: [],
    pagos: [],
    rostros: [],
    accesos: [],
    filaMembresia,
  };
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
  findByUsuarioId: vi.fn(async (usuarioId) =>
    estado.clientes.find((c) => c.usuario_id === Number(usuarioId)) ?? null
  ),
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
  // El terminal toma la más reciente (activa primero), como el modelo real.
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
  crear: vi.fn(async () => 1),
  findById: vi.fn(async () => null),
  listar: vi.fn(async () => []),
  findMembresiaDeCliente: vi.fn(async (membresiaId, clienteId) => {
    const m = estado.membresias.find(
      (x) =>
        x.id === Number(membresiaId) && x.cliente_id === Number(clienteId)
    );
    return m ? { ...m } : null;
  }),
  totalPagadoMembresia: vi.fn(async () => 0),
}));

vi.mock('../../src/models/rostro.model.js', () => ({
  guardar: vi.fn(async ({ cliente_id, descriptor_facial }) => {
    const existente = estado.rostros.find((r) => r.cliente_id === cliente_id);
    if (existente) {
      existente.descriptor_facial = descriptor_facial;
      return { id: existente.id, reemplazado: true };
    }
    const id = estado.rostros.length + 1;
    estado.rostros.push({
      id,
      cliente_id,
      descriptor_facial,
      fecha_registro: '2026-10-15 08:00:00',
      estado: 'activo',
    });
    return { id, reemplazado: false };
  }),
  findByClienteId: vi.fn(async (clienteId, conDescriptor = false) => {
    const r = estado.rostros.find((x) => x.cliente_id === Number(clienteId));
    if (!r) return null;
    const base = {
      id: r.id,
      cliente_id: r.cliente_id,
      fecha_registro: r.fecha_registro,
      estado: r.estado,
    };
    return conDescriptor ? { ...base, descriptor_facial: r.descriptor_facial } : base;
  }),
  listarConDescriptor: vi.fn(async () =>
    estado.rostros
      .filter((r) => r.estado === 'activo')
      .map((r) => ({ cliente_id: r.cliente_id, descriptor_facial: r.descriptor_facial }))
  ),
  eliminarPorCliente: vi.fn(async (clienteId) => {
    const antes = estado.rostros.length;
    estado.rostros = estado.rostros.filter((r) => r.cliente_id !== Number(clienteId));
    return estado.rostros.length < antes;
  }),
}));

vi.mock('../../src/models/acceso.model.js', () => ({
  MOTIVOS_PERMITIDOS: [
    'membresia_vencida',
    'membresia_suspendida',
    'membresia_cancelada',
    'sin_membresia',
    'rostro_no_identificado',
  ],
  crear: vi.fn(async ({ cliente_id, resultado, motivo_rechazo }) => {
    if (resultado === 'rechazado' && !motivo_rechazo) {
      throw new Error('Todo acceso rechazado debe indicar un motivo.');
    }
    const id = estado.accesos.length + 1;
    estado.accesos.push({
      id,
      cliente_id: cliente_id ?? null,
      resultado,
      motivo_rechazo: motivo_rechazo ?? null,
      fecha: '2026-10-15',
      hora: `08:${String(id).padStart(2, '0')}:00`,
    });
    return id;
  }),
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

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 1, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' });
const tokenCliente = () =>
  firmarToken({ sub: 9, nombre: 'Carl', email: 'c@g.test', rol: 'cliente' });

// Vectores simulados de 128 dimensiones (R-17: mismas reglas en pruebas).
const VECTOR_LUCIA = Array.from({ length: 128 }, (_, i) => i / 256);
const VECTOR_CERCANO = VECTOR_LUCIA.map((v) => v + 0.01); // ~0.113
const VECTOR_DECONOCIDO = Array.from({ length: 128 }, () => 0.9); // ~5.66

beforeEach(() => {
  estado.clientes = [];
  estado.tipos = [];
  estado.membresias = [];
  estado.pagos = [];
  estado.rostros = [];
  estado.accesos = [];
});

// Prepara cliente con usuario, rostro, tipo y membresía viva.
async function preparar({ fechaInicio = '2026-10-14' } = {}) {
  const cliente = await request(app)
    .post('/api/clientes')
    .set('Authorization', `Bearer ${tokenAdmin()}`)
    .send({
      nombre_completo: 'Lucía Torres',
      telefono: '555-1234',
      usuario_id: 9,
    });
  expect(cliente.status).toBe(201);

  const rostro = await request(app)
    .post('/api/rostros')
    .set('Authorization', `Bearer ${tokenAdmin()}`)
    .send({ cliente_id: cliente.body.datos.id, descriptor: VECTOR_LUCIA });
  expect(rostro.status).toBe(201);

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
      fecha_inicio: fechaInicio,
    });
  expect(membresia.status).toBe(201);

  return {
    clienteId: cliente.body.datos.id,
    membresiaId: membresia.body.datos.id,
  };
}

function intentar(descriptor, token = tokenAdmin()) {
  return request(app)
    .post('/api/accesos/intento')
    .set('Authorization', `Bearer ${token}`)
    .send({ descriptor });
}

describe('Flujo de control de acceso (SC-004, SC-005, SC-006)', () => {
  it('autoriza al cliente con rostro coincidente y membresía vigente', async () => {
    await preparar();

    const res = await intentar(VECTOR_CERCANO);

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe('Acceso autorizado');
    expect(res.body.datos.resultado).toBe('autorizado');
    expect(res.body.datos.cliente).toMatchObject({ id: 1, nombre: 'Lucía Torres' });
    expect(res.body.datos.membresia).toMatchObject({ estado: 'activa' });
    expect(estado.accesos).toHaveLength(1);
  });

  it('rechaza tras suspender y autoriza al reactivar (R-21)', async () => {
    const { membresiaId } = await preparar();

    await request(app)
      .put(`/api/membresias/${membresiaId}/estado`)
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'suspendida' });

    const suspendida = await intentar(VECTOR_CERCANO);
    expect(suspendida.body.datos.resultado).toBe('rechazado');
    expect(suspendida.body.datos.motivo).toBe('membresia_suspendida');
    expect(suspendida.body.datos.cliente).toMatchObject({ nombre: 'Lucía Torres' });

    await request(app)
      .put(`/api/membresias/${membresiaId}/estado`)
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'activa' });

    const reactivada = await intentar(VECTOR_CERCANO);
    expect(reactivada.body.datos.resultado).toBe('autorizado');
  });

  it('rechaza con membresia_vencida por fecha pasada aunque el estado sea activa (R-20)', async () => {
    // Membresía con inicio en el pasado: vencimiento 2026-09-13 < hoy.
    await preparar({ fechaInicio: '2026-08-14' });

    const res = await intentar(VECTOR_CERCANO);

    expect(res.status).toBe(200);
    expect(res.body.datos.resultado).toBe('rechazado');
    expect(res.body.datos.motivo).toBe('membresia_vencida');
  });

  it('rostro no identificado no revela datos de terceros (HU6-5)', async () => {
    await preparar();

    const res = await intentar(VECTOR_DECONOCIDO);

    expect(res.status).toBe(200);
    expect(res.body.datos.motivo).toBe('rostro_no_identificado');
    expect(res.body.datos.cliente).toBeNull();
    expect(res.body.datos.membresia).toBeNull();
    expect(JSON.stringify(res.body.datos)).not.toContain('Lucía');
    // El intento igual queda registrado (FR-015).
    expect(estado.accesos[0]).toMatchObject({
      cliente_id: null,
      resultado: 'rechazado',
      motivo_rechazo: 'rostro_no_identificado',
    });
  });

  it('registra todo el historial y el cliente consulta solo lo suyo (US8)', async () => {
    await preparar();
    await intentar(VECTOR_CERCANO);
    await intentar(VECTOR_DECONOCIDO);
    expect(estado.accesos).toHaveLength(2);

    const historial = await request(app)
      .get('/api/accesos')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(historial.status).toBe(200);
    expect(historial.body.datos).toHaveLength(2);

    // El cliente autenticado (usuario_id 9) ve únicamente lo suyo.
    const mios = await request(app)
      .get('/api/accesos/mios')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(mios.status).toBe(200);
    expect(mios.body.datos).toHaveLength(1);
    expect(mios.body.datos[0].cliente).toMatchObject({ id: 1, nombre: 'Lucía Torres' });
  });
});
