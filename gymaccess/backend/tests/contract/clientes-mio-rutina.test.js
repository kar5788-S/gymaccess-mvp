// T046 [US5] Contrato de las consultas propias del cliente
// (contracts/api.md): su rutina activa con ejercicios y su historial de
// objetivos/progresos — solo lo suyo, en modo solo lectura (FR-014,
// FR-015, SC-005; clarify Q4: ningún otro rol accede).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({
  // Datos de dos clientes: el autenticado (usuario 500) y un tercero
  // cuyos datos NUNCA deben aparecer en las consultas /mio.
  fijos: {
    clientes: [
      { id: 20, usuario_id: 500, nombre_completo: 'Carl Cliente', estado: 'activo' },
      { id: 21, usuario_id: 501, nombre_completo: 'De Otro Cliente', estado: 'activo' },
    ],
    rutinas: [
      {
        id: 1,
        cliente_id: 20,
        entrenador_id: 1,
        nombre: 'Plan vigente de Carl',
        estado: 'activa',
        entrenador: 'Eva Fuerza',
        cliente: 'Carl Cliente',
      },
      {
        id: 2,
        cliente_id: 20,
        entrenador_id: 1,
        nombre: 'Plan archivado de Carl',
        estado: 'archivada',
        entrenador: 'Eva Fuerza',
        cliente: 'Carl Cliente',
      },
      {
        id: 3,
        cliente_id: 21,
        entrenador_id: 2,
        nombre: 'Plan ajeno',
        estado: 'activa',
        entrenador: 'Iván Cardio',
        cliente: 'De Otro Cliente',
      },
    ],
    ejercicios: [
      { id: 1, rutina_id: 1, nombre: 'Press', series: 4, repeticiones: 8, instrucciones: null, orden: 1 },
      { id: 2, rutina_id: 1, nombre: 'Plancha', series: null, repeticiones: null, instrucciones: '45 segundos', orden: 2 },
    ],
    objetivos: [
      { id: 1, cliente_id: 20, descripcion: 'Meta primera', meta: null, fecha_limite: null, estado: 'en curso', cliente: 'Carl Cliente' },
      { id: 2, cliente_id: 20, descripcion: 'Meta segunda', meta: null, fecha_limite: null, estado: 'cumplido', cliente: 'Carl Cliente' },
      { id: 3, cliente_id: 21, descripcion: 'Meta ajena', meta: null, fecha_limite: null, estado: 'en curso', cliente: 'De Otro Cliente' },
    ],
    progresos: [
      { id: 1, cliente_id: 20, objetivo_id: 1, fecha: '2026-10-06', peso: 71, medidas: null, marca: null, comentario: null, cliente: 'Carl Cliente', objetivo: 'Meta primera' },
      { id: 2, cliente_id: 20, objetivo_id: null, fecha: '2026-10-01', peso: 72.4, medidas: null, marca: null, comentario: 'Inicio', cliente: 'Carl Cliente', objetivo: null },
      { id: 3, cliente_id: 21, objetivo_id: null, fecha: '2026-10-03', peso: 90, medidas: null, marca: null, comentario: 'Tercero', cliente: 'De Otro Cliente', objetivo: null },
    ],
  },
  clientes: [],
  rutinas: [],
  ejercicios: [],
  objetivos: [],
  progresos: [],
}));

vi.mock('../../src/models/cliente.model.js', () => ({
  findByUsuarioId: vi.fn(async (usuarioId) =>
    estado.clientes.find((c) => c.usuario_id === Number(usuarioId)) ?? null
  ),
  findById: vi.fn(async (id) =>
    estado.clientes.find((c) => c.id === Number(id)) ?? null
  ),
  findDuplicate: vi.fn(async () => null),
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
  actualizar: vi.fn(async () => true),
}));

vi.mock('../../src/models/rutina.model.js', () => ({
  listar: vi.fn(async (filtros = {}) =>
    estado.rutinas
      .filter(
        (r) =>
          (filtros.cliente_id === undefined ||
            r.cliente_id === Number(filtros.cliente_id)) &&
          (filtros.estado === undefined || r.estado === filtros.estado) &&
          (filtros.cliente_ids === undefined || filtros.cliente_ids.includes(r.cliente_id))
      )
      .sort((a, b) => b.id - a.id)
  ),
  findEjerciciosPorRutina: vi.fn(async (rutinaId) =>
    estado.ejercicios
      .filter((e) => e.rutina_id === Number(rutinaId))
      .sort((a, b) => a.orden - b.orden)
  ),
  findById: vi.fn(async () => null),
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
  contarEjercicios: vi.fn(async () => 0),
  reemplazarEjercicios: vi.fn(async () => 0),
  archivarActivasDeCliente: vi.fn(async () => 0),
  cambiarEstado: vi.fn(async () => true),
}));

vi.mock('../../src/models/objetivo.model.js', () => ({
  listar: vi.fn(async (filtros = {}) =>
    estado.objetivos
      .filter(
        (o) =>
          (filtros.cliente_id === undefined ||
            o.cliente_id === Number(filtros.cliente_id)) &&
          (filtros.estado === undefined || o.estado === filtros.estado)
      )
      .sort((a, b) => b.id - a.id)
  ),
  findById: vi.fn(async () => null),
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
}));

