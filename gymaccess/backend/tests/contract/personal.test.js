// T062 [US7] Contrato del personal asignado (contracts/api.md):
// - `GET /api/entrenadores` enriquecido con `clientes_asignados` (solo
//   asignaciones activas) y filtro `?estado=`; 403 a entrenador y cliente
//   (HU7).
// - `GET /api/entrenadores/:id` con la lista de clientes vigentes.
// - `GET /api/entrenadores/mio/clientes`: solo el entrenador, con estados
//   y fechas de membresía de SU carga y sin importes (Principio VI);
//   sin carga → lista vacía sin error.

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({
  entrenadores: [
    {
      id: 1,
      usuario_id: 102,
      nombre: 'Eva Fuerza',
      telefono: '999111222',
      especialidad: 'Fuerza',
      estado: 'activo',
      usuario_nombre: 'Eva',
      usuario_email: 'eva@g.test',
      usuario_rol: 'entrenador',
    },
    {
      id: 2,
      usuario_id: 205,
      nombre: 'Iván Cardio',
      telefono: null,
      especialidad: 'Cardio',
      estado: 'inactivo',
      usuario_nombre: 'Iván',
      usuario_email: 'ivan@g.test',
      usuario_rol: 'entrenador',
    },
    {
      id: 3,
      usuario_id: 303,
      nombre: 'Sin Carga',
      telefono: null,
      especialidad: null,
      estado: 'activo',
      usuario_nombre: 'SinCarga',
      usuario_email: 'sincarga@g.test',
      usuario_rol: 'entrenador',
    },
  ],
  asignaciones: [
    { id: 1, cliente_id: 10, entrenador_id: 1, estado: 'activa' },
    { id: 2, cliente_id: 11, entrenador_id: 1, estado: 'cerrada' },
    { id: 3, cliente_id: 12, entrenador_id: 2, estado: 'activa' },
    { id: 4, cliente_id: 14, entrenador_id: 1, estado: 'activa' },
  ],
  // Filas crudas de listarCarga: solo clientes con asignación vigente.
  carga: [
    {
      entrenador_id: 1,
      id: 10,
      nombre_completo: 'Lucía Carga',
      correo: 'lucia@g.test',
      telefono: '999000111',
      estado: 'activo',
      membresia_estado: 'activa',
      membresia_vencimiento: '2026-11-30',
    },
    {
      entrenador_id: 1,
      id: 14,
      nombre_completo: 'Sin Membresía',
      correo: null,
      telefono: null,
      estado: 'activo',
      membresia_estado: null,
      membresia_vencimiento: null,
    },
    {
      entrenador_id: 2,
      id: 12,
      nombre_completo: 'Carla Ajena',
      correo: 'carla@g.test',
      telefono: '888777666',
      estado: 'activo',
      membresia_estado: 'vencida',
      membresia_vencimiento: '2026-09-01',
    },
  ],
}));

