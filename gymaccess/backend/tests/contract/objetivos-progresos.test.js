// T034 [US4] Contrato de objetivos y progresos (contracts/api.md).
// Escritura solo administrador y entrenador de la carga (403
// FUERA_DE_CARGA para cliente ajeno); recepcionista y cliente → 403
// (clarify Q5/Q4); progreso exige al menos un dato de medición además
// de la fecha (HU4 esc.6, FR-022); modificar un objetivo conserva sus
// progresos y nada se elimina (FR-013, FR-025).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => {
  // Emula los JOIN de clientes (objetivos) y de clientes+objetivo (progresos).
  const conCliente = (fila) => {
    if (!fila) return null;
    return {
      ...fila,
      cliente:
        estado.clientes.find((c) => c.id === fila.cliente_id)?.nombre_completo ?? null,
    };
  };
  const conDetalles = (fila) => {
    if (!fila) return null;
    return {
      ...fila,
      cliente:
        estado.clientes.find((c) => c.id === fila.cliente_id)?.nombre_completo ?? null,
      objetivo: fila.objetivo_id
        ? estado.objetivos.find((o) => o.id === fila.objetivo_id)?.descripcion ?? null
        : null,
    };
  };
  return {
    objetivos: [],
    progresos: [],
    siguienteObjetivo: 1,
    siguienteProgreso: 1,
    conCliente,
    conDetalles,
    clientes: [
      { id: 10, nombre_completo: 'Lucía Seguimiento', estado: 'activo' },
      { id: 12, nombre_completo: 'Carla Seguimiento', estado: 'activo' },
      { id: 13, nombre_completo: 'Sin Profe', estado: 'activo' },
    ],
    entrenadores: [
      { id: 1, usuario_id: 102, nombre: 'Eva Fuerza', estado: 'activo' },
      { id: 2, usuario_id: 205, nombre: 'Iván Cardio', estado: 'activo' },
    ],
    asignaciones: [
      { id: 1, cliente_id: 10, entrenador_id: 1, estado: 'activa' },
      { id: 2, cliente_id: 12, entrenador_id: 2, estado: 'activa' },
    ],
  };
});

vi.mock('../../src/models/objetivo.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.siguienteObjetivo++;
    estado.objetivos.push({
      id,
      cliente_id: datos.cliente_id,
      descripcion: datos.descripcion,
      meta: datos.meta ?? null,
      fecha_limite: datos.fecha_limite ?? null,
      estado: datos.estado ?? 'en curso',
    });
    return id;
  }),
  listar: vi.fn(async (filtros = {}) =>
    estado.objetivos
      .filter(
        (o) =>
          (filtros.cliente_id === undefined ||
            o.cliente_id === Number(filtros.cliente_id)) &&
          (filtros.estado === undefined || o.estado === filtros.estado) &&
          (filtros.cliente_ids === undefined || filtros.cliente_ids.includes(o.cliente_id))
      )
      .map((o) => estado.conCliente(o))
      .sort((a, b) => b.id - a.id)
  ),
  findById: vi.fn(async (id) =>
    estado.conCliente(estado.objetivos.find((o) => o.id === Number(id)) ?? null)
  ),
  actualizar: vi.fn(async (id, campos) => {
    const o = estado.objetivos.find((x) => x.id === Number(id));
    if (o) Object.assign(o, campos);
    return Boolean(o);
  }),
}));

