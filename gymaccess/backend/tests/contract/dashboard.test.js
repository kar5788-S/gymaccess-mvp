// T053 [US6] Contrato del dashboard (contracts/api.md):
// - `GET /api/dashboard` exclusivo del administrador, con los 14
//   indicadores agregados por periodo (FR-016, FR-017) y SIN nombres ni
//   datos sensibles de clientes (FR-019); `403` a cualquier otro rol
//   (FR-018, HU6 esc.3).
// - `GET /api/dashboard/mio` exclusivo del entrenador: solo su carga y
//   sin cifras financieras (clarify Q1 respuesta B; HU6 esc.6).
// - `periodo` por defecto `mes`; valor desconocido → `400` con mensaje
//   claro; instalación vacía → indicadores en cero sin errores.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { firmarToken } from '../../src/config/jwt.js';

const estado = vi.hoisted(() => ({
  // Instalación vacía por defecto: todo en cero.
  vista: {
    clientes_total: 0,
    clientes_activos: 0,
    membresias_activas: 0,
    membresias_vencidas: 0,
    entrenadores_activos: 0,
    clientes_con_entrenador: 0,
    rutinas_activas: 0,
    objetivos_en_curso: 0,
    objetivos_cumplidos: 0,
  },
  periodo: {
    ingresos_periodo: 0,
    pagos_periodo: 0,
    accesos_autorizados: 0,
    accesos_rechazados: 0,
    progresos_recientes: 0,
  },
  panel: {
    clientes_carga: 0,
    rutinas_activas: 0,
    objetivos_en_curso: 0,
    objetivos_cumplidos: 0,
    progresos_recientes: 0,
  },
  ultimaLlamada: { totales: 'sin-llamar', panel: null },
  entrenadores: [
    { id: 1, usuario_id: 102, nombre: 'Eva Fuerza', estado: 'activo' },
  ],
  // Nombre que jamás debe aparecer en la respuesta (FR-019).
  nombreProhibido: 'Lucía Cliente Oculto',
}));

