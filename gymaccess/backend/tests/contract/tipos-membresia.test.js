// T011 [US1] Contrato de tipos de membresía (contracts/api.md).
// Alta y modificación solo administrador; recepcionista solo consulta.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({ tipos: [], siguienteId: 1 }));

vi.mock('../../src/models/tipoMembresia.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.siguienteId++;
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
  listar: vi.fn(async ({ estado: filtro } = {}) =>
    filtro ? estado.tipos.filter((t) => t.estado === filtro) : estado.tipos
  ),
  actualizar: vi.fn(async (id, campos) => {
    const t = estado.tipos.find((x) => x.id === Number(id));
    if (t) Object.assign(t, campos);
    return Boolean(t);
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

beforeEach(() => {
  estado.tipos = [];
  estado.siguienteId = 1;
});

describe('POST /api/tipos-membresia', () => {
  it('crea un tipo válido con 201 (administrador)', async () => {
    const res = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Mensual', descripcion: '30 días', duracion_dias: 30, precio: 150 });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      nombre: 'Mensual',
      duracion_dias: 30,
      precio: 150,
      estado: 'activo',
    });
  });

  it('responde 400 si falta el nombre', async () => {
    const res = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ duracion_dias: 30, precio: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('rechaza duracion_dias <= 0 con 400', async () => {
    const res = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Inválido', duracion_dias: 0, precio: 100 });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error.detalles)).toContain('mayor que cero');
  });

  it('rechaza precio negativo con 400', async () => {
    const res = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Inválido', duracion_dias: 30, precio: -5 });

    expect(res.status).toBe(400);
  });

  it('responde 409 si el nombre ya existe', async () => {
    await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Mensual', duracion_dias: 30, precio: 150 });

    const res = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Mensual', duracion_dias: 30, precio: 200 });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('DUPLICADO');
  });

  it('responde 403 para recepcionista, entrenador y cliente (matriz)', async () => {
    for (const token of [tokenRecep(), tokenEntrena(), tokenCliente()]) {
      const res = await request(app)
        .post('/api/tipos-membresia')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'X', duracion_dias: 30, precio: 10 });
      expect(res.status).toBe(403);
    }
  });
});

describe('PUT /api/tipos-membresia/:id', () => {
  it('actualiza precio y duración con 200 (administrador)', async () => {
    const creado = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Mensual', duracion_dias: 30, precio: 150 });

    const res = await request(app)
      .put(`/api/tipos-membresia/${creado.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ precio: 180 });

    expect(res.status).toBe(200);
    expect(res.body.datos.precio).toBe(180);
    expect(res.body.datos.nombre).toBe('Mensual');
  });

  it('permite inactivar un tipo sin borrarlo (FR-002)', async () => {
    const creado = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Semestral', duracion_dias: 180, precio: 700 });

    const res = await request(app)
      .put(`/api/tipos-membresia/${creado.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'inactivo' });

    expect(res.status).toBe(200);
    expect(res.body.datos.estado).toBe('inactivo');
    expect(estado.tipos).toHaveLength(1); // no se borra nada
  });

  it('responde 404 si el tipo no existe', async () => {
    const res = await request(app)
      .put('/api/tipos-membresia/999')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ precio: 100 });

    expect(res.status).toBe(404);
  });

  it('responde 403 para recepcionista (solo lectura)', async () => {
    const creado = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Trimestral', duracion_dias: 90, precio: 400 });

    const res = await request(app)
      .put(`/api/tipos-membresia/${creado.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ precio: 999 });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/tipos-membresia', () => {
  it('lista los tipos para administrador y recepcionista', async () => {
    await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Anual', duracion_dias: 365, precio: 1400 });

    const admin = await request(app)
      .get('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(admin.status).toBe(200);
    expect(admin.body.datos).toHaveLength(1);

    const recep = await request(app)
      .get('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenRecep()}`);
    expect(recep.status).toBe(200);
    expect(recep.body.datos).toHaveLength(1);
  });

  it('responde 403 para entrenador y cliente', async () => {
    const entrenador = await request(app)
      .get('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenEntrena()}`);
    expect(entrenador.status).toBe(403);

    const cliente = await request(app)
      .get('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(cliente.status).toBe(403);
  });
});

describe('FR-002: sin eliminación física de tipos', () => {
  it('no existe endpoint DELETE /api/tipos-membresia/:id', async () => {
    const creado = await request(app)
      .post('/api/tipos-membresia')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Permanente', duracion_dias: 30, precio: 100 });

    const res = await request(app)
      .delete(`/api/tipos-membresia/${creado.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(404);
    expect(estado.tipos).toHaveLength(1);
  });
});