vi.mock('../../src/models/progreso.model.js', () => ({
  listar: vi.fn(async (filtros = {}) =>
    estado.progresos
      .filter(
        (p) =>
          (filtros.cliente_id === undefined ||
            p.cliente_id === Number(filtros.cliente_id)) &&
          (filtros.objetivo_id === undefined ||
            p.objetivo_id === Number(filtros.objetivo_id)) &&
          (filtros.desde === undefined || p.fecha >= filtros.desde) &&
          (filtros.hasta === undefined || p.fecha <= filtros.hasta)
      )
      .sort((a, b) => (a.fecha === b.fecha ? a.id - b.id : a.fecha < b.fecha ? -1 : 1))
  ),
  findById: vi.fn(async () => null),
  crear: vi.fn(async () => 1),
  actualizar: vi.fn(async () => true),
}));

// Ninguna consulta propia usa transacciones; se mockea porque otras
// historias las usan y las rutas están montadas en la misma app.
vi.mock('../../src/utils/transaccion.js', () => ({
  conTransaccion: vi.fn(async (operacion) => operacion(null)),
}));

import app from '../../src/app.js';

const tokenCliente = () =>
  firmarToken({ sub: 500, nombre: 'Carl', email: 'cl@g.test', rol: 'cliente' });
const tokenSinFicha = () =>
  firmarToken({ sub: 599, nombre: 'SinFicha', email: 'sf@g.test', rol: 'cliente' });
const tokenAdmin = () =>
  firmarToken({ sub: 502, nombre: 'Admin', email: 'a5@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 503, nombre: 'Rita', email: 'r6@g.test', rol: 'recepcionista' });
const tokenEntrena = () =>
  firmarToken({ sub: 102, nombre: 'Eva', email: 'e7@g.test', rol: 'entrenador' });

const miRutina = () =>
  request(app).get('/api/clientes/mio/rutina').set('Authorization', `Bearer ${tokenCliente()}`);
const miProgreso = () =>
  request(app).get('/api/clientes/mio/progreso').set('Authorization', `Bearer ${tokenCliente()}`);

beforeEach(() => {
  // Copias frescas: alguna prueba altera el estado de una rutina.
  estado.clientes = estado.fijos.clientes.map((c) => ({ ...c }));
  estado.rutinas = estado.fijos.rutinas.map((r) => ({ ...r }));
  estado.ejercicios = estado.fijos.ejercicios.map((e) => ({ ...e }));
  estado.objetivos = estado.fijos.objetivos.map((o) => ({ ...o }));
  estado.progresos = estado.fijos.progresos.map((p) => ({ ...p }));
});

describe('GET /api/clientes/mio/rutina (US5)', () => {
  it('devuelve la rutina activa del cliente con sus ejercicios (HU5 esc.1)', async () => {
    const res = await miRutina();

    expect(res.status).toBe(200);
    expect(res.body.datos.rutina).toMatchObject({
      id: 1,
      nombre: 'Plan vigente de Carl',
      estado: 'activa',
      entrenador: 'Eva Fuerza',
    });
    expect(res.body.datos.rutina.ejercicios).toHaveLength(2);
    expect(res.body.datos.rutina.ejercicios.map((e) => e.orden)).toEqual([1, 2]);
    // Nunca datos de terceros ni planes archivados.
    expect(JSON.stringify(res.body.datos)).not.toContain('Plan ajeno');
    expect(JSON.stringify(res.body.datos)).not.toContain('Plan archivado');
  });

  it('con solo rutinas archivadas responde 200, rutina null y mensaje claro (HU5 esc.3)', async () => {
    estado.rutinas.find((r) => r.id === 1).estado = 'archivada';

    const res = await miRutina();

    expect(res.status).toBe(200);
    expect(res.body.datos.rutina).toBeNull();
    expect(res.body.datos.mensaje).toContain('rutina activa');
    expect(res.body.mensaje).toContain('rutina activa');
    expect(res.body.exito).toBe(true);
  });

  it('responde 403 a administrador, recepcionista y entrenador', async () => {
    for (const token of [tokenAdmin(), tokenRecep(), tokenEntrena()]) {
      const res = await request(app)
        .get('/api/clientes/mio/rutina')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });

  it('una cuenta cliente sin ficha vinculada recibe 404', async () => {
    const res = await request(app)
      .get('/api/clientes/mio/rutina')
      .set('Authorization', `Bearer ${tokenSinFicha()}`);

    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('NO_ENCONTRADO');
  });
});

describe('GET /api/clientes/mio/progreso (US5)', () => {
  it('devuelve solo los objetivos y progresos propios en orden de fecha (HU5 esc.2, SC-005)', async () => {
    const res = await miProgreso();

    expect(res.status).toBe(200);
    expect(res.body.datos.objetivos).toHaveLength(2);
    expect(res.body.datos.objetivos.map((o) => o.id)).toEqual([1, 2]);
    expect(res.body.datos.progresos).toHaveLength(2);
    expect(res.body.datos.progresos.map((p) => p.fecha)).toEqual([
      '2026-10-01',
      '2026-10-06',
    ]);
    expect(res.body.datos.progresos.every((p) => p.cliente_id === 20)).toBe(true);

    // Nunca información de terceros (HU5 esc.4).
    const serializado = JSON.stringify(res.body.datos);
    expect(serializado).not.toContain('Meta ajena');
    expect(serializado).not.toContain('De Otro Cliente');
    expect(serializado).not.toContain('Tercero');
  });

  it('responde 403 a administrador, recepcionista y entrenador', async () => {
    for (const token of [tokenAdmin(), tokenRecep(), tokenEntrena()]) {
      const res = await request(app)
        .get('/api/clientes/mio/progreso')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });

  it('una cuenta cliente sin ficha vinculada recibe 404', async () => {
    const res = await request(app)
      .get('/api/clientes/mio/progreso')
      .set('Authorization', `Bearer ${tokenSinFicha()}`);

    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('NO_ENCONTRADO');
  });
});
