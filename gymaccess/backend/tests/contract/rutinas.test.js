// T025 [US3] Contrato de rutinas de entrenamiento (contracts/api.md).
// El entrenador opera solo su carga (403 FUERA_DE_CARGA), el cliente sin
// responsable recibe 409 CLIENTE_SIN_ENTRENADOR, una sola rutina activa
// por cliente (clarify Q3), recepcionista en solo lectura y sin borrado
// físico (FR-008…FR-010).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => {
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
    rutinas: [],
    ejercicios: [],
    siguienteId: 1,
    siguienteEjercicio: 1,
    conNombres,
    clientes: [
      { id: 10, nombre_completo: 'Lucía Rutina', estado: 'activo' },
      { id: 12, nombre_completo: 'Carla Rutina', estado: 'activo' },
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

vi.mock('../../src/models/rutina.model.js', () => ({
  crear: vi.fn(async (datos) => {
    const id = estado.siguienteId++;
    estado.rutinas.push({
      id,
      cliente_id: datos.cliente_id,
      entrenador_id: datos.entrenador_id,
      nombre: datos.nombre,
      estado: datos.estado ?? 'activa',
    });
    return id;
  }),
  listar: vi.fn(async (filtros = {}) =>
    estado.rutinas
      .filter(
        (r) =>
          (filtros.cliente_id === undefined ||
            r.cliente_id === Number(filtros.cliente_id)) &&
          (filtros.entrenador_id === undefined ||
            r.entrenador_id === Number(filtros.entrenador_id)) &&
          (filtros.estado === undefined || r.estado === filtros.estado) &&
          (filtros.cliente_ids === undefined ||
            filtros.cliente_ids.includes(r.cliente_id))
      )
      .map((r) => estado.conNombres(r))
  ),
  findById: vi.fn(async (id) =>
    estado.conNombres(estado.rutinas.find((r) => r.id === Number(id)) ?? null)
  ),
  findEjerciciosPorRutina: vi.fn(async (rutinaId) =>
    estado.ejercicios
      .filter((e) => e.rutina_id === Number(rutinaId))
      .sort((a, b) => a.orden - b.orden)
  ),
  contarEjercicios: vi.fn(
    async (rutinaId) => estado.ejercicios.filter((e) => e.rutina_id === Number(rutinaId)).length
  ),
  actualizar: vi.fn(async (id, campos) => {
    const r = estado.rutinas.find((x) => x.id === Number(id));
    if (r) Object.assign(r, campos);
    return Boolean(r);
  }),
  reemplazarEjercicios: vi.fn(async (rutinaId, ejercicios) => {
    estado.ejercicios = estado.ejercicios.filter((e) => e.rutina_id !== Number(rutinaId));
    ejercicios.forEach((ej, i) => {
      estado.ejercicios.push({
        id: estado.siguienteEjercicio++,
        rutina_id: Number(rutinaId),
        nombre: ej.nombre,
        series: ej.series ?? null,
        repeticiones: ej.repeticiones ?? null,
        instrucciones: ej.instrucciones ?? null,
        orden: i + 1,
      });
    });
  }),
  archivarActivasDeCliente: vi.fn(async (clienteId, exceptoId) => {
    let archivadas = 0;
    for (const r of estado.rutinas) {
      if (
        r.cliente_id === Number(clienteId) &&
        r.estado === 'activa' &&
        r.id !== Number(exceptoId ?? -1)
      ) {
        r.estado = 'archivada';
        archivadas += 1;
      }
    }
    return archivadas;
  }),
  cambiarEstado: vi.fn(async (id, nuevoEstado) => {
    const r = estado.rutinas.find((x) => x.id === Number(id));
    if (!r) return false;
    r.estado = nuevoEstado;
    return true;
  }),
}));

vi.mock('../../src/models/asignacion.model.js', () => ({
  findVigentePorCliente: vi.fn(async (clienteId) => {
    const a = estado.asignaciones.find(
      (x) => x.cliente_id === Number(clienteId) && x.estado === 'activa'
    );
    return a
      ? {
          ...a,
          cliente: estado.clientes.find((c) => c.id === a.cliente_id)?.nombre_completo ?? null,
          entrenador:
            estado.entrenadores.find((e) => e.id === a.entrenador_id)?.nombre ?? null,
        }
      : null;
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

// R-31: archivar la vigente y crear/reactivar la nueva en la misma
// transacción; los modelos están en memoria, corre sin conexión real.
vi.mock('../../src/utils/transaccion.js', () => ({
  conTransaccion: vi.fn(async (operacion) => operacion(null)),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 300, nombre: 'Admin', email: 'a3@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 301, nombre: 'Rita', email: 'r4@g.test', rol: 'recepcionista' });
const tokenEntrena1 = () =>
  firmarToken({ sub: 102, nombre: 'Eva', email: 'e5@g.test', rol: 'entrenador' });
const tokenEntrena2 = () =>
  firmarToken({ sub: 205, nombre: 'Iván', email: 'i5@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 302, nombre: 'Clara', email: 'c5@g.test', rol: 'cliente' });

const crearRutina = (token, cuerpo) =>
  request(app).post('/api/rutinas').set('Authorization', `Bearer ${token}`).send(cuerpo);

const EJERCICIOS = [
  { nombre: 'Press de banca', series: 4, repeticiones: 8 },
  { nombre: 'Plancha', instrucciones: '3 series de 45 segundos' },
];

beforeEach(() => {
  estado.rutinas = [
    {
      id: 99,
      cliente_id: 10,
      entrenador_id: 1,
      nombre: 'Rutina legacy sin ejercicios',
      estado: 'archivada',
    },
  ];
  estado.ejercicios = [];
  estado.siguienteId = 100;
  estado.siguienteEjercicio = 1;
});

describe('POST /api/rutinas (US3)', () => {
  it('crea una rutina activa asociada al cliente y a su entrenador (HU3 esc.1)', async () => {
    const res = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Fuerza tren superior',
      ejercicios: EJERCICIOS,
    });

    expect(res.status).toBe(201);
    expect(res.body.datos).toMatchObject({
      cliente_id: 10,
      entrenador_id: 1,
      nombre: 'Fuerza tren superior',
      estado: 'activa',
    });
    expect(res.body.datos.ejercicios).toHaveLength(2);
    expect(res.body.datos.ejercicios.map((e) => e.orden)).toEqual([1, 2]);
    expect(res.body.mensaje).toContain('activada');
  });

  it('la nueva rutina archiva la anterior y ambas se conservan (HU3 esc.4, clarify Q3)', async () => {
    const primera = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Semana 1',
      ejercicios: EJERCICIOS,
    });
    const segunda = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Semana 2',
      ejercicios: EJERCICIOS,
    });

    expect(primera.status).toBe(201);
    expect(segunda.status).toBe(201);
    expect(segunda.body.mensaje).toContain('archivada');

    const listado = await request(app)
      .get('/api/rutinas?cliente_id=10')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(listado.status).toBe(200);
    const activas = listado.body.datos.filter((r) => r.estado === 'activa');
    expect(activas).toHaveLength(1);
    expect(activas[0].id).toBe(segunda.body.datos.id);
    // El historial conserva ambas (sin borrado).
    expect(listado.body.datos.filter((r) => r.id === primera.body.datos.id)).toHaveLength(1);
  });

  it('rechaza un cliente sin entrenador responsable con 409 CLIENTE_SIN_ENTRENADOR (HU3 esc.2)', async () => {
    const res = await crearRutina(tokenEntrena1(), {
      cliente_id: 13,
      nombre: 'Sin responsable',
      ejercicios: EJERCICIOS,
    });

    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CLIENTE_SIN_ENTRENADOR');
  });

  it('un entrenador ajeno recibe 403 FUERA_DE_CARGA (HU3 esc.3, SC-004)', async () => {
    const res = await crearRutina(tokenEntrena2(), {
      cliente_id: 10,
      nombre: 'Intrusión',
      ejercicios: EJERCICIOS,
    });

    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('FUERA_DE_CARGA');
    expect(res.body.error.mensaje).toContain('carga');
  });

  it('valida datos inválidos con 400 VALIDACION (HU3 esc.7)', async () => {
    const sinNombre = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      ejercicios: EJERCICIOS,
    });
    expect(sinNombre.status).toBe(400);
    expect(sinNombre.body.error.codigo).toBe('VALIDACION');

    const sinEjercicios = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Vacía',
      ejercicios: [],
    });
    expect(sinEjercicios.status).toBe(400);
    expect(sinEjercicios.body.error.codigo).toBe('VALIDACION');

    const seriesCero = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Series cero',
      ejercicios: [{ nombre: 'Curl', series: 0 }],
    });
    expect(seriesCero.status).toBe(400);
    expect(seriesCero.body.error.codigo).toBe('VALIDACION');

    const ejerciciosSinDatos = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Sin datos',
      ejercicios: [{ nombre: 'Curl' }],
    });
    expect(ejerciciosSinDatos.status).toBe(400);

    const creadas = await request(app)
      .get('/api/rutinas?cliente_id=10&estado=activa')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    // Ninguna de las inválidas se guardó (la legacy está archivada).
    expect(creadas.body.datos).toHaveLength(0);
  });

  it('recepcionista y cliente no pueden crear rutinas (403, HU3 esc.6)', async () => {
    for (const token of [tokenRecep(), tokenCliente()]) {
      const res = await crearRutina(token, {
        cliente_id: 10,
        nombre: 'No autorizada',
        ejercicios: EJERCICIOS,
      });
      expect(res.status).toBe(403);
    }
  });

  it('el administrador crea en nombre del responsable vigente', async () => {
    const res = await crearRutina(tokenAdmin(), {
      cliente_id: 10,
      nombre: 'Supervisión',
      ejercicios: EJERCICIOS,
    });

    expect(res.status).toBe(201);
    expect(res.body.datos.entrenador_id).toBe(1);
  });
});

