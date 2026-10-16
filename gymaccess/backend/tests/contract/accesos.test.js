// T059 [US6] Contrato del intento de acceso (contracts/api.md, HU6).
// El cotejo facial es ARITMÉTICA PURA en el backend: los descriptores
// almacenados se serializan con el util real y el umbral se toma del entorno.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';
import { serializarDescriptor } from '../../src/utils/descriptor.js';

const estado = vi.hoisted(() => ({ clientes: [], rostros: [], accesos: [] }));

// Vectores de prueba de 128 dimensiones.
function vectorBase() {
  return Array.from({ length: 128 }, (_, i) => i / 128);
}
function vectorCercano() {
  // Distancia ~0.113 < umbral 0.6 → coincidencia.
  return vectorBase().map((v) => v + 0.01);
}
function vectorLejano() {
  // Distancia ~5.66 > umbral 0.6 → sin coincidencia.
  return vectorBase().map(() => 0.9);
}

vi.mock('../../src/models/rostro.model.js', () => ({
  guardar: vi.fn(async () => 1),
  findByClienteId: vi.fn(async () => null),
  listarConDescriptor: vi.fn(async () =>
    estado.rostros.map((r) => ({
      cliente_id: r.cliente_id,
      descriptor_facial: r.descriptor_facial,
    }))
  ),
  eliminarPorCliente: vi.fn(async () => true),
}));

vi.mock('../../src/models/membresia.model.js', () => ({
  crear: vi.fn(async () => 1),
  findById: vi.fn(async () => null),
  findEnCursoPorCliente: vi.fn(async () => null),
  findVigentePorCliente: vi.fn(async (clienteId) => {
    const m = estado.membresias.find(
      (x) => x.cliente_id === Number(clienteId)
    );
    return m ? { ...m } : null;
  }),
  listar: vi.fn(async () => []),
  calcularAdeudoCliente: vi.fn(async () => 0),
  calcularAdeudoMembresia: vi.fn(async () => 0),
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
    if (resultado === 'autorizado' && motivo_rechazo) {
      throw new Error('Un acceso autorizado no puede llevar motivo.');
    }
    const id = estado.accesos.length + 1;
    estado.accesos.push({
      id,
      cliente_id: cliente_id ?? null,
      resultado,
      motivo_rechazo: motivo_rechazo ?? null,
      fecha: '2026-10-15',
      hora: '08:30:00',
    });
    return id;
  }),
  listar: vi.fn(async ({ cliente_id } = {}) => {
    let filas = estado.accesos;
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
const tokenRecep = () =>
  firmarToken({ sub: 2, nombre: 'Ana', email: 'r@g.test', rol: 'recepcionista' });
const tokenEntrena = () =>
  firmarToken({ sub: 3, nombre: 'Eva', email: 'e@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 4, nombre: 'Carl', email: 'c@g.test', rol: 'cliente' });

function sembrar(membresia) {
  estado.clientes = [
    { id: 1, nombre_completo: 'Lucía Torres', estado: 'activo' },
    { id: 2, nombre_completo: 'Otro Cliente', estado: 'activo' },
  ];
  estado.rostros = [
    {
      cliente_id: 1,
      descriptor_facial: serializarDescriptor(vectorBase()),
    },
  ];
  estado.membresias = membresia ? [{ cliente_id: 1, ...membresia }] : [];
  estado.accesos = [];
}

beforeEach(() => {
  sembrar({ estado: 'activa', fecha_vencimiento: '2026-11-13' });
});

describe('POST /api/accesos/intento — autorizado (SC-004)', () => {
  it('rostro identificado + membresía activa vigente → autorizado', async () => {
    const res = await request(app)
      .post('/api/accesos/intento')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ descriptor: vectorCercano() });

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe('Acceso autorizado');
    expect(res.body.datos).toMatchObject({
      resultado: 'autorizado',
      motivo: null,
      cliente: { id: 1, nombre: 'Lucía Torres' },
      membresia: { estado: 'activa', fecha_vencimiento: '2026-11-13' },
    });
  });

  it('registra el intento autorizado en accesos (FR-015)', async () => {
    await request(app)
      .post('/api/accesos/intento')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ descriptor: vectorCercano() });

    expect(estado.accesos).toHaveLength(1);
    expect(estado.accesos[0]).toMatchObject({
      cliente_id: 1,
      resultado: 'autorizado',
      motivo_rechazo: null,
    });
  });
});

describe('POST /api/accesos/intento — motivos cerrados (SC-005, R-23)', () => {
  const casos = [
    ['membresia_vencida', { estado: 'vencida', fecha_vencimiento: '2026-09-01' }],
    [
      'membresia_vencida (activa con fecha pasada)',
      { estado: 'activa', fecha_vencimiento: '2026-09-01' },
    ],
    ['membresia_suspendida', { estado: 'suspendida', fecha_vencimiento: '2026-11-13' }],
    ['membresia_cancelada', { estado: 'cancelada', fecha_vencimiento: '2026-11-13' }],
  ];

  for (const [etiqueta, membresia] of casos) {
    it(`rechaza con motivo correcto: ${etiqueta}`, async () => {
      sembrar(membresia);

      const res = await request(app)
        .post('/api/accesos/intento')
        .set('Authorization', `Bearer ${tokenRecep()}`)
        .send({ descriptor: vectorCercano() });

      expect(res.status).toBe(200);
      expect(res.body.datos.resultado).toBe('rechazado');
      expect(res.body.datos.motivo).toMatch(/^membresia_(vencida|suspendida|cancelada)$/);
      expect(res.body.datos.cliente).toMatchObject({ id: 1, nombre: 'Lucía Torres' });
      expect(res.body.mensaje).toContain('rechazado');
    });
  }

  it('rechaza con sin_membresia cuando no tiene ninguna', async () => {
    sembrar(null);

    const res = await request(app)
      .post('/api/accesos/intento')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ descriptor: vectorCercano() });

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({
      resultado: 'rechazado',
      motivo: 'sin_membresia',
    });
  });
});

