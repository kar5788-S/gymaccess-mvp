// T013 [US1] Contrato de POST /api/auth/login (contracts/api.md).
// El modelo se sustituye por un doble en memoria: el contrato se valida
// sin depender de MySQL local.

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';

const estado = vi.hoisted(() => ({ usuarios: [] }));

vi.mock('../../src/models/usuario.model.js', () => ({
  findByEmail: vi.fn(async (email) =>
    estado.usuarios.find((u) => u.email === email) ?? null
  ),
  findById: vi.fn(async (id) =>
    estado.usuarios.find((u) => u.id === id) ?? null
  ),
  listar: vi.fn(async () => estado.usuarios),
  crear: vi.fn(),
  actualizar: vi.fn(),
  actualizarIntentos: vi.fn(async (id, intentos, bloqueadoHasta) => {
    const u = estado.usuarios.find((x) => x.id === id);
    if (u) {
      u.intentos_fallidos = intentos;
      u.bloqueado_hasta = bloqueadoHasta;
    }
  }),
  limpiarBloqueo: vi.fn(async (id) => {
    const u = estado.usuarios.find((x) => x.id === id);
    if (u) {
      u.intentos_fallidos = 0;
      u.bloqueado_hasta = null;
    }
  }),
}));

import app from '../../src/app.js';

let hashValida;

beforeAll(async () => {
  hashValida = await bcrypt.hash('Admin1234', 10);
});

beforeEach(() => {
  estado.usuarios = [
    {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@gimnasio.test',
      contrasena_hash: hashValida,
      rol: 'administrador',
      estado: 'activo',
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    },
  ];
});

describe('POST /api/auth/login', () => {
  it('responde 200 con token y datos del usuario con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Admin1234' });

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body.datos.token).toBeTruthy();
    expect(res.body.datos.usuario).toMatchObject({
      email: 'admin@gimnasio.test',
      rol: 'administrador',
    });
    // Nunca se expone el hash.
    expect(JSON.stringify(res.body)).not.toContain('contrasena_hash');
  });

  it('responde 401 con mensaje genérico con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: ' Incorrecta9' });

    expect(res.status).toBe(401);
    expect(res.body.exito).toBe(false);
    expect(res.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
    expect(res.body.error.mensaje).toBe('Correo o contraseña incorrectos.');
  });

  it('responde 401 idéntico cuando la cuenta no existe (no revela existencia)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@gimnasio.test', contraseña: 'Admin1234' });

    expect(res.status).toBe(401);
    expect(res.body.error.mensaje).toBe('Correo o contraseña incorrectos.');
  });

  it('responde 400 cuando faltan campos', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('bloquea 15 minutos al quinto fallo consecutivo y mantiene el bloqueo', async () => {
    for (let i = 1; i <= 4; i += 1) {
      const fallo = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@gimnasio.test', contraseña: 'Mala12345' });
      expect(fallo.status).toBe(401);
    }

    const quinto = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Mala12345' });
    expect(quinto.status).toBe(423);
    expect(quinto.body.error.codigo).toBe('CUENTA_BLOQUEADA');
    expect(quinto.body.error.mensaje).toContain(
      'Cuenta bloqueada temporalmente'
    );

    // Incluso con la contraseña correcta, sigue bloqueada.
    const despues = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Admin1234' });
    expect(despues.status).toBe(423);
    expect(despues.body.error.codigo).toBe('CUENTA_BLOQUEADA');
  });

  it('responde 403 con mensaje claro para cuenta deshabilitada', async () => {
    estado.usuarios[0].estado = 'deshabilitado';

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Admin1234' });

    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('CUENTA_DESHABILITADA');
  });
});
