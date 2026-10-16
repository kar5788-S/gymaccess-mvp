// T014 [US1] Flujo de inicio de sesión y bloqueo (quickstart 1–3, 13;
// SC-008, FR-002, FR-016).

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

describe('Flujo de inicio de sesión', () => {
  it('login correcto da acceso a una ruta protegida (sin token → 401)', async () => {
    const sinToken = await request(app).get('/api/usuarios');
    expect(sinToken.status).toBe(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Admin1234' });
    expect(login.status).toBe(200);

    const protegida = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${login.body.datos.token}`);
    expect(protegida.status).toBe(200);
  });

  it('el token expira en 8 horas (FR-016, clarificación Q5)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Admin1234' });

    const payload = jwt.decode(login.body.datos.token);
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
  });

  it('un login exitoso limpia el contador de intentos (R-07)', async () => {
    estado.usuarios[0].intentos_fallidos = 3;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Admin1234' });

    expect(res.status).toBe(200);
    expect(estado.usuarios[0].intentos_fallidos).toBe(0);
    expect(estado.usuarios[0].bloqueado_hasta).toBeNull();
  });

  it('SC-008: rechaza los intentos durante el bloqueo de 15 minutos', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@gimnasio.test', contraseña: 'Mala12345' });
    }

    expect(estado.usuarios[0].bloqueado_hasta).not.toBeNull();

    const duranteBloqueo = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Admin1234' });
    expect(duranteBloqueo.status).toBe(423);

    // Simula la pasada de los 15 minutos: la cuenta vuelve a permitir login.
    estado.usuarios[0].bloqueado_hasta = new Date(Date.now() - 1000);
    const despues = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gimnasio.test', contraseña: 'Admin1234' });
    expect(despues.status).toBe(200);
  });
});