describe('GET /api/rutinas (US3)', () => {
  beforeEach(async () => {
    await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'De Eva',
      ejercicios: EJERCICIOS,
    });
    await crearRutina(tokenEntrena2(), {
      cliente_id: 12,
      nombre: 'De Iván',
      ejercicios: EJERCICIOS,
    });
  });

  it('el administrador y el recepcionista ven todas las rutinas (solo lectura)', async () => {
    const admin = await request(app)
      .get('/api/rutinas')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(admin.status).toBe(200);
    // 2 creadas en el beforeEach + la legacy archivada (sin borrado).
    expect(admin.body.datos).toHaveLength(3);
    expect(admin.body.datos[0].cliente).toBeTruthy();

    const recep = await request(app)
      .get('/api/rutinas')
      .set('Authorization', `Bearer ${tokenRecep()}`);
    expect(recep.status).toBe(200);
    expect(recep.body.datos).toHaveLength(3);
  });

  it('el entrenador solo ve las rutinas de su carga y filtrar ajeno da 403', async () => {
    const mia = await request(app)
      .get('/api/rutinas')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(mia.status).toBe(200);
    // La de Eva + la legacy del mismo cliente: ambas de su carga.
    expect(mia.body.datos).toHaveLength(2);
    expect(mia.body.datos.every((r) => r.cliente_id === 10)).toBe(true);

    const ajena = await request(app)
      .get('/api/rutinas?cliente_id=12')
      .set('Authorization', `Bearer ${tokenEntrena1()}`);
    expect(ajena.status).toBe(403);
    expect(ajena.body.error.codigo).toBe('FUERA_DE_CARGA');
  });

  it('el cliente no consulta el listado (403)', async () => {
    const res = await request(app)
      .get('/api/rutinas')
      .set('Authorization', `Bearer ${tokenCliente()}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/rutinas/:id (US3)', () => {
  it('devuelve la rutina con sus ejercicios ordenados y el detalle del cliente', async () => {
    const creada = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Con detalle',
      ejercicios: EJERCICIOS,
    });

    const res = await request(app)
      .get(`/api/rutinas/${creada.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.datos.rutina).toMatchObject({ nombre: 'Con detalle', estado: 'activa' });
    expect(res.body.datos.ejercicios).toHaveLength(2);
    expect(res.body.datos.ejercicios[0].orden).toBe(1);
  });

  it('otro entrenador no alcanza la rutina ajena (403) y lo inexistente da 404', async () => {
    const creada = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Privada',
      ejercicios: EJERCICIOS,
    });

    const ajena = await request(app)
      .get(`/api/rutinas/${creada.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenEntrena2()}`);
    expect(ajena.status).toBe(403);
    expect(ajena.body.error.codigo).toBe('FUERA_DE_CARGA');

    const inexistente = await request(app)
      .get('/api/rutinas/12345')
      .set('Authorization', `Bearer ${tokenAdmin()}`);
    expect(inexistente.status).toBe(404);
  });
});

