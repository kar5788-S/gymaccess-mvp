// T007 [US1] Contrato de perfiles de entrenador (contracts/api.md).
// Alta solo administrador; validación de cuenta con rol entrenador activo;
// unicidad del vínculo; modificación con baja lógica y sin borrado.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => {
  // Emula el JOIN con usuarios que hace entrenador.model (alias usuario_*).
  const conUsuario = (fila) => {
    if (!fila) return null;
    const u = estado.usuarios.find((x) => x.id === fila.usuario_id);
    return {
      ...fila,
      usuario_nombre: u?.nombre ?? null,
      usuario_email: u?.email ?? null,
      usuario_rol: u?.rol ?? null,
    };
  };
  return {
    entrenadores: [],
    siguienteId: 1,
    conUsuario,
    usuarios: [
      { id: 1, nombre: 'Eva Entrenadora', email: 'e1@g.test', rol: 'entrenador', estado: 'activo' },
      { id: 2, nombre: 'Rita Recepcion', email: 'r@g.test', rol: 'recepcionista', estado: 'activo' },
      { id: 3, nombre: 'Desha Entrenador', email: 'e3@g.test', rol: 'entrenador', estado: 'deshabilitado' },
      { id: 4, nombre: 'Clara Cliente', email: 'c@g.test', rol: 'cliente', estado: 'activo' },
      { id: 5, nombre: 'Enzo Entrenador', email: 'e5@g.test', rol: 'entrenador', estado: 'activo' },
    ],
  };
});

vi.mock('../../src/models/entrenador.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.siguienteId++;
    estado.entrenadores.push({
      id,
      usuario_id: datos.usuario_id,
      nombre: datos.nombre,
      telefono: datos.telefono ?? null,
      especialidad: datos.especialidad ?? null,
      estado: datos.estado ?? 'activo',
    });
    return id;
  }),
  listar: vi.fn(async ({ estado: filtro } = {}) => {
    const filas = filtro
      ? estado.entrenadores.filter((e) => e.estado === filtro)
      : [...estado.entrenadores];
    return filas.map((f) => estado.conUsuario(f));
  }),
  findById: vi.fn(async (id) =>
    estado.conUsuario(estado.entrenadores.find((e) => e.id === Number(id)) ?? null)
  ),
  findByUsuarioId: vi.fn(async (usuarioId) =>
    estado.conUsuario(
      estado.entrenadores.find((e) => e.usuario_id === Number(usuarioId)) ?? null
    )
  ),
  actualizar: vi.fn(async (id, campos) => {
    const e = estado.entrenadores.find((x) => x.id === Number(id));
    if (e) Object.assign(e, campos);
    return Boolean(e);
  }),
  contarAsignacionesVigentes: vi.fn(async () => 0),
}));

vi.mock('../../src/models/usuario.model.js', () => ({
  findById: vi.fn(async (id) =>
    estado.usuarios.find((u) => u.id === Number(id)) ?? null
  ),
}));

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
}));

