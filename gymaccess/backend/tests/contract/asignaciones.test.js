// T016 [US2] Contrato de asignaciones de entrenador a cliente
// (contracts/api.md). Escritura solo administrador y recepcionista;
// reasignación cierra la vigente con fecha_fin y conserva el historial
// (FR-004, FR-005, clarify Q2); sin eliminación física (FR-025).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => {
  // Emula los JOIN de nombres que hace asignacion.model al listar.
  const conNombres = (fila) => {
    if (!fila) return null;
    return {
      ...fila,
      cliente: estado.clientes.find((c) => c.id === fila.cliente_id)?.nombre_completo ?? null,
      entrenador:
        estado.entrenadores.find((e) => e.id === fila.entrenador_id)?.nombre ?? null,
    };
  };
  return {
    asignaciones: [],
    siguienteId: 1,
    conNombres,
    clientes: [
      { id: 10, nombre_completo: 'Lucía Asigna', estado: 'activo' },
      { id: 11, nombre_completo: 'Beto Inactivo', estado: 'inactivo' },
      { id: 12, nombre_completo: 'Carla Activa', estado: 'activo' },
    ],
    entrenadores: [
      { id: 1, nombre: 'Eva Fuerza', estado: 'activo' },
      { id: 2, nombre: 'Iván Cardio', estado: 'activo' },
      { id: 3, nombre: 'Omar Baja', estado: 'inactivo' },
    ],
  };
});

vi.mock('../../src/models/asignacion.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.siguienteId++;
    estado.asignaciones.push({
      id,
      cliente_id: datos.cliente_id,
      entrenador_id: datos.entrenador_id,
      fecha_inicio: datos.fecha_inicio,
      fecha_fin: null,
      estado: datos.estado ?? 'activa',
    });
    return id;
  }),
  listar: vi.fn(async (filtros = {}) =>
    estado.asignaciones
      .filter(
        (a) =>
          (filtros.cliente_id === undefined ||
            a.cliente_id === Number(filtros.cliente_id)) &&
          (filtros.entrenador_id === undefined ||
            a.entrenador_id === Number(filtros.entrenador_id)) &&
          (filtros.estado === undefined || a.estado === filtros.estado)
      )
      .map((a) => estado.conNombres(a))
  ),
  findById: vi.fn(async (id) =>
    estado.conNombres(estado.asignaciones.find((a) => a.id === Number(id)) ?? null)
  ),
  findVigentePorCliente: vi.fn(async (clienteId) =>
    estado.conNombres(
      estado.asignaciones.find(
        (a) => a.cliente_id === Number(clienteId) && a.estado === 'activa'
      ) ?? null
    )
  ),
  cerrarVigentePorCliente: vi.fn(async (clienteId, fechaFin) => {
    let cerradas = 0;
    for (const a of estado.asignaciones) {
      if (a.cliente_id === Number(clienteId) && a.estado === 'activa') {
        a.estado = 'cerrada';
        a.fecha_fin = fechaFin;
        cerradas += 1;
      }
    }
    return cerradas;
  }),
  cerrar: vi.fn(async (id, fechaFin) => {
    const a = estado.asignaciones.find((x) => x.id === Number(id));
    if (!a || a.estado !== 'activa') return false;
    a.estado = 'cerrada';
    a.fecha_fin = fechaFin;
    return true;
  }),
}));

vi.mock('../../src/models/cliente.model.js', () => ({
  findById: vi.fn(async (id) =>
    estado.clientes.find((c) => c.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async () => null),
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
  actualizar: vi.fn(async () => true),
}));

vi.mock('../../src/models/entrenador.model.js', () => ({
  findById: vi.fn(async (id) =>
    estado.entrenadores.find((e) => e.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async () => null),
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
  actualizar: vi.fn(async () => true),
  contarAsignacionesVigentes: vi.fn(async () => 0),
}));

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
}));