describe('PUT /api/rutinas/:id y /estado (US3)', () => {
  it('modifica nombre y reemplaza los ejercicios de forma atómica (HU3 esc.5)', async () => {
    const creada = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Original',
      ejercicios: EJERCICIOS,
    });

    const res = await request(app)
      .put(`/api/rutinas/${creada.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenEntrena1()}`)
      .send({ nombre: 'Ajustada', ejercicios: [{ nombre: 'Sentadilla', series: 5, repeticiones: 5 }] });

    expect(res.status).toBe(200);
    expect(res.body.datos.nombre).toBe('Ajustada');
    expect(res.body.datos.ejercicios).toHaveLength(1);
    expect(res.body.datos.ejercicios[0].orden).toBe(1);
    expect(res.body.datos.cliente_id).toBe(10);
  });

  it('recepcionista lee pero no edita (403 en PUT y estado, HU3 esc.6)', async () => {
    const creada = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Solo lectura',
      ejercicios: EJERCICIOS,
    });

    const editar = await request(app)
      .put(`/api/rutinas/${creada.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ nombre: 'Intento' });
    expect(editar.status).toBe(403);

    const estadoRes = await request(app)
      .put(`/api/rutinas/${creada.body.datos.id}/estado`)
      .set('Authorization', `Bearer ${tokenRecep()}`)
      .send({ estado: 'archivada' });
    expect(estadoRes.status).toBe(403);
  });

  it('archiva y reactiva con ejercicios; activar sin ejercicios da 400 (FR-009)', async () => {
    const creada = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Ciclo',
      ejercicios: EJERCICIOS,
    });

    const archivar = await request(app)
      .put(`/api/rutinas/${creada.body.datos.id}/estado`)
      .set('Authorization', `Bearer ${tokenEntrena1()}`)
      .send({ estado: 'archivada' });
    expect(archivar.status).toBe(200);
    expect(archivar.body.datos.estado).toBe('archivada');

    const reactivar = await request(app)
      .put(`/api/rutinas/${creada.body.datos.id}/estado`)
      .set('Authorization', `Bearer ${tokenEntrena1()}`)
      .send({ estado: 'activa' });
    expect(reactivar.status).toBe(200);
    expect(reactivar.body.datos.estado).toBe('activa');

    // La legacy (id 99) está archivada y sin ejercicios.
    const legacy = await request(app)
      .put('/api/rutinas/99/estado')
      .set('Authorization', `Bearer ${tokenEntrena1()}`)
      .send({ estado: 'activa' });
    expect(legacy.status).toBe(400);
    expect(legacy.body.error.codigo).toBe('VALIDACION');
  });

  it('rechaza estados fuera del catálogo con 400 y lo inexistente da 404', async () => {
    const creada = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Estados',
      ejercicios: EJERCICIOS,
    });

    const invalido = await request(app)
      .put(`/api/rutinas/${creada.body.datos.id}/estado`)
      .set('Authorization', `Bearer ${tokenEntrena1()}`)
      .send({ estado: 'borrada' });
    expect(invalido.status).toBe(400);

    const inexistente = await request(app)
      .put('/api/rutinas/4242/estado')
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ estado: 'activa' });
    expect(inexistente.status).toBe(404);
  });

  it('otro entrenador no modifica rutinas ajenas (403 FUERA_DE_CARGA)', async () => {
    const creada = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Protegida',
      ejercicios: EJERCICIOS,
    });

    const res = await request(app)
      .put(`/api/rutinas/${creada.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenEntrena2()}`)
      .send({ nombre: 'Tomada' });
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('FUERA_DE_CARGA');
  });
});

describe('Sin eliminación física de rutinas (FR-010)', () => {
  it('no existe endpoint DELETE /api/rutinas/:id', async () => {
    const creada = await crearRutina(tokenEntrena1(), {
      cliente_id: 10,
      nombre: 'Permanente',
      ejercicios: EJERCICIOS,
    });

    const res = await request(app)
      .delete(`/api/rutinas/${creada.body.datos.id}`)
      .set('Authorization', `Bearer ${tokenAdmin()}`);

    expect(res.status).toBe(404);
    expect(estado.rutinas).toHaveLength(2); // legacy + creada, sin borrados
  });
});
