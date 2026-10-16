// T022 [US2] Contrato de administración de usuarios (contracts/api.md).

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({ usuarios: [], siguienteId: 2 }));

vi.mock('../../src/models/usuario.model.js', () => ({
  findByEmail: vi.fn(async (email) =>
    estado.usuarios.find((u) => u.email === email) ?? null
  ),
  findById: vi.fn(async (id) =>
    estado.usuarios.find((u) => u.id === Number(id)) ?? null
  ),
  listar: vi.fn(async () => estado.usuarios),
  crear: vi.fn(async (datos) => {
    const id = estado.siguienteId++;
    estado.usuarios.push({
      id,
      nombre: datos.nombre,
      email: datos.email,
      contrasena_hash: datos.contrasena_hash,
      rol: datos.rol,
      estado: 'activo',
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    });
    return id;
  }),
  actualizar: vi.fn(async (id, campos) => {
    const u = estado.usuarios.find((x) => x.id === Number(id));
    if (u) Object.assign(u, campos);
    return Boolean(u);
  }),
  actualizarIntentos: vi.fn(async () => true),
  limpiarBloqueo: vi.fn(async () => true),
}));

import app from '../../src/app.js';

let tokenAdmin;
let tokenRecepcion;

beforeAll(async () => {
  const hash = await bcrypt.hash('Admin1234', 10);
  tokenAdmin = firmarToken({
    sub: 1,
    nombre: 'Administrador',
    email: 'admin@gimnasio.test',
    rol: 'administrador',
  });
  tokenRecepcion = firmarToken({
    sub: 9,
    nombre: 'Ana',
    email: 'recep@gimnasio.test',
    rol: 'recepcionista',
  });
  estado.usuarios = [
    {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@gimnasio.test',
      contrasena_hash: hash,
      rol: 'administrador',
      estado: 'activo',
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    },
  ];
});

beforeEach(() => {
  estado.usuarios = estado.usuarios.slice(0, 1);
  estado.siguienteId = 2;
});

describe('POST /api/usuarios (administrador)', () => {
  it('crea un usuario con 201 y nunca devuelve el hash', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: 'Ana Pérez',
        email: 'ana@gimnasio.test',
        contraseña: 'Clave1234',
        rol: 'recepcionista',
      });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      nombre: 'Ana Pérez',
      rol: 'recepcionista',
      estado: 'activo',
    });
    expect(JSON.stringify(res.body)).not.toContain('contrasena_hash');
  });

  it('rechaza con 400 una contraseña que no cumple la política', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: 'Debil',
        email: 'debil@gimnasio.test',
        contraseña: 'corta',
        rol: 'recepcionista',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
    expect(JSON.stringify(res.body.error.detalles)).toContain(
      'mínimo 8 caracteres'
    );
  });

  it('responde 409 con correo duplicado', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: 'Copia',
        email: 'admin@gimnasio.test',
        contraseña: 'Clave1234',
        rol: 'recepcionista',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('DUPLICADO');
  });
});

describe('Permisos de administración de usuarios (FR-006)', () => {
  it('responde 403 a un rol que no es administrador', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenRecepcion}`)
      .send({
        nombre: 'X',
        email: 'x@gimnasio.test',
        contraseña: 'Clave1234',
        rol: 'recepcionista',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('SIN_PERMISO');
  });

  it('responde 401 sin token', async () => {
    const res = await request(app).get('/api/usuarios');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/usuarios/:id', () => {
  it('permite cambiar el rol y el estado sin borrar el registro', async () => {
    const res = await request(app)
      .put('/api/usuarios/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: 'recepcionista', estado: 'deshabilitado' });

    expect(res.status).toBe(200);
    expect(res.body.datos.rol).toBe('recepcionista');
    expect(res.body.datos.estado).toBe('deshabilitado');
    expect(estado.usuarios).toHaveLength(1);
  });

  it('responde 404 si el usuario no existe', async () => {
    const res = await request(app)
      .put('/api/usuarios/999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Nadie' });

    expect(res.status).toBe(404);
  });
});

describe('FR-014: sin eliminación física', () => {
  it('no existe endpoint DELETE /api/usuarios/:id', async () => {
    const res = await request(app)
      .delete('/api/usuarios/1')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(estado.usuarios).toHaveLength(1);
  });
});