describe('POST /api/accesos/intento — rostro no identificado (SC-006)', () => {
  it('descriptor sin coincidencia → cliente y membresia null (HU6-5)', async () => {
    const res = await request(app)
      .post('/api/accesos/intento')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ descriptor: vectorLejano() });

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({
      resultado: 'rechazado',
      motivo: 'rostro_no_identificado',
      cliente: null,
      membresia: null,
    });
    expect(res.body.mensaje).toBe('No fue posible identificar al cliente');
  });

  it('descriptor null (cámara no disponible) → rostro_no_identificado', async () => {
    const res = await request(app)
      .post('/api/accesos/intento')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ descriptor: null });

    expect(res.status).toBe(200);
    expect(res.body.datos.motivo).toBe('rostro_no_identificado');
    expect(estado.accesos[0].cliente_id).toBeNull();
  });

  it('la coincidencia facial sola NUNCA autoriza: valida la membresía (FR-013)', async () => {
    sembrar(null); // rostro registrado pero sin membresía
    const res = await request(app)
      .post('/api/accesos/intento')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ descriptor: vectorCercano() });

    expect(res.body.datos.resultado).toBe('rechazado');
    expect(res.body.datos.motivo).toBe('sin_membresia');
  });

  it('responde 400 DESCRIPTOR_INVALIDO si no son 128 valores', async () => {
    const res = await request(app)
      .post('/api/accesos/intento')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ descriptor: [0.1, 0.2] });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DESCRIPTOR_INVALIDO');
  });

  it('responde 400 si falta el descriptor en el cuerpo', async () => {
    const res = await request(app)
      .post('/api/accesos/intento')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });
});

describe('POST /api/accesos/intento — matriz de permisos', () => {
  it('responde 403 para entrenador y cliente (solo terminal de acceso)', async () => {
    for (const token of [tokenEntrena(), tokenCliente()]) {
      const res = await request(app)
        .post('/api/accesos/intento')
        .set('Authorization', `Bearer ${token}`)
        .send({ descriptor: vectorCercano() });
      expect(res.status).toBe(403);
    }
  });

  it('responde 401 sin token', async () => {
    const res = await request(app)
      .post('/api/accesos/intento')
      .send({ descriptor: vectorCercano() });
    expect(res.status).toBe(401);
  });
});