// R-29: cierre de la vigente e inserción de la nueva en la misma
// transacción; los modelos están en memoria, así que corre sin conexión.
vi.mock('../../src/utils/transaccion.js', () => ({
  conTransaccion: vi.fn(async (operacion) => operacion(null)),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 200, nombre: 'Admin', email: 'a2@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 201, nombre: 'Rita', email: 'r3@g.test', rol: 'recepcionista' });
const tokenEntrena = () =>
  firmarToken({ sub: 202, nombre: 'Eva', email: 'e4@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 203, nombre: 'Clara', email: 'c3@g.test', rol: 'cliente' });

const hoyISO = () => {
  const f = new Date();
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(
    f.getDate()
  ).padStart(2, '0')}`;
};

const asignar = (token, cuerpo) =>
  request(app).post('/api/asignaciones').set('Authorization', `Bearer ${token}`).send(cuerpo);

beforeEach(() => {
  estado.asignaciones = [];
  estado.siguienteId = 1;
});

describe('POST /api/asignaciones (US2)', () => {
  it('asigna un cliente a un entrenador con 201 y estado activa', async () => {
    const res = await asignar(tokenRecep(), { cliente_id: 10, entrenador_id: 1 });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      cliente_id: 10,
      entrenador_id: 1,
      fecha_inicio: hoyISO(),
      fecha_fin: null,
      estado: 'activa',
    });
  });

  it('la reasignación cierra la anterior con fecha_fin y conserva el historial (FR-005)', async () => {
    const primera = await asignar(tokenAdmin(), { cliente_id: 10, entrenador_id: 1 });
    expect(primera.status).toBe(201);

    const segunda = await asignar(tokenAdmin(), { cliente_id: 10, entrenador_id: 2 });
    expect(segunda.status).toBe(201);
    expect(segunda.body.datos.id).not.toBe(primera.body.datos.id);

    const listado = await request(app)
      .get('/api/asignaciones?cliente_id=10')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(listado.status).toBe(200);
    expect(listado.body.datos).toHaveLength(2);

    const [cerrada, activa] = listado.body.datos;
    expect(cerrada.id).toBe(primera.body.datos.id);
    expect(cerrada.estado).toBe('cerrada');
    expect(cerrada.fecha_fin).toBe(hoyISO());
    expect(activa.id).toBe(segunda.body.datos.id);
    expect(activa.estado).toBe('activa');
    expect(activa.fecha_fin).toBeNull();
  });

  it('rechaza un cliente inactivo con 409 CLIENTE_NO_ACTIVO (FR-004)', async () => {
    const res = await asignar(tokenRecep(), { cliente_id: 11, entrenador_id: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CLIENTE_NO_ACTIVO');
  });

  it('rechaza un entrenador inactivo con 409 ENTRENADOR_NO_VALIDO', async () => {
    const res = await asignar(tokenRecep(), { cliente_id: 10, entrenador_id: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('ENTRENADOR_NO_VALIDO');
  });

  it('responde 404 si el cliente o el entrenador no existen', async () => {
    const sinCliente = await asignar(tokenAdmin(), { cliente_id: 999, entrenador_id: 1 });
    expect(sinCliente.status).toBe(404);

    const sinEntrenador = await asignar(tokenAdmin(), { cliente_id: 10, entrenador_id: 999 });
    expect(sinEntrenador.status).toBe(404);
  });

  it('valida los identificadores con 400 VALIDACION', async () => {
    const res = await asignar(tokenAdmin(), { cliente_id: 0, entrenador_id: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('el alta es de administrador y recepcionista: 403 a entrenador y cliente', async () => {
    for (const token of [tokenEntrena(), tokenCliente()]) {
      const res = await asignar(token, { cliente_id: 10, entrenador_id: 1 });
      expect(res.status).toBe(403);
    }
    expect(estado.asignaciones).toHaveLength(0);
  });
});

describe('GET /api/asignaciones (US2)', () => {
  it('lista las vigencias con fechas y filtros (SC-008: historial visible)', async () => {
    await asignar(tokenRecep(), { cliente_id: 10, entrenador_id: 1 });
    await asignar(tokenRecep(), { cliente_id: 12, entrenador_id: 2 });

    const todas = await request(app)
      .get('/api/asignaciones')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(todas.status).toBe(200);
    expect(todas.body.datos).toHaveLength(2);
    expect(todas.body.datos[0].cliente).toBe('Lucía Asigna');
    expect(todas.body.datos[0].entrenador).toBe('Eva Fuerza');

    const porEstado = await request(app)
      .get('/api/asignaciones?estado=activa')
      .set('Authorization', `Bearer ${tokenRecep()}`);
    expect(porEstado.status).toBe(200);
    expect(porEstado.body.datos).toHaveLength(2);

    const inexistente = await request(app)
      .get('/api/asignaciones?cliente_id=999')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(inexistente.status).toBe(200);
    expect(inexistente.body.datos).toHaveLength(0);
  });

  it('responde 403 a entrenador y cliente', async () => {
    const entrenador = await request(app)
      .get('/api/asignaciones')
      .set('Authorization', `Bearer ${tokenEntrena()}`);
    expect(entrenador.status).toBe(403);

    const cliente = await request(app)
      .get('/api/asignaciones')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(cliente.status).toBe(403);
  });
});

describe('PUT /api/asignaciones/:id/cerrar (US2)', () => {
  it('cierra una asignación activa con fecha_fin de hoy (200)', async () => {
    const creada = await asignar(tokenAdmin(), { cliente_id: 10, entrenador_id: 1 });

    const res = await request(app)
      .put(`/api/asignaciones/${creada.body.datos.id}/cerrar`)
      .set('Authorization', `Bearer ${tokenRecep()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.estado).toBe('cerrada');
    expect(res.body.datos.fecha_fin).toBe(hoyISO());
    expect(estado.asignaciones).toHaveLength(1); // se conserva, no se borra
  });

  it('rechaza cerrar una asignación ya cerrada con 409 ESTADO_NO_PERMITE', async () => {
    const creada = await asignar(tokenAdmin(), { cliente_id: 10, entrenador_id: 1 });
    await request(app)
      .put(`/api/asignaciones/${creada.body.datos.id}/cerrar`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    const segunda = await request(app)
      .put(`/api/asignaciones/${creada.body.datos.id}/cerrar`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(segunda.status).toBe(409);
    expect(segunda.body.error.codigo).toBe('ESTADO_NO_PERMITE');
  });

  it('responde 404 si la asignación no existe y 403 a roles sin permiso', async () => {
    const inexistente = await request(app)
      .put('/api/asignaciones/999/cerrar')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(inexistente.status).toBe(404);

    await asignar(tokenAdmin(), { cliente_id: 10, entrenador_id: 1 });
    const cliente = await request(app)
      .put('/api/asignaciones/1/cerrar')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(cliente.status).toBe(403);
  });
});

describe('Sin eliminación física de asignaciones (FR-025, SC-008)', () => {
  it('no existe endpoint DELETE /api/asignaciones/:id', async () => {
    const creada = await asignar(tokenAdmin(), { cliente_id: 10, entrenador_id: 1 });

    const res = await request(app)
      .delete(`/api/asignaciones/${creada.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(404);
    expect(estado.asignaciones).toHaveLength(1);
  });
});
