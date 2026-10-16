// T047 [US5] Contrato de información facial (contracts/api.md, FR-011,
// FR-017, FR-022).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({ clientes: [], rostros: [] }));

function descriptorValido(valor = 0.01) {
  return Array.from({ length: 128 }, (_, i) => valor + i / 10000);
}

vi.mock('../../src/models/rostro.model.js', () => ({
  guardar: vi.fn(async ({ cliente_id, descriptor_facial }) => {
    const existente = estado.rostros.find((r) => r.cliente_id === cliente_id);
    if (existente) {
      existente.descriptor_facial = descriptor_facial;
      existente.fecha_registro = '2026-10-15 09:00:00';
      return { id: existente.id, reemplazado: true };
    }
    const id = estado.rostros.length + 1;
    estado.rostros.push({
      id,
      cliente_id,
      descriptor_facial,
      fecha_registro: '2026-10-15 09:00:00',
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
    estado.rostros.map((r) => ({
      cliente_id: r.cliente_id,
      descriptor_facial: r.descriptor_facial,
    }))
  ),
  eliminarPorCliente: vi.fn(async (clienteId) => {
    const antes = estado.rostros.length;
    estado.rostros = estado.rostros.filter((r) => r.cliente_id !== Number(clienteId));
    return estado.rostros.length < antes;
  }),
}));

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

beforeEach(() => {
  estado.clientes = [
    { id: 1, nombre_completo: 'Lucía Torres', estado: 'activo' },
    { id: 2, nombre_completo: 'Baja Cliente', estado: 'inactivo' },
  ];
  estado.rostros = [];
});

describe('POST /api/rostros', () => {
  it('registra la información facial con 201 y sin exponer el descriptor (FR-017)', async () => {
    const res = await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ cliente_id: 1, descriptor: descriptorValido() });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({ cliente_id: 1, estado: 'activo' });
    expect(res.body.datos).not.toHaveProperty('descriptor_facial');
    expect(JSON.stringify(res.body)).not.toContain('descriptor_facial');
    expect(JSON.stringify(res.body)).not.toContain('descriptor');
  });

  it('reemplaza el descriptor en la misma fila (FR-011)', async () => {
    await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, descriptor: descriptorValido(0.01) });

    await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, descriptor: descriptorValido(0.02) });

    expect(estado.rostros).toHaveLength(1);
    expect(estado.rostros[0].descriptor_facial.length).toBe(512);
  });

  it('responde 400 DESCRIPTOR_INVALIDO si no son 128 valores (R-15)', async () => {
    const res = await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, descriptor: [0.1, 0.2, 0.3] });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DESCRIPTOR_INVALIDO');
  });

  it('responde 400 DESCRIPTOR_INVALIDO si algún valor no es numérico', async () => {
    const mezcla = descriptorValido();
    mezcla[7] = 'no-numérico';

    const res = await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, descriptor: mezcla });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('DESCRIPTOR_INVALIDO');
  });

  it('responde 404 si el cliente no está registrado (FR-011)', async () => {
    const res = await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 999, descriptor: descriptorValido() });

    expect(res.status).toBe(404);
  });

  it('responde 409 CLIENTE_NO_ACTIVO si el cliente está de baja', async () => {
    const res = await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 2, descriptor: descriptorValido() });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CLIENTE_NO_ACTIVO');
  });

  it('responde 403 para cliente y entrenador (matriz de permisos)', async () => {
    for (const token of [tokenCliente(), tokenEntrena()]) {
      const res = await request(app)
        .post('/api/rostros')
        .set('Authorization', `Bearer ${token}`)
        .send({ cliente_id: 1, descriptor: descriptorValido() });
      expect(res.status).toBe(403);
    }
  });
});

describe('GET /api/rostros/:cliente_id', () => {
  it('informa registrado con fecha sin descriptor', async () => {
    await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, descriptor: descriptorValido() });

    const res = await request(app)
      .get('/api/rostros/1')
      .set('Authorization', `Bearer ${tokenRecep()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({ cliente_id: 1, registrado: true });
    expect(res.body.datos.fecha_registro).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('descriptor_facial');
  });

  it('registrado: false no es error (evita 404 en la ficha)', async () => {
    const res = await request(app)
      .get('/api/rostros/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({ cliente_id: 1, registrado: false });
  });

  it('responde 404 ante un cliente inexistente', async () => {
    const res = await request(app)
      .get('/api/rostros/999')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(res.status).toBe(404);
  });

  it('responde 403 para cliente y entrenador', async () => {
    for (const token of [tokenCliente(), tokenEntrena()]) {
      const res = await request(app)
        .get('/api/rostros/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});

describe('FR-022: la baja elimina la información facial', () => {
  it('PUT /api/clientes/:id con estado inactivo borra la fila de rostros (R-27)', async () => {
    await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, descriptor: descriptorValido() });
    expect(estado.rostros).toHaveLength(1);

    const baja = await request(app)
      .put('/api/clientes/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'inactivo' });

    expect(baja.status).toBe(200);
    expect(baja.body.datos.estado).toBe('inactivo');
    expect(estado.rostros).toHaveLength(0); // descriptor eliminado
    expect(estado.clientes).toHaveLength(2); // ficha conservada
  });

  it('una reactivación exige capturar de nuevo (estado registrado: false)', async () => {
    await request(app)
      .post('/api/rostros')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ cliente_id: 1, descriptor: descriptorValido() });

    await request(app)
      .put('/api/clientes/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'inactivo' });
    await request(app)
      .put('/api/clientes/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'activo' });

    const res = await request(app)
      .get('/api/rostros/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(res.body.datos.registrado).toBe(false);
  });
});