vi.mock('../../src/models/dashboard.model.js', () => ({
  obtenerEstadisticasGenerales: vi.fn(async () => ({ ...estado.vista })),
  obtenerTotalesPeriodo: vi.fn(async (desde) => {
    estado.ultimaLlamada.totales = desde;
    return { ...estado.periodo };
  }),
  obtenerPanelEntrenador: vi.fn(async (entrenadorId, desde) => {
    estado.ultimaLlamada.panel = { entrenadorId, desde };
    return { ...estado.panel };
  }),
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

vi.mock('../../src/models/asignacion.model.js', () => ({
  findVigentePorCliente: vi.fn(async () => null),
  listar: vi.fn(async () => []),
  crear: vi.fn(async () => 1),
  findById: vi.fn(async () => null),
  cerrarVigentePorCliente: vi.fn(async () => 0),
  cerrar: vi.fn(async () => true),
}));

// El dashboard no usa transacciones; se mockea porque otras historias sí.
vi.mock('../../src/utils/transaccion.js', () => ({
  conTransaccion: vi.fn(async (operacion) => operacion(null)),
}));

import app from '../../src/app.js';

const tokenAdmin = () =>
  firmarToken({ sub: 600, nombre: 'Admin', email: 'a6@g.test', rol: 'administrador' });
const tokenRecep = () =>
  firmarToken({ sub: 601, nombre: 'Rita', email: 'r7@g.test', rol: 'recepcionista' });
const tokenEntrena = () =>
  firmarToken({ sub: 102, nombre: 'Eva', email: 'e8@g.test', rol: 'entrenador' });
const tokenCliente = () =>
  firmarToken({ sub: 602, nombre: 'Clara', email: 'c8@g.test', rol: 'cliente' });

const dashboard = (consulta = '') =>
  request(app)
    .get(`/api/dashboard${consulta}`)
    .set('Authorization', `Bearer ${tokenAdmin()}`);

const miDashboard = (consulta = '') =>
  request(app)
    .get(`/api/dashboard/mio${consulta}`)
    .set('Authorization', `Bearer ${tokenEntrena()}`);

beforeEach(() => {
  estado.ultimaLlamada = { totales: 'sin-llamar', panel: null };
});

const INDICADORES_ADMIN = [
  'clientes_total',
  'clientes_activos',
  'membresias_activas',
  'membresias_vencidas',
  'ingresos_periodo',
  'pagos_periodo',
  'accesos_autorizados',
  'accesos_rechazados',
  'entrenadores_activos',
  'clientes_con_entrenador',
  'rutinas_activas',
  'objetivos_en_curso',
  'objetivos_cumplidos',
  'progresos_recientes',
];

const INDICADORES_ENTRENADOR = [
  'clientes_carga',
  'rutinas_activas',
  'objetivos_en_curso',
  'objetivos_cumplidos',
  'progresos_recientes',
];

const sonTodosCifras = (obj) =>
  Object.values(obj).every((v) => typeof v === 'number');

describe('GET /api/dashboard (US6)', () => {
  it('devuelve periodo mes por defecto y los 14 indicadores del administrador (FR-016)', async () => {
    const res = await dashboard();

    expect(res.status).toBe(200);
    expect(res.body.datos.periodo).toBe('mes');
    expect(Object.keys(res.body.datos.indicadores).sort()).toEqual(
      [...INDICADORES_ADMIN].sort()
    );
    expect(sonTodosCifras(res.body.datos.indicadores)).toBe(true);
    // El rango por defecto es el mes en curso (desde el día 1 local).
    expect(estado.ultimaLlamada.totales).toMatch(/^\d{4}-\d{2}-01$/);
    // Sin nombres ni datos sensibles de clientes (FR-019).
    expect(JSON.stringify(res.body)).not.toContain(estado.nombreProhibido);
  });

  it('admite 30d e historico: el rango cambia según el periodo (FR-017)', async () => {
    const treinta = await dashboard('?periodo=30d');
    expect(treinta.status).toBe(200);
    expect(treinta.body.datos.periodo).toBe('30d');
    expect(estado.ultimaLlamada.totales).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const historico = await dashboard('?periodo=historico');
    expect(historico.status).toBe(200);
    expect(historico.body.datos.periodo).toBe('historico');
    expect(estado.ultimaLlamada.totales).toBeNull();
  });

  it('un periodo desconocido responde 400 VALIDACION con mensaje claro', async () => {
    const res = await dashboard('?periodo=semana');

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
    expect(JSON.stringify(res.body.error.detalles)).toContain('periodo');
  });

  it('solo el administrador accede: 403 a los demás roles (HU6 esc.3)', async () => {
    for (const token of [tokenRecep(), tokenEntrena(), tokenCliente()]) {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });

  it('con datos instalados refleja los valores agregados completos', async () => {
    estado.vista = {
      clientes_total: 120,
      clientes_activos: 110,
      membresias_activas: 80,
      membresias_vencidas: 15,
      entrenadores_activos: 4,
      clientes_con_entrenador: 60,
      rutinas_activas: 25,
      objetivos_en_curso: 30,
      objetivos_cumplidos: 12,
    };
    estado.periodo = {
      ingresos_periodo: 4575.5,
      pagos_periodo: 45,
      accesos_autorizados: 310,
      accesos_rechazados: 9,
      progresos_recientes: 18,
    };

    try {
      const res = await dashboard('?periodo=30d');
      expect(res.status).toBe(200);
      expect(res.body.datos.indicadores).toMatchObject({
        clientes_total: 120,
        membresias_activas: 80,
        ingresos_periodo: 4575.5,
        pagos_periodo: 45,
        accesos_autorizados: 310,
        accesos_rechazados: 9,
        progresos_recientes: 18,
        entrenadores_activos: 4,
        rutinas_activas: 25,
      });
    } finally {
      // Restaura la instalación vacía para el resto de la suite.
      estado.vista = {
        clientes_total: 0,
        clientes_activos: 0,
        membresias_activas: 0,
        membresias_vencidas: 0,
        entrenadores_activos: 0,
        clientes_con_entrenador: 0,
        rutinas_activas: 0,
        objetivos_en_curso: 0,
        objetivos_cumplidos: 0,
      };
      estado.periodo = {
        ingresos_periodo: 0,
        pagos_periodo: 0,
        accesos_autorizados: 0,
        accesos_rechazados: 0,
        progresos_recientes: 0,
      };
    }
  });

  it('instalación vacía: todos los indicadores en cero y sin errores', async () => {
    const res = await dashboard();

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(
      Object.values(res.body.datos.indicadores).every((v) => v === 0)
    ).toBe(true);
  });
});

describe('GET /api/dashboard/mio (US6)', () => {
  it('devuelve SOLO los 5 indicadores de la carga, sin cifras financieras (clarify Q1 B)', async () => {
    const res = await miDashboard();

    expect(res.status).toBe(200);
    expect(res.body.datos.periodo).toBe('mes');
    expect(Object.keys(res.body.datos.indicadores).sort()).toEqual(
      [...INDICADORES_ENTRENADOR].sort()
    );
    expect(res.body.datos.indicadores.ingresos_periodo).toBeUndefined();
    expect(res.body.datos.indicadores.pagos_periodo).toBeUndefined();
    expect(JSON.stringify(res.body.datos.indicadores)).not.toMatch(
      /ingres|monto|pago/i
    );
    expect(sonTodosCifras(res.body.datos.indicadores)).toBe(true);
    // El perfil se resuelve desde la sesión (entrenador id 1, sub 102).
    expect(estado.ultimaLlamada.panel.entrenadorId).toBe(1);
    expect(estado.ultimaLlamada.panel.desde).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('refleja los valores del panel de su propia carga', async () => {
    estado.panel = {
      clientes_carga: 7,
      rutinas_activas: 5,
      objetivos_en_curso: 6,
      objetivos_cumplidos: 3,
      progresos_recientes: 4,
    };
    try {
      const res = await miDashboard('?periodo=30d');
      expect(res.status).toBe(200);
      expect(res.body.datos.indicadores).toEqual({
        clientes_carga: 7,
        rutinas_activas: 5,
        objetivos_en_curso: 6,
        objetivos_cumplidos: 3,
        progresos_recientes: 4,
      });
      expect(estado.ultimaLlamada.panel.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    } finally {
      estado.panel = {
        clientes_carga: 0,
        rutinas_activas: 0,
        objetivos_en_curso: 0,
        objetivos_cumplidos: 0,
        progresos_recientes: 0,
      };
    }
  });

  it('instalación vacía: el panel responde en cero sin errores', async () => {
    const res = await miDashboard();

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(
      Object.values(res.body.datos.indicadores).every((v) => v === 0)
    ).toBe(true);
  });

  it('solo el entrenador accede: 403 a administrador, recepcionista y cliente', async () => {
    for (const token of [tokenAdmin(), tokenRecep(), tokenCliente()]) {
      const res = await request(app)
        .get('/api/dashboard/mio')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });

  it('un periodo desconocido también responde 400 en /mio', async () => {
    const res = await miDashboard('?periodo=quiero-ayer');
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });
});
