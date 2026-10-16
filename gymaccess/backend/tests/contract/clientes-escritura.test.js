// T029 [US3] Contrato de escritura de clientes (contracts/api.md).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({ clientes: [], siguienteId: 1 }));

vi.mock('../../src/models/cliente.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.siguienteId++;
    estado.clientes.push({
      id,
      nombre_completo: datos.nombre_completo,
      telefono: datos.telefono ?? null,
      correo: datos.correo ?? null,
      notas: datos.notas ?? null,
      usuario_id: datos.usuario_id ?? null,
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
  findDuplicate: vi.fn(async (datos, excludeId) => {
    return (
      estado.clientes.find(
        (c) =>
          c.id !== Number(excludeId ?? -1) &&
          c.nombre_completo === datos.nombre_completo &&
          (c.telefono === datos.telefono || c.correo === datos.correo)
      ) ?? null
    );
  }),
  listar: vi.fn(async () => estado.clientes),
}));

vi.mock('../../src/models/usuario.model.js', () => ({
  findByEmail: vi.fn(async () => null),
  findById: vi.fn(async () => null),
  listar: vi.fn(async () => []),
  crear: vi.fn(),
  actualizar: vi.fn(),
  actualizarIntentos: vi.fn(),
  limpiarBloqueo: vi.fn(),
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
  estado.clientes = [];
  estado.siguienteId = 1;
});

describe('POST /api/clientes', () => {
  it('crea un cliente válido con 201 (admin)', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({
        nombre_completo: 'Laura Gómez',
        telefono: '555-1111',
        correo: 'laura@g.test',
      });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({ nombre_completo: 'Laura Gómez' });
  });

  it('responde 400 si falta el nombre', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ telefono: '555-2222' });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 400 si no hay teléfono ni correo', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ nombre_completo: 'Sin Contacto' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error.detalles)).toContain(
      'al menos un teléfono o un correo'
    );
  });

  it('409 ante posible duplicado y 201 al confirmar (Q4)', async () => {
    await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ nombre_completo: 'Laura Gómez', telefono: '555-1111' });

    const aviso = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ nombre_completo: 'Laura Gómez', telefono: '555-1111' });

    expect(aviso.status).toBe(409);
    expect(aviso.body.error.codigo).toBe('POSIBLE_DUPLICADO');
    expect(aviso.body.error.detalles.coincidencia).toMatchObject({
      nombre_completo: 'Laura Gómez',
    });

    const confirmado = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({
        nombre_completo: 'Laura Gómez',
        telefono: '555-1111',
        confirmar_duplicado: true,
      });

    expect(confirmado.status).toBe(201);
    expect(estado.clientes).toHaveLength(2);
  });

  it('403 para entrenador y cliente (matriz de permisos)', async () => {
    const entrenador = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenEntrena()}`)
      .send({ nombre_completo: 'X', telefono: '1' });
    expect(entrenador.status).toBe(403);

    const cliente = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenCliente()}`)
      .send({ nombre_completo: 'Y', telefono: '2' });
    expect(cliente.status).toBe(403);
  });
});

describe('PUT /api/clientes/:id', () => {
  it('actualiza los datos con 200 (recepcionista)', async () => {
    const creado = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ nombre_completo: 'Pedro Sol', telefono: '555-3333' });

    const res = await request(app)
      .put(`/api/clientes/${creado.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ telefono: '555-9999' });

    expect(res.status).toBe(200);
    expect(res.body.datos.telefono).toBe('555-9999');
  });

  it('responde 404 si el cliente no existe', async () => {
    const res = await request(app)
      .put('/api/clientes/999')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ telefono: '555-0000' });

    expect(res.status).toBe(404);
  });
});

describe('FR-014: sin eliminación física de clientes', () => {
  it('no existe endpoint DELETE /api/clientes/:id', async () => {
    const creado = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre_completo: 'Permanente', telefono: '555-4444' });

    const res = await request(app)
      .delete(`/api/clientes/${creado.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(404);
    expect(estado.clientes).toHaveLength(1);
  });
});