vi.mock('../../src/models/entrenador.model.js', () => ({
  listar: vi.fn(async (filtros = {}) =>
    estado.entrenadores.filter((e) => filtros.estado === undefined || e.estado === filtros.estado)
  ),
  findById: vi.fn(async (id) =>
    estado.entrenadores.find((e) => e.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async (usuarioId) =>
    estado.entrenadores.find((e) => e.usuario_id === Number(usuarioId)) ?? null
  ),
  contarAsignacionesVigentes: vi.fn(
    async (entrenadorId) =>
      estado.asignaciones.filter(
        (a) => a.entrenador_id === Number(entrenadorId) && a.estado === 'activa'
      ).length
  ),
  listarCarga: vi.fn(async (entrenadorId) =>
    estado.carga
      .filter((c) => c.entrenador_id === Number(entrenadorId))
      .map(({ entrenador_id, ...resto }) => resto)
  ),
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
}));

// Los GET de personal no escriben; se mockea por las rutas de escritura.
vi.mock('../../src/utils/transaccion.js', () => ({
  conTransaccion: vi.fn(async (operacion) => operacion(null)),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 700, nombre: 'Admin', email: 'a7@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 701, nombre: 'Rita', email: 'r8@g.test', rol: 'recepcionista' });
const tokenEntrena1 = () =>
  firmarToken({ sub: 102, nombre: 'Eva', email: 'eva@g.test', rol: 'entrenador' });
const tokenEntrena3 = () =>
  firmarToken({ sub: 303, nombre: 'SinCarga', email: 'sincarga@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 702, nombre: 'Clara', email: 'c9@g.test', rol: 'cliente' });

const sinImportes = (cuerpo) => {
  expect(JSON.stringify(cuerpo)).not.toMatch(/importe|monto|precio|total_pago/i);
};

describe('GET /api/entrenadores (US7: listado enriquecido)', () => {
  it('incluye clientes_asignados con las asignaciones ACTIVAS y el usuario (HU7)', async () => {
    const res = await request(app)
      .get('/api/entrenadores')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    const eva = res.body.datos.find((e) => e.id === 1);
    expect(eva.clientes_asignados).toBe(2); // cliente 11 está en asignación cerrada
    expect(eva.usuario).toMatchObject({ id: 102, email: 'eva@g.test', rol: 'entrenador' });

    const ivan = res.body.datos.find((e) => e.id === 2);
    expect(ivan.clientes_asignados).toBe(1);
    expect(res.body.datos.find((e) => e.id === 3).clientes_asignados).toBe(0);
    sinImportes(res.body);
  });

  it('el recepcionista también consulta la lista con el conteo de carga', async () => {
    const res = await request(app)
      .get('/api/entrenadores')
      .set('Authorization', `Bearer ${tokenRecep()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(3);
    expect(res.body.datos[0].clientes_asignados).toBeGreaterThanOrEqual(0);
  });

  it('el filtro ?estado=filtra y un valor desconocido da 400 VALIDACION', async () => {
    const activos = await request(app)
      .get('/api/entrenadores?estado=activo')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(activos.status).toBe(200);
    expect(activos.body.datos.map((e) => e.id)).toEqual([1, 3]);

    const invalido = await request(app)
      .get('/api/entrenadores?estado=cualquiera')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.codigo).toBe('VALIDACION');
  });

  it('entrenador y cliente reciben 403 en el listado', async () => {
    for (const token of [tokenEntrena1(), tokenCliente()]) {
      const res = await request(app)
        .get('/api/entrenadores')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});

describe('GET /api/entrenadores/:id (US7: ficha con clientes vigentes)', () => {
  it('devuelve la ficha con su usuario y solo los clientes con asignación vigente', async () => {
    const res = await request(app)
      .get('/api/entrenadores/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({
      id: 1,
      nombre: 'Eva Fuerza',
      estado: 'activo',
    });
    expect(res.body.datos.usuario).toMatchObject({ email: 'eva@g.test', rol: 'entrenador' });
    // Solo los vigentes (10 y 14): el cliente 11 quedó fuera por la
    // asignación cerrada y el 12 es de otro entrenador.
    expect(res.body.datos.clientes.map((c) => c.id).sort((a, b) => a - b)).toEqual([10, 14]);
    expect(res.body.datos.clientes[0]).toMatchObject({
      nombre_completo: 'Lucía Carga',
      correo: 'lucia@g.test',
      membresia: { estado: 'activa', fecha_vencimiento: '2026-11-30' },
    });
    sinImportes(res.body);
  });

  it('el recepcionista la consulta; entrenador y cliente reciben 403', async () => {
    const recep = await request(app)
      .get('/api/entrenadores/1')
      .set('Authorization', `Bearer ${tokenRecep()}`);
    expect(recep.status).toBe(200);

    for (const token of [tokenEntrena1(), tokenCliente()]) {
      const res = await request(app)
        .get('/api/entrenadores/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });

  it('responde 404 si el entrenador no existe', async () => {
    const res = await request(app)
      .get('/api/entrenadores/999')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('NO_ENCONTRADO');
  });
});

describe('GET /api/entrenadores/mio/clientes (US7: carga propia)', () => {
  it('devuelve SOLO la carga propia con estados de membresía y sin importes', async () => {
    const res = await request(app)
      .get('/api/entrenadores/mio/clientes')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(2);
    expect(res.body.datos[0]).toEqual({
      id: 10,
      nombre_completo: 'Lucía Carga',
      correo: 'lucia@g.test',
      telefono: '999000111',
      estado: 'activo',
      membresia: { estado: 'activa', fecha_vencimiento: '2026-11-30' },
    });
    // Cliente de otro entrenador jamás aparece; sin membresía → null.
    expect(res.body.datos.map((c) => c.id)).not.toContain(12);
    expect(res.body.datos.find((c) => c.id === 14).membresia).toBeNull();
    sinImportes(res.body);
  });

  it('sin carga devuelve lista vacía y sin error', async () => {
    const res = await request(app)
      .get('/api/entrenadores/mio/clientes')
      .set('Authorization', `Bearer ${tokenEntrena3()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos).toEqual([]);
    expect(res.body.exito).toBe(true);
  });

  it('administrador, recepcionista y cliente reciben 403', async () => {
    for (const token of [tokenAdmin(), tokenRecep(), tokenCliente()]) {
      const res = await request(app)
        .get('/api/entrenadores/mio/clientes')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});