vi.mock('../../src/models/progreso.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.siguienteProgreso++;
    estado.progresos.push({
      id,
      cliente_id: datos.cliente_id,
      objetivo_id: datos.objetivo_id ?? null,
      fecha: datos.fecha,
      peso: datos.peso ?? null,
      medidas: datos.medidas ?? null,
      marca: datos.marca ?? null,
      comentario: datos.comentario ?? null,
    });
    return id;
  }),
  listar: vi.fn(async (filtros = {}) =>
    estado.progresos
      .filter(
        (p) =>
          (filtros.cliente_id === undefined ||
            p.cliente_id === Number(filtros.cliente_id)) &&
          (filtros.objetivo_id === undefined ||
            p.objetivo_id === Number(filtros.objetivo_id)) &&
          (filtros.desde === undefined || p.fecha >= filtros.desde) &&
          (filtros.hasta === undefined || p.fecha <= filtros.hasta) &&
          (filtros.cliente_ids === undefined || filtros.cliente_ids.includes(p.cliente_id))
      )
      .map((p) => estado.conDetalles(p))
      .sort((a, b) => (a.fecha === b.fecha ? a.id - b.id : a.fecha < b.fecha ? -1 : 1))
  ),
  findById: vi.fn(async (id) =>
    estado.conDetalles(estado.progresos.find((p) => p.id === Number(id)) ?? null)
  ),
  actualizar: vi.fn(async (id, campos) => {
    const p = estado.progresos.find((x) => x.id === Number(id));
    if (p) Object.assign(p, campos);
    return Boolean(p);
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

vi.mock('../../src/models/asignacion.model.js', () => ({
  findVigentePorCliente: vi.fn(async (clienteId) => {
    const a = estado.asignaciones.find(
      (x) => x.cliente_id === Number(clienteId) && x.estado === 'activa'
    );
    return a ?? null;
  }),
  listar: vi.fn(async (filtros = {}) =>
    estado.asignaciones.filter(
      (a) =>
        (filtros.entrenador_id === undefined ||
          a.entrenador_id === Number(filtros.entrenador_id)) &&
        (filtros.estado === undefined || a.estado === filtros.estado) &&
        (filtros.cliente_id === undefined || a.cliente_id === Number(filtros.cliente_id))
    )
  ),
  crear: vi.fn(async () => 1),
  findById: vi.fn(async () => null),
  cerrarVigentePorCliente: vi.fn(async () => 0),
  cerrar: vi.fn(async () => true),
}));

vi.mock('../../src/models/entrenador.model.js', () => ({
  findById: vi.fn(async (id) =>
    estado.entrenadores.find((e) => e.id === Number(id)) ?? null
  ),
  findByUsuarioId: vi.fn(async (usuarioId) =>
    estado.entrenadores.find((e) => e.usuario_id === Number(usuarioId)) ?? null
  ),
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
  actualizar: vi.fn(async () => true),
  contarAsignacionesVigentes: vi.fn(async () => 0),
}));

vi.mock('../../src/models/auditoria.model.js', () => ({
  crear: vi.fn(async () => 1),
  listar: vi.fn(async () => []),
}));

// Ninguna operación de US4 es multi-tabla, pero se carga por las rutas de
// otras historias; se mockea para que ninguna prueba intente conexión real.
vi.mock('../../src/utils/transaccion.js', () => ({
  conTransaccion: vi.fn(async (operacion) => operacion(null)),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 400, nombre: 'Admin', email: 'a4@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 401, nombre: 'Rita', email: 'r5@g.test', rol: 'recepcionista' });
const tokenEntrena1 = () =>
  firmarToken({ sub: 102, nombre: 'Eva', email: 'e6@g.test', rol: 'entrenador' });
const tokenEntrena2 = () =>
  firmarToken({ sub: 205, nombre: 'Iván', email: 'i6@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 402, nombre: 'Clara', email: 'c6@g.test', rol: 'cliente' });

const crearObjetivo = (token, cuerpo) =>
  request(app).post('/api/objetivos').set('Authorization', `Bearer ${token}`).send(cuerpo);

const crearProgreso = (token, cuerpo) =>
  request(app).post('/api/progresos').set('Authorization', `Bearer ${token}`).send(cuerpo);

beforeEach(() => {
  estado.objetivos = [];
  estado.progresos = [];
  estado.siguienteObjetivo = 1;
  estado.siguienteProgreso = 1;
});

// ---------------------------------------------------------------------------
// Objetivos
// ---------------------------------------------------------------------------

describe('POST /api/objetivos (US4)', () => {
  it('crea un objetivo en curso para un cliente de la carga con 201', async () => {
    const res = await crearObjetivo(tokenEntrena1(), {
      cliente_id: 10,
      descripcion: 'Bajar 3 kg de grasa',
      meta: '70 kg',
      fecha_limite: '2026-12-31',
    });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      cliente_id: 10,
      descripcion: 'Bajar 3 kg de grasa',
      meta: '70 kg',
      fecha_limite: '2026-12-31',
      estado: 'en curso',
    });
    expect(res.body.mensaje).toContain('Objetivo registrado');
  });

  it('el administrador crea objetivos en cualquier cliente', async () => {
    const res = await crearObjetivo(tokenAdmin(), {
      cliente_id: 12,
      descripcion: 'Fuerza en piernas',
    });

    expect(res.status).toBe(201);
    expect(res.body.datos.estado).toBe('en curso');
  });

  it('rechaza sin descripcion o con fecha ilegible (400 VALIDACION, FR-022)', async () => {
    const sinDescripcion = await crearObjetivo(tokenEntrena1(), { cliente_id: 10 });
    expect(sinDescripcion.status).toBe(400);
    expect(sinDescripcion.body.error.codigo).toBe('VALIDACION');

    const fechaMala = await crearObjetivo(tokenEntrena1(), {
      cliente_id: 10,
      descripcion: 'Con fecha',
      fecha_limite: '31-12-2026',
    });
    expect(fechaMala.status).toBe(400);
    expect(fechaMala.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 404 si el cliente no existe', async () => {
    const res = await crearObjetivo(tokenAdmin(), {
      cliente_id: 999,
      descripcion: 'Fantasma',
    });

    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('NO_ENCONTRADO');
  });

  it('el entrenador recibe 403 FUERA_DE_CARGA para un cliente ajeno o sin carga', async () => {
    const ajeno = await crearObjetivo(tokenEntrena2(), {
      cliente_id: 10,
      descripcion: 'Intrusión',
    });
    expect(ajeno.status).toBe(403);
    expect(ajeno.body.error.codigo).toBe('FUERA_DE_CARGA');

    const sinCarga = await crearObjetivo(tokenEntrena1(), {
      cliente_id: 13,
      descripcion: 'Sin responsable',
    });
    expect(sinCarga.status).toBe(403);
    expect(sinCarga.body.error.codigo).toBe('FUERA_DE_CARGA');
  });

  it('recepcionista y cliente no escriben objetivos (403, clarify Q5)', async () => {
    for (const token of [tokenRecep(), tokenCliente()]) {
      const res = await crearObjetivo(token, {
        cliente_id: 10,
        descripcion: 'No autorizada',
      });
      expect(res.status).toBe(403);
    }
    expect(estado.objetivos).toHaveLength(0);
  });
});

describe('GET /api/objetivos (US4)', () => {
  beforeEach(async () => {
    await crearObjetivo(tokenEntrena1(), {
      cliente_id: 10,
      descripcion: 'Meta de Eva',
    });
    await crearObjetivo(tokenEntrena2(), {
      cliente_id: 12,
      descripcion: 'Meta de Iván',
    });
  });

  it('el administrador lista todo y filtra por estado (SC-010)', async () => {
    const todos = await request(app)
      .get('/api/objetivos')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(todos.status).toBe(200);
    expect(todos.body.datos).toHaveLength(2);

    const porCliente = await request(app)
      .get('/api/objetivos?cliente_id=10')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(porCliente.status).toBe(200);
    expect(porCliente.body.datos).toHaveLength(1);
    expect(porCliente.body.datos[0].cliente).toBe('Lucía Seguimiento');
  });

  it('el entrenador solo lista objetivos de su carga y filtrar ajeno da 403', async () => {
    const mios = await request(app)
      .get('/api/objetivos')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(mios.status).toBe(200);
    expect(mios.body.datos).toHaveLength(1);
    expect(mios.body.datos[0].cliente_id).toBe(10);

    const ajeno = await request(app)
      .get('/api/objetivos?cliente_id=12')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(ajeno.status).toBe(403);
    expect(ajeno.body.error.codigo).toBe('FUERA_DE_CARGA');
  });

  it('recepcionista y cliente no acceden al listado (403)', async () => {
    for (const token of [tokenRecep(), tokenCliente()]) {
      const res = await request(app)
        .get('/api/objetivos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});

describe('PUT /api/objetivos/:id (US4)', () => {
  it('modifica el objetivo y los progresos registrados quedan intactos (FR-013)', async () => {
    const objetivo = await crearObjetivo(tokenEntrena1(), {
      cliente_id: 10,
      descripcion: 'Original',
    });
    await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      objetivo_id: objetivo.body.datos.id,
      fecha: '2026-10-01',
      peso: 72.5,
    });
    await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      objetivo_id: objetivo.body.datos.id,
      fecha: '2026-10-08',
      peso: 71.8,
      comentario: 'Buena semana',
    });

    const res = await request(app)
      .put(`/api/objetivos/${objetivo.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenEntrena1()}`)
      .send({ descripcion: 'Meta ajustada', estado: 'cumplido' });

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({
      descripcion: 'Meta ajustada',
      estado: 'cumplido',
    });

    // Los progresos siguen completos y en su orden (sin borrado ni cambio).
    const progresos = await request(app)
      .get('/api/progresos?cliente_id=10')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(progresos.status).toBe(200);
    expect(progresos.body.datos).toHaveLength(2);
    expect(progresos.body.datos.map((p) => p.fecha)).toEqual(['2026-10-01', '2026-10-08']);
    expect(progresos.body.datos[0].peso).toBe(72.5);
  });

  it('rechaza estados fuera de en curso|cumplido con 400', async () => {
    const objetivo = await crearObjetivo(tokenAdmin(), {
      cliente_id: 10,
      descripcion: 'Estados',
    });

    const res = await request(app)
      .put(`/api/objetivos/${objetivo.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'cancelado' });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('otro entrenador no edita objetivos ajenos (403) y lo inexistente da 404', async () => {
    const objetivo = await crearObjetivo(tokenEntrena1(), {
      cliente_id: 10,
      descripcion: 'Protegida',
    });

    const ajeno = await request(app)
      .put(`/api/objetivos/${objetivo.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenEntrena2()}`)
      .send({ descripcion: 'Tomada' });
    expect(ajeno.status).toBe(403);
    expect(ajeno.body.error.codigo).toBe('FUERA_DE_CARGA');

    const inexistente = await request(app)
      .put('/api/objetivos/777')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ descripcion: 'Nadie' });
    expect(inexistente.status).toBe(404);
  });

  it('recepcionista y cliente no modifican objetivos (403)', async () => {
    const objetivo = await crearObjetivo(tokenAdmin(), {
      cliente_id: 10,
      descripcion: 'Intocable',
    });

    for (const token of [tokenRecep(), tokenCliente()]) {
      const res = await request(app)
        .put(`/api/objetivos/${objetivo.body.datos.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ descripcion: 'Intento' });
      expect(res.status).toBe(403);
    }
  });
});

// ---------------------------------------------------------------------------
// Progresos
// ---------------------------------------------------------------------------

describe('POST /api/progresos (US4)', () => {
  it('registra un progreso con 201 en el historial', async () => {
    const res = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-02',
      peso: 72.4,
      comentario: 'Inicio del plan',
    });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      cliente_id: 10,
      fecha: '2026-10-02',
      peso: 72.4,
      comentario: 'Inicio del plan',
    });
    expect(res.body.mensaje).toContain('Progreso registrado');
  });

  it('acepta un progreso sin peso pero con medidas o marca (dato de medición)', async () => {
    const medidas = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-03',
      medidas: 'pecho 98 cm, cintura 84 cm',
    });
    expect(medidas.status).toBe(201);

    const marca = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-04',
      marca: '5 km en 26 min',
    });
    expect(marca.status).toBe(201);
  });

  it('rechaza un progreso SOLO con fecha (400 VALIDACION, HU4 esc.6)', async () => {
    const res = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-05',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
    expect(JSON.stringify(res.body.error.detalles)).toContain('peso');
    expect(estado.progresos).toHaveLength(0);
  });

  it('rechaza fecha ilegible con 400 VALIDACION (FR-022)', async () => {
    const res = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '05-10-2026',
      peso: 70,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('responde 404 si el cliente o el objetivo no existen (o es de otro cliente)', async () => {
    const objetivo = await crearObjetivo(tokenEntrena1(), {
      cliente_id: 10,
      descripcion: 'Propio',
    });

    const sinCliente = await crearProgreso(tokenAdmin(), {
      cliente_id: 999,
      fecha: '2026-10-05',
      peso: 70,
    });
    expect(sinCliente.status).toBe(404);

    const sinObjetivo = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      objetivo_id: 888,
      fecha: '2026-10-05',
      peso: 70,
    });
    expect(sinObjetivo.status).toBe(404);
    expect(sinObjetivo.body.error.codigo).toBe('NO_ENCONTRADO');

    // El objetivo existe pero pertenece a un cliente distinto.
    const objetivoAjeno = await crearProgreso(tokenEntrena1(), {
      cliente_id: 13,
      objetivo_id: objetivo.body.datos.id,
      fecha: '2026-10-05',
      peso: 70,
    });
    expect(objetivoAjeno.status).toBe(403); // cliente 13 sin carga: 403 primero
  });

  it('el entrenador recibe 403 FUERA_DE_CARGA para un cliente ajeno', async () => {
    const res = await crearProgreso(tokenEntrena2(), {
      cliente_id: 10,
      fecha: '2026-10-05',
      peso: 70,
    });

    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('FUERA_DE_CARGA');
  });

  it('recepcionista y cliente nunca escriben progresos (403, clarify Q4)', async () => {
    for (const token of [tokenRecep(), tokenCliente()]) {
      const res = await crearProgreso(token, {
        cliente_id: 10,
        fecha: '2026-10-05',
        peso: 70,
      });
      expect(res.status).toBe(403);
    }
    expect(estado.progresos).toHaveLength(0);
  });
});