// El alta valida el vínculo dentro de una transacción (R-28); los modelos
// están en memoria, así que la transacción se ejecuta sin conexión real.
vi.mock('../../src/utils/transaccion.js', () => ({
  conTransaccion: vi.fn(async (operacion) => operacion(null)),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 100, nombre: 'Admin', email: 'a@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 101, nombre: 'Ana', email: 'r2@g.test', rol: 'recepcionista' });
const tokenEntrena = () =>
  firmarToken({ sub: 102, nombre: 'Eva', email: 'e2@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 103, nombre: 'Carl', email: 'c2@g.test', rol: 'cliente' });

const alta = (token, cuerpo) =>
  request(app).post('/api/entrenadores').set('Authorization', `Bearer ${token}`).send(cuerpo);

beforeEach(() => {
  estado.entrenadores = [];
  estado.siguienteId = 1;
});

describe('POST /api/entrenadores (US1)', () => {
  it('crea un perfil de entrenador con 201 y estado activo', async () => {
    const res = await alta(tokenAdmin(), {
      usuario_id: 1,
      nombre: 'Eva Entrenadora',
      telefono: '555-1234',
      especialidad: 'Fuerza',
    });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      usuario_id: 1,
      nombre: 'Eva Entrenadora',
      estado: 'activo',
    });
    expect(res.body.datos.usuario).toMatchObject({ id: 1, rol: 'entrenador' });
    expect(res.body.mensaje).toContain('registrado');
  });

  it('rechaza el alta sin usuario_id o sin nombre con 400 VALIDACION', async () => {
    const sinUsuario = await alta(tokenAdmin(), { nombre: 'Sin cuenta' });
    expect(sinUsuario.status).toBe(400);
    expect(sinUsuario.body.error.codigo).toBe('VALIDACION');

    const sinNombre = await alta(tokenAdmin(), { usuario_id: 1 });
    expect(sinNombre.status).toBe(400);
    expect(sinNombre.body.error.codigo).toBe('VALIDACION');
    expect(JSON.stringify(sinNombre.body.error.detalles)).toContain('obligatorio');
  });

  it('rechaza un usuario sin rol entrenador con 409 ENTRENADOR_NO_VALIDO', async () => {
    const res = await alta(tokenAdmin(), { usuario_id: 2, nombre: 'No es entrenador' });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ENTRENADOR_NO_VALIDO');
    expect(res.body.error.mensaje).not.toContain('SELECT');
  });

  it('rechaza un usuario deshabilitado con 409 ENTRENADOR_NO_VALIDO', async () => {
    const res = await alta(tokenAdmin(), { usuario_id: 3, nombre: 'Deshabilitado' });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ENTRENADOR_NO_VALIDO');
  });

  it('rechaza una cuenta ya vinculada con 409 USUARIO_YA_ENTRENADOR', async () => {
    const primera = await alta(tokenAdmin(), { usuario_id: 1, nombre: 'Primera' });
    expect(primera.status).toBe(201);

    const segunda = await alta(tokenAdmin(), { usuario_id: 1, nombre: 'Segunda' });
    expect(segunda.status).toBe(409);
    expect(segunda.body.error.codigo).toBe('USUARIO_YA_ENTRENADOR');
    expect(estado.entrenadores).toHaveLength(1);
  });

  it('responde 404 si el usuario indicado no existe', async () => {
    const res = await alta(tokenAdmin(), { usuario_id: 999, nombre: 'Fantasma' });

    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('NO_ENCONTRADO');
  });

  it('el alta es exclusiva del administrador: 403 a los demás roles', async () => {
    for (const token of [tokenRecep(), tokenEntrena(), tokenCliente()]) {
      const res = await alta(token, { usuario_id: 5, nombre: 'Sin permiso' });
      expect(res.status).toBe(403);
    }
    expect(estado.entrenadores).toHaveLength(0);
  });
});

describe('GET /api/entrenadores (US1)', () => {
  it('lista los perfiles para administrador y recepcionista con su usuario', async () => {
    await alta(tokenAdmin(), { usuario_id: 1, nombre: 'Eva Entrenadora' });
    await alta(tokenAdmin(), { usuario_id: 5, nombre: 'Enzo Entrenador' });

    const admin = await request(app)
      .get('/api/entrenadores')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(admin.status).toBe(200);
    expect(admin.body.datos).toHaveLength(2);
    expect(admin.body.datos[0].usuario).toMatchObject({ rol: 'entrenador' });

    const recep = await request(app)
      .get('/api/entrenadores')
      .set('Authorization', `Bearer ${tokenRecep()}`);
    expect(recep.status).toBe(200);
    expect(recep.body.datos).toHaveLength(2);
  });

  it('responde 403 a entrenador y cliente', async () => {
    const entrenador = await request(app)
      .get('/api/entrenadores')
      .set('Authorization', `Bearer ${tokenEntrena()}`);
    expect(entrenador.status).toBe(403);

    const cliente = await request(app)
      .get('/api/entrenadores')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(cliente.status).toBe(403);
  });
});

describe('PUT /api/entrenadores/:id (US1)', () => {
  it('modifica datos del perfil con 200 (administrador)', async () => {
    await alta(tokenAdmin(), { usuario_id: 1, nombre: 'Eva Entrenadora' });

    const res = await request(app)
      .put('/api/entrenadores/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ especialidad: 'Movilidad' });

    expect(res.status).toBe(200);
    expect(res.body.datos.especialidad).toBe('Movilidad');
    expect(res.body.datos.nombre).toBe('Eva Entrenadora');
  });

  it('la baja lógica pasa el perfil a inactivo sin borrar nada (FR-025)', async () => {
    await alta(tokenAdmin(), { usuario_id: 1, nombre: 'Eva Entrenadora' });

    const res = await request(app)
      .put('/api/entrenadores/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'inactivo' });

    expect(res.status).toBe(200);
    expect(res.body.datos.estado).toBe('inactivo');
    expect(estado.entrenadores).toHaveLength(1);
  });

  it('rechaza un estado fuera del catálogo con 400', async () => {
    await alta(tokenAdmin(), { usuario_id: 1, nombre: 'Eva Entrenadora' });

    const res = await request(app)
      .put('/api/entrenadores/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'borrado' });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 404 si el perfil no existe y 403 a roles sin permiso', async () => {
    const inexistente = await request(app)
      .put('/api/entrenadores/999')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ nombre: 'Nadie' });
    expect(inexistente.status).toBe(404);

    await alta(tokenAdmin(), { usuario_id: 1, nombre: 'Eva Entrenadora' });
    const recep = await request(app)
      .put('/api/entrenadores/1')
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ nombre: 'Intento' });
    expect(recep.status).toBe(403);
  });
});

describe('Sin eliminación física de perfiles (FR-025)', () => {
  it('no existe endpoint DELETE /api/entrenadores/:id', async () => {
    await alta(tokenAdmin(), { usuario_id: 1, nombre: 'Eva Entrenadora' });

    const res = await request(app)
      .delete('/api/entrenadores/1')
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(404);
    expect(estado.entrenadores).toHaveLength(1);
  });
});