describe('GET /api/progresos (US4)', () => {
  beforeEach(async () => {
    await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-10',
      peso: 71.0,
    });
    await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-01',
      peso: 72.5,
    });
    await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-05',
      marca: '10 km',
    });
  });

  it('devuelve el historial ordenado por fecha ascendente (HU4 esc.4)', async () => {
    const res = await request(app)
      .get('/api/progresos?cliente_id=10')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.map((p) => p.fecha)).toEqual([
      '2026-10-01',
      '2026-10-05',
      '2026-10-10',
    ]);
    expect(res.body.datos[0].cliente).toBe('Lucía Seguimiento');
  });

  it('filtra por desde y hasta (ambos inclusive)', async () => {
    const desde = await request(app)
      .get('/api/progresos?cliente_id=10&desde=2026-10-05')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(desde.status).toBe(200);
    expect(desde.body.datos.map((p) => p.fecha)).toEqual(['2026-10-05', '2026-10-10']);

    const hasta = await request(app)
      .get('/api/progresos?cliente_id=10&hasta=2026-10-05')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(hasta.status).toBe(200);
    expect(hasta.body.datos.map((p) => p.fecha)).toEqual(['2026-10-01', '2026-10-05']);
  });

  it('el administrador lista todo; el entrenador solo su carga', async () => {
    const admin = await request(app)
      .get('/api/progresos')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(admin.status).toBe(200);
    expect(admin.body.datos).toHaveLength(3);

    const mios = await request(app)
      .get('/api/progresos')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(mios.status).toBe(200);
    expect(mios.body.datos).toHaveLength(3);
    expect(mios.body.datos.every((p) => p.cliente_id === 10)).toBe(true);

    const ajeno = await request(app)
      .get('/api/progresos?cliente_id=12')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(ajeno.status).toBe(403);
    expect(ajeno.body.error.codigo).toBe('FUERA_DE_CARGA');
  });

  it('recepcionista y cliente no consultan progresos (403)', async () => {
    for (const token of [tokenRecep(), tokenCliente()]) {
      const res = await request(app)
        .get('/api/progresos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });
});

describe('PUT /api/progresos/:id y sin eliminación (US4)', () => {
  it('modifica un progreso sin borrarlo ni alterar el historial (FR-025)', async () => {
    const creado = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-01',
      peso: 72.5,
    });

    const res = await request(app)
      .put(`/api/progresos/${creado.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenEntrena1()}`)
      .send({ peso: 72.2, comentario: 'Corrección de báscula' });

    expect(res.status).toBe(200);
    expect(res.body.datos).toMatchObject({
      peso: 72.2,
      comentario: 'Corrección de báscula',
    });
    expect(estado.progresos).toHaveLength(1);
  });

  it('otro entrenador no modifica progresos ajenos (403) y lo inexistente da 404', async () => {
    const creado = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-01',
      peso: 72.5,
    });

    const ajeno = await request(app)
      .put(`/api/progresos/${creado.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenEntrena2()}`)
      .send({ peso: 99 });
    expect(ajeno.status).toBe(403);
    expect(ajeno.body.error.codigo).toBe('FUERA_DE_CARGA');

    const inexistente = await request(app)
      .put('/api/progresos/555')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ peso: 70 });
    expect(inexistente.status).toBe(404);
  });

  it('no existen endpoints DELETE para objetivos ni progresos (FR-025)', async () => {
    const objetivo = await crearObjetivo(tokenAdmin(), {
      cliente_id: 10,
      descripcion: 'Permanente',
    });
    const progreso = await crearProgreso(tokenEntrena1(), {
      cliente_id: 10,
      fecha: '2026-10-01',
      peso: 72,
    });

    const borraObjetivo = await request(app)
      .delete(`/api/objetivos/${objetivo.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(borraObjetivo.status).toBe(404);

    const borraProgreso = await request(app)
      .delete(`/api/progresos/${progreso.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(borraProgreso.status).toBe(404);

    expect(estado.objetivos).toHaveLength(1);
    expect(estado.progresos).toHaveLength(1);
  });
});
