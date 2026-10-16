// T069 [Polish] Verificación automática de los 36 escenarios de
// `specs/003-entrenadores-rutinas-dashboard/quickstart.md` (Sprint 3).
//
// Se ejecuta contra una base de datos TEMPORAL (`gymaccess_quickstart`)
// con las migraciones 001 → 002 → 003 y los seeds heredados aplicados;
// NUNCA toca la base de datos real. El Sprint 3 no usa cámara.
//
// Nota de orden: el escenario 27 (dashboard vacío) se ejecuta al inicio,
// porque requiere una instalación sin entrenadores ni rutinas; los demás
// siguen el orden del quickstart.
//
// Uso:
//   1) Recrear la BD temporal y aplicar migraciones/seeds (ver informe).
//   2) cd backend && node scripts/verificar-quickstart-sprint3.mjs
// Sale con código 1 si algún escenario falla.

// DB_NOMBRE ANTES de importar la app (config/db.js lo lee al cargar).
process.env.DB_NOMBRE = process.env.DB_NOMBRE_VERIFICACION || 'gymaccess_quickstart';

// Carga backend/.env (credenciales); dotenv NO pisa DB_NOMBRE ya fijado.
await import('dotenv/config');

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { consultar } = await import('../src/config/db.js');

// ---------------------------------------------------------------------------
// Utilidades (mismo patrón que verificar-quickstart.mjs del Sprint 2)
// ---------------------------------------------------------------------------

const resultados = [];

function esc(numero, titulo, ok, detalle = '') {
  resultados.push({ numero, titulo, ok, detalle });
  console.log(`${ok ? 'OK  ' : 'FALLO'} ${String(numero).padStart(2, '0')}. ${titulo}${detalle ? ` — ${detalle}` : ''}`);
}

function cond(numero, titulo, condicion, detalle = '') {
  esc(numero, titulo, Boolean(condicion), detalle);
}

function iso(d) {
  const anio = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function dias(n) {
  return iso(new Date(Date.now() + n * 86400000));
}

const HOY = dias(0);

const peticion = (metodo, ruta, token) => {
  const p = request(app)[metodo](ruta);
  return token ? p.set('Authorization', `Bearer ${token}`) : p;
};

// ---------------------------------------------------------------------------
// Preparación: usuarios y tokens
// ---------------------------------------------------------------------------

const login = async (email, contrasena) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, contraseña: contrasena });
  if (res.status !== 200) throw new Error(`Login fallido para ${email}: ${res.status}`);
  return res.body.datos.token;
};

const tokenAdmin = await login('admin@gimnasio.test', 'Admin1234');

async function crearUsuario(nombre, email, contrasena, rol) {
  const res = await peticion('post', '/api/usuarios', tokenAdmin).send({
    nombre,
    email,
    contraseña: contrasena,
    rol,
  });
  if (res.status !== 201) throw new Error(`No se pudo crear el usuario ${email}: ${res.status}`);
  return login(email, contrasena);
}

const idUsuario = async (email) => {
  const filas = await consultar('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (!filas[0]) throw new Error(`No existe el usuario ${email}`);
  return filas[0].id;
};

async function crearCliente(nombre, token, datosExtra = {}) {
  const res = await peticion('post', '/api/clientes', token).send({
    nombre_completo: nombre,
    telefono: '555-0000',
    ...datosExtra,
  });
  if (res.status !== 201) throw new Error(`No se pudo crear el cliente ${nombre}: ${res.status}`);
  return res.body.datos;
}

const idEntrenador = async (usuarioId) => {
  const filas = await consultar('SELECT id FROM entrenadores WHERE usuario_id = ?', [usuarioId]);
  if (!filas[0]) throw new Error(`No existe perfil para el usuario ${usuarioId}`);
  return filas[0].id;
};

const tokenRecep = await crearUsuario('Recepcionista S3', 'recep@s3.test', 'Recep1234', 'recepcionista');
const tokenEntrena = await crearUsuario('Eva Fuerza', 'eva@s3.test', 'Entrena1234', 'entrenador');
const tokenEntrena2 = await crearUsuario('Iván Cardio', 'ivan@s3.test', 'Entrena1234', 'entrenador');
const tokenEntrena3 = await crearUsuario('Pablo Pausa', 'pablo@s3.test', 'Entrena1234', 'entrenador');
const tokenCliente = await crearUsuario('Lucía Flujo', 'lucia@s3.test', 'Cliente1234', 'cliente');
const tokenCliente2 = await crearUsuario('Clara Sin Plan', 'clara@s3.test', 'Cliente1234', 'cliente');

// Los ids de perfil se resuelven DESPUÉS de dar de alta los perfiles
// (escenarios 1 y 4-posterior): aquí solo existen las cuentas.

// ---------------------------------------------------------------------------
// Escenario 27: dashboard vacío (se ejecuta AL INICIO: aún no hay
// entrenadores, rutinas ni movimientos — HU6 esc.4)
// ---------------------------------------------------------------------------

{
  const dash = await peticion('get', '/api/dashboard?periodo=mes', tokenAdmin);
  const ind = dash.body.datos?.indicadores ?? {};
  const claves = [
    'clientes_total',
    'entrenadores_activos',
    'rutinas_activas',
    'objetivos_en_curso',
    'progresos_recientes',
    'ingresos_periodo',
  ];
  cond(27, 'Dashboard vacío: indicadores en cero y sin errores (HU6 esc.4)',
    dash.status === 200 && claves.every((k) => ind[k] === 0),
    `clientes ${ind.clientes_total}, entrenadores ${ind.entrenadores_activos}, rutinas ${ind.rutinas_activas}`);
}

// ---------------------------------------------------------------------------
// Escenarios 1–4: perfiles de entrenador (HU1)
// ---------------------------------------------------------------------------

const creada = await peticion('post', '/api/entrenadores', tokenAdmin).send({
  usuario_id: await idUsuario('eva@s3.test'),
  nombre: 'Eva Fuerza',
  telefono: '999111222',
  especialidad: 'Fuerza',
});
if (creada.status !== 201) throw new Error(`No se pudo crear el perfil de Eva: ${creada.status}`);
const idEva = creada.body.datos?.id ?? (await idEntrenador(await idUsuario('eva@s3.test')));
const listadoTrasAlta = await peticion('get', '/api/entrenadores', tokenAdmin);
const evaEnListado = (listadoTrasAlta.body.datos ?? []).find((e) => e.id === idEva);
cond(1, 'Alta de entrenador visible con su usuario y carga en 0 (HU1, SC-002)',
  creada.status === 201 &&
    listadoTrasAlta.status === 200 &&
    evaEnListado?.usuario?.email === 'eva@s3.test' &&
    evaEnListado?.clientes_asignados === 0 &&
    evaEnListado?.estado === 'activo',
  `status ${creada.status}, carga ${evaEnListado?.clientes_asignados}`);

{
  const previos = (await consultar('SELECT COUNT(*) AS n FROM entrenadores'))[0].n;
  const inexistente = await peticion('post', '/api/entrenadores', tokenAdmin).send({
    usuario_id: 999999,
    nombre: 'Fantasma',
  });
  const otroRol = await peticion('post', '/api/entrenadores', tokenAdmin).send({
    usuario_id: await idUsuario('recep@s3.test'),
    nombre: 'Otro Rol',
  });
  const posteriores = (await consultar('SELECT COUNT(*) AS n FROM entrenadores'))[0].n;
  cond(2, 'Usuario inexistente u otro rol → 404/409 y nada se guarda (HU1 esc.2, FR-002)',
    inexistente.status === 404 &&
      otroRol.status === 409 &&
      otroRol.body.error?.codigo === 'ENTRENADOR_NO_VALIDO' &&
      posteriores === previos,
    `inexistente ${inexistente.status}, otro rol ${otroRol.body.error?.codigo}, perfiles ${previos}→${posteriores}`);
}

{
  const duplicado = await peticion('post', '/api/entrenadores', tokenAdmin).send({
    usuario_id: await idUsuario('eva@s3.test'),
    nombre: 'Eva Repetida',
  });
  cond(3, 'Mismo usuario en un segundo perfil → 409 USUARIO_YA_ENTRENADOR (R-28)',
    duplicado.status === 409 && duplicado.body.error?.codigo === 'USUARIO_YA_ENTRENADOR',
    duplicado.body.error?.codigo);
}

{
  const porRecep = await peticion('post', '/api/entrenadores', tokenRecep).send({
    usuario_id: await idUsuario('ivan@s3.test'),
    nombre: 'Iván Cardio',
  });
  const porEntrena = await peticion('post', '/api/entrenadores', tokenEntrena).send({
    usuario_id: await idUsuario('pablo@s3.test'),
    nombre: 'Pablo Pausa',
  });
  cond(4, 'Alta exclusiva del administrador: 403 a recepcionista y entrenador (HU1 esc.4, FR-021)',
    porRecep.status === 403 && porEntrena.status === 403,
    `recep ${porRecep.status}, entrenador ${porEntrena.status}`);
}

// Iván y Pablo se registran como perfil con el propio administrador
// (los intentos del escenario 4 fallaron a propósito).
const ivanCreado = await peticion('post', '/api/entrenadores', tokenAdmin).send({
  usuario_id: await idUsuario('ivan@s3.test'),
  nombre: 'Iván Cardio',
});
if (ivanCreado.status !== 201) throw new Error('No se pudo crear el perfil de Iván');
const idIvan = ivanCreado.body.datos?.id ?? (await idEntrenador(await idUsuario('ivan@s3.test')));
const pabloCreado = await peticion('post', '/api/entrenadores', tokenAdmin).send({
  usuario_id: await idUsuario('pablo@s3.test'),
  nombre: 'Pablo Pausa',
});
if (pabloCreado.status !== 201) throw new Error('No se pudo crear el perfil de Pablo');
const idPablo = pabloCreado.body.datos.id;

// ---------------------------------------------------------------------------
// Escenarios 6–10: asignaciones (HU2)
// ---------------------------------------------------------------------------

const clienteX = await crearCliente('Lucía Flujo', tokenRecep, {
  usuario_id: await idUsuario('lucia@s3.test'),
});
const clienteY = await crearCliente('Marcos Reasigna', tokenRecep);
const clienteZ = await crearCliente('Baja Rápida', tokenRecep);
const clienteW = await crearCliente('Sin Entrenador', tokenRecep);
const cliente2 = await crearCliente('Clara Sin Plan', tokenRecep, {
  usuario_id: await idUsuario('clara@s3.test'),
});

const asignX = await peticion('post', '/api/asignaciones', tokenAdmin).send({
  entrenador_id: idEva,
  cliente_id: clienteX.id,
});
const cargaEva = await peticion('get', '/api/entrenadores/mio/clientes', tokenEntrena);
const enCargaEva = (cargaEva.body.datos ?? []).some((c) => c.id === clienteX.id);
cond(6, 'Asignación válida: activa con fecha_inicio y visible en la carga (HU2, SC-002)',
  asignX.status === 201 &&
    asignX.body.datos?.estado === 'activa' &&
    asignX.body.datos?.fecha_inicio === HOY &&
    cargaEva.status === 200 &&
    enCargaEva,
  `status ${asignX.status}, en carga ${enCargaEva}`);

{
  await peticion('post', '/api/asignaciones', tokenAdmin).send({
    entrenador_id: idEva,
    cliente_id: clienteY.id,
  });
  const aIvan = await peticion('post', '/api/asignaciones', tokenAdmin).send({
    entrenador_id: idIvan,
    cliente_id: clienteY.id,
  });
  const historial = await peticion('get', `/api/asignaciones?cliente_id=${clienteY.id}`, tokenAdmin);
  const filas = historial.body.datos ?? [];
  const activa = filas.find((a) => a.estado === 'activa');
  const cerrada = filas.find((a) => a.estado === 'cerrada');
  cond(7, 'Reasignación cierra la anterior con fecha_fin; una sola activa (clarify Q2, SC-008)',
    aIvan.status === 201 &&
      filas.length === 2 &&
      activa?.entrenador_id === idIvan &&
      activa?.fecha_fin === null &&
      cerrada?.entrenador_id === idEva &&
      cerrada?.fecha_fin != null,
    `${filas.length} filas, activa entrenador ${activa?.entrenador_id}`);
}

{
  await peticion('put', `/api/clientes/${clienteZ.id}`, tokenAdmin).send({ estado: 'inactivo' });
  const aBaja = await peticion('post', '/api/asignaciones', tokenAdmin).send({
    entrenador_id: idEva,
    cliente_id: clienteZ.id,
  });
  cond(8, 'Cliente dado de baja → 409 CLIENTE_NO_ACTIVO (HU2 esc.3, FR-004)',
    aBaja.status === 409 && aBaja.body.error?.codigo === 'CLIENTE_NO_ACTIVO',
    aBaja.body.error?.codigo);
}

{
  // Pablo pasa a inactivo antes de poder asignársele un cliente.
  await peticion('put', `/api/entrenadores/${idPablo}`, tokenAdmin).send({ estado: 'inactivo' });
  const aInactivo = await peticion('post', '/api/asignaciones', tokenAdmin).send({
    entrenador_id: idPablo,
    cliente_id: clienteW.id,
  });
  cond(9, 'Entrenador inactivo → 409 ENTRENADOR_NO_VALIDO (HU2 esc.4)',
    aInactivo.status === 409 && aInactivo.body.error?.codigo === 'ENTRENADOR_NO_VALIDO',
    aInactivo.body.error?.codigo);
}

{
  const estados = [];
  const pruebas = [
    ['post', '/api/asignaciones', tokenEntrena, { entrenador_id: idIvan, cliente_id: clienteW.id }],
    ['post', '/api/asignaciones', tokenCliente, { entrenador_id: idEva, cliente_id: clienteW.id }],
    ['put', `/api/asignaciones/${asignX.body.datos.id}/cerrar`, tokenEntrena, null],
    ['put', `/api/asignaciones/${asignX.body.datos.id}/cerrar`, tokenCliente, null],
  ];
  for (const [metodo, ruta, token, cuerpo] of pruebas) {
    let p = peticion(metodo, ruta, token);
    if (cuerpo) p = p.send(cuerpo);
    const r = await p;
    estados.push(r.status);
  }
  cond(10, 'Entrenador y cliente sin permiso de asignación: 403 en crear y cerrar (HU2 esc.6)',
    estados.every((s) => s === 403), `estados ${estados.join(',')}`);
}

// ---------------------------------------------------------------------------
// Escenarios 11–16: rutinas (HU3)
// ---------------------------------------------------------------------------

const EJERCICIOS = [
  { nombre: 'Press de banca', series: 4, repeticiones: 8, instrucciones: 'Barra al pecho, controlar la bajada.' },
  { nombre: 'Sentadilla', series: 4, repeticiones: 10, instrucciones: 'Espalda recta, rodillas alineadas.' },
  { nombre: 'Curl de bíceps', series: 3, repeticiones: 12, instrucciones: 'Sin impulso de espalda.' },
];

const rutina1 = await peticion('post', '/api/rutinas', tokenEntrena).send({
  cliente_id: clienteX.id,
  nombre: 'Plan de fuerza Q',
  ejercicios: EJERCICIOS,
});
cond(11, 'Creación de rutina activa con 3 ejercicios ordenados (HU3, SC-003)',
  rutina1.status === 201 &&
    rutina1.body.datos?.estado === 'activa' &&
    rutina1.body.datos?.ejercicios?.length === 3 &&
    rutina1.body.datos.ejercicios.map((e) => e.orden).join(',') === '1,2,3',
  `status ${rutina1.status}, ejercicios ${rutina1.body.datos?.ejercicios?.length ?? 0}`);

{
  const sinEntrenador = await peticion('post', '/api/rutinas', tokenEntrena).send({
    cliente_id: clienteW.id,
    nombre: 'Plan imposible',
    ejercicios: EJERCICIOS,
  });
  cond(12, 'Cliente sin entrenador responsable → 409 CLIENTE_SIN_ENTRENADOR (HU3 esc.2)',
    sinEntrenador.status === 409 && sinEntrenador.body.error?.codigo === 'CLIENTE_SIN_ENTRENADOR',
    sinEntrenador.body.error?.codigo);
}

{
  const creaAjena = await peticion('post', '/api/rutinas', tokenEntrena2).send({
    cliente_id: clienteX.id,
    nombre: 'Plan ajeno',
    ejercicios: EJERCICIOS,
  });
  const listaAjena = await peticion(
    'get',
    `/api/rutinas?cliente_id=${clienteX.id}`,
    tokenEntrena2
  );
  cond(13, 'Fuera de la carga: 403 FUERA_DE_CARGA al crear y al consultar ajeno (HU3 esc.3, SC-004)',
    creaAjena.status === 403 &&
      creaAjena.body.error?.codigo === 'FUERA_DE_CARGA' &&
      listaAjena.status === 403 &&
      listaAjena.body.error?.codigo === 'FUERA_DE_CARGA',
    `crear ${creaAjena.body.error?.codigo}, listar ${listaAjena.body.error?.codigo}`);
}

const rutina2 = await peticion('post', '/api/rutinas', tokenEntrena).send({
  cliente_id: clienteX.id,
  nombre: 'Plan nuevo Q',
  ejercicios: EJERCICIOS,
});
const delCliente = await peticion('get', '/api/clientes/mio/rutina', tokenCliente);
{
  const activas = await peticion(
    'get',
    `/api/rutinas?cliente_id=${clienteX.id}&estado=activa`,
    tokenAdmin
  );
  const archivadas = await peticion(
    'get',
    `/api/rutinas?cliente_id=${clienteX.id}&estado=archivada`,
    tokenAdmin
  );
  cond(14, 'Una sola activa: la anterior queda archivada y el cliente ve la nueva (clarify Q3)',
    rutina2.status === 201 &&
      rutina2.body.datos?.estado === 'activa' &&
      (activas.body.datos ?? []).length === 1 &&
      (activas.body.datos ?? [])[0]?.id === rutina2.body.datos.id &&
      (archivadas.body.datos ?? []).length === 1 &&
      (archivadas.body.datos ?? [])[0]?.id === rutina1.body.datos.id &&
      delCliente.body.datos?.rutina?.nombre === 'Plan nuevo Q',
    `activas ${(activas.body.datos ?? []).length}, archivadas ${(archivadas.body.datos ?? []).length}, cliente ve "${delCliente.body.datos?.rutina?.nombre}"`);
}

{
  const conteo = (await consultar('SELECT COUNT(*) AS n FROM rutinas WHERE cliente_id = ?', [clienteX.id]))[0].n;
  const sinNombre = await peticion('post', '/api/rutinas', tokenEntrena).send({
    cliente_id: clienteX.id,
    nombre: '',
    ejercicios: EJERCICIOS,
  });
  const sinEjercicios = await peticion('post', '/api/rutinas', tokenEntrena).send({
    cliente_id: clienteX.id,
    nombre: 'Sin ejercicios',
    ejercicios: [],
  });
  const seriesCero = await peticion('post', '/api/rutinas', tokenEntrena).send({
    cliente_id: clienteX.id,
    nombre: 'Series cero',
    ejercicios: [{ nombre: 'Plancha', series: 0 }],
  });
  const repsNegativas = await peticion('post', '/api/rutinas', tokenEntrena).send({
    cliente_id: clienteX.id,
    nombre: 'Reps negativas',
    ejercicios: [{ nombre: 'Plancha', series: 3, repeticiones: -1 }],
  });
  const despues = (await consultar('SELECT COUNT(*) AS n FROM rutinas WHERE cliente_id = ?', [clienteX.id]))[0].n;
  cond(15, 'Rutina inválida → 400 VALIDACION señalando el dato; nada se guarda (HU3 esc.7, FR-009)',
    [sinNombre, sinEjercicios, seriesCero, repsNegativas].every((r) => r.status === 400) &&
      sinNombre.body.error?.codigo === 'VALIDACION' &&
      despues === conteo,
    `estados ${[sinNombre, sinEjercicios, seriesCero, repsNegativas].map((r) => r.status).join(',')}, rutinas ${conteo}→${despues}`);
}

{
  const editAdmin = await peticion('put', `/api/rutinas/${rutina1.body.datos.id}`, tokenAdmin).send({
    nombre: 'Plan de fuerza Q (supervisada)',
  });
  const leeRecep = await peticion('get', `/api/rutinas/${rutina1.body.datos.id}`, tokenRecep);
  const editRecep = await peticion('put', `/api/rutinas/${rutina1.body.datos.id}`, tokenRecep).send({
    nombre: 'No debería guardarse',
  });
  cond(16, 'Supervisión: admin edita (200); recepcionista lee (200) pero no edita (403) (clarify Q4/Q5)',
    editAdmin.status === 200 && leeRecep.status === 200 && editRecep.status === 403,
    `admin ${editAdmin.status}, recep lectura ${leeRecep.status}, recep edición ${editRecep.status}`);
}

// ---------------------------------------------------------------------------
// Escenario 5 (requiere datos): edición del perfil conserva el historial
// ---------------------------------------------------------------------------

{
  const edicion = await peticion('put', `/api/entrenadores/${idEva}`, tokenAdmin).send({
    telefono: '999888777',
    especialidad: 'Fuerza y movilidad',
  });
  const trasEdicion = await peticion('get', `/api/entrenadores/${idEva}`, tokenAdmin);
  const rutinasEva = await peticion('get', `/api/rutinas?entrenador_id=${idEva}`, tokenAdmin);
  cond(5, 'Edición sin pérdida: cambia el teléfono y conserva asignaciones y rutinas (HU1 esc.3)',
    edicion.status === 200 &&
      trasEdicion.body.datos?.telefono === '999888777' &&
      (rutinasEva.body.datos ?? []).length >= 2 &&
      (trasEdicion.body.datos?.clientes ?? []).length >= 1,
    `teléfono ${trasEdicion.body.datos?.telefono}, rutinas ${(rutinasEva.body.datos ?? []).length}, clientes ${(trasEdicion.body.datos?.clientes ?? []).length}`);
}

// ---------------------------------------------------------------------------
// Escenarios 17–20: objetivos y progresos (HU4)
// ---------------------------------------------------------------------------

const objetivo = await peticion('post', '/api/objetivos', tokenEntrena).send({
  cliente_id: clienteX.id,
  descripcion: 'Bajar 5 kg en dos meses',
  meta: '70 kg',
  fecha_limite: dias(60),
});
const progreso1 = await peticion('post', '/api/progresos', tokenEntrena).send({
  cliente_id: clienteX.id,
  objetivo_id: objetivo.body.datos?.id,
  fecha: dias(-7),
  peso: 78.5,
});
const progreso2 = await peticion('post', '/api/progresos', tokenEntrena).send({
  cliente_id: clienteX.id,
  objetivo_id: objetivo.body.datos?.id,
  fecha: dias(-1),
  peso: 77.2,
  comentario: 'Buena semana de entrenamiento.',
});
const historial = await peticion('get', `/api/progresos?cliente_id=${clienteX.id}`, tokenEntrena);
const fechas = (historial.body.datos ?? []).map((p) => p.fecha);
cond(17, 'Objetivo con dos progresos en el historial ordenado por fecha (HU4, SC-009)',
  objetivo.status === 201 &&
    progreso1.status === 201 &&
    progreso2.status === 201 &&
    fechas.length === 2 &&
    fechas[0] <= fechas[1],
  `fechas ${fechas.join(' → ')}`);

{
  const marcar = await peticion('put', `/api/objetivos/${objetivo.body.datos.id}`, tokenEntrena).send({
    estado: 'cumplido',
  });
  const trasMarcar = await peticion('get', `/api/progresos?cliente_id=${clienteX.id}`, tokenEntrena);
  const objetivos = await peticion('get', `/api/objetivos?cliente_id=${clienteX.id}`, tokenEntrena);
  const idsAntes = [progreso1.body.datos.id, progreso2.body.datos.id].sort();
  const idsDespues = (trasMarcar.body.datos ?? []).map((p) => p.id).sort();
  cond(18, 'Objetivo cumplido y editado: los progresos previos siguen intactos (HU4 esc.3, FR-013)',
    marcar.status === 200 &&
      (objetivos.body.datos ?? []).some((o) => o.id === objetivo.body.datos.id && o.estado === 'cumplido') &&
      JSON.stringify(idsAntes) === JSON.stringify(idsDespues),
    `progresos ${idsDespues.length}, objetivo ${(objetivos.body.datos ?? [])[0]?.estado}`);
}

{
  const objCliente = await peticion('post', '/api/objetivos', tokenCliente).send({
    cliente_id: clienteX.id,
    descripcion: 'Autoimpuesto',
  });
  const proCliente = await peticion('post', '/api/progresos', tokenCliente).send({
    cliente_id: clienteX.id,
    fecha: HOY,
    peso: 77,
  });
  cond(19, 'El cliente no escribe: 403 en objetivos y progresos (clarify Q4, HU5)',
    objCliente.status === 403 && proCliente.status === 403,
    `objetivos ${objCliente.status}, progresos ${proCliente.status}`);
}

{
  const conteo = (await consultar('SELECT COUNT(*) AS n FROM progresos_clientes'))[0].n;
  const soloFecha = await peticion('post', '/api/progresos', tokenEntrena).send({
    cliente_id: clienteX.id,
    fecha: HOY,
  });
  const despues = (await consultar('SELECT COUNT(*) AS n FROM progresos_clientes'))[0].n;
  cond(20, 'Progreso solo con fecha → 400 VALIDACION exigiendo un dato de medición (HU4 esc.6, FR-022)',
    soloFecha.status === 400 && soloFecha.body.error?.codigo === 'VALIDACION' && despues === conteo,
    `status ${soloFecha.status}, progresos ${conteo}→${despues}`);
}

// ---------------------------------------------------------------------------
// Escenarios 21–23: consulta propia del cliente (HU5)
// ---------------------------------------------------------------------------

{
  const miRutina = await peticion('get', '/api/clientes/mio/rutina', tokenCliente);
  const miProgreso = await peticion('get', '/api/clientes/mio/progreso', tokenCliente);
  cond(21, 'El cliente ve su rutina activa con ejercicios y su evolución propia (HU5 esc.1-2, SC-005)',
    miRutina.status === 200 &&
      miRutina.body.datos?.rutina?.estado === 'activa' &&
      (miRutina.body.datos?.rutina?.ejercicios ?? []).length === 3 &&
      (miProgreso.body.datos?.objetivos ?? []).length >= 1 &&
      (miProgreso.body.datos?.progresos ?? []).length === 2,
    `ejercicios ${miRutina.body.datos?.rutina?.ejercicios?.length ?? 0}, objetivos ${(miProgreso.body.datos?.objetivos ?? []).length}, progresos ${(miProgreso.body.datos?.progresos ?? []).length}`);
}

{
  const sinRutina = await peticion('get', '/api/clientes/mio/rutina', tokenCliente2);
  const sinSeguimiento = await peticion('get', '/api/clientes/mio/progreso', tokenCliente2);
  cond(22, 'Cliente sin rutina: 200 con rutina null y mensaje claro, sin errores técnicos (HU5 esc.3, FR-015)',
    sinRutina.status === 200 &&
      sinRutina.body.datos?.rutina === null &&
      typeof sinRutina.body.datos?.mensaje === 'string' &&
      sinRutina.body.datos.mensaje.length > 0 &&
      (sinSeguimiento.body.datos?.objetivos ?? []).length === 0 &&
      (sinSeguimiento.body.datos?.progresos ?? []).length === 0,
    `mensaje "${sinRutina.body.datos?.mensaje}"`);
}

{
  const ajeno = await peticion('get', `/api/clientes/${cliente2.id}`, tokenCliente);
  const manipulada = await peticion(
    'get',
    `/api/clientes/mio/rutina?cliente_id=${cliente2.id}`,
    tokenCliente
  );
  const rutinasAjenas = await peticion(
    'get',
    `/api/rutinas?cliente_id=${clienteX.id}`,
    tokenEntrena2
  );
  const progresosAjenos = await peticion(
    'get',
    `/api/progresos?cliente_id=${clienteX.id}`,
    tokenEntrena2
  );
  cond(23, 'Aislamiento: nunca datos ajenos, aunque se manipule la solicitud (HU5 esc.4, SC-005)',
    ajeno.status === 403 &&
      manipulada.status === 200 &&
      manipulada.body.datos?.rutina?.nombre === 'Plan nuevo Q' &&
      rutinasAjenas.status === 403 &&
      progresosAjenos.status === 403,
    `ficha ajena ${ajeno.status}, parámetro ignorado ${manipulada.body.datos?.rutina?.nombre}, rutinas ${rutinasAjenas.status}, progresos ${progresosAjenos.status}`);
}

// ---------------------------------------------------------------------------
// Escenarios 24–26: dashboard (HU6)
// ---------------------------------------------------------------------------

// Membresía y pago del mes en curso: habilitan las cifras financieras del
// periodo y el estado de membresía que exige el escenario 30.
const membresiaX = await peticion('post', '/api/membresias', tokenRecep).send({
  cliente_id: clienteX.id,
  tipo_membresia_id: 1, // Mensual (30 días, 150)
  fecha_inicio: HOY,
});
await peticion('post', '/api/pagos', tokenRecep).send({
  cliente_id: clienteX.id,
  membresia_id: membresiaX.body.datos.id,
  monto: 150,
});

{
  const periodos = [];
  for (const periodo of ['mes', '30d', 'historico']) {
    const r = await peticion('get', `/api/dashboard?periodo=${periodo}`, tokenAdmin);
    periodos.push({ periodo, r });
  }
  const mes = periodos[0].r.body.datos ?? {};
  const historico = periodos[2].r.body.datos ?? {};
  const claves = Object.keys(mes.indicadores ?? {});
  const invalido = await peticion('get', '/api/dashboard?periodo=semana', tokenAdmin);
  cond(24, 'Dashboard admin: 14 indicadores recalculados por mes/30d/histórico (HU6 esc.1-2, FR-016/017)',
    periodos.every(({ periodo, r }) => r.status === 200 && r.body.datos?.periodo === periodo) &&
      claves.length === 14 &&
      mes.indicadores.entrenadores_activos >= 2 &&
      mes.indicadores.rutinas_activas >= 1 &&
      mes.indicadores.progresos_recientes >= 1 &&
      mes.indicadores.ingresos_periodo > 0 &&
      historico.indicadores.ingresos_periodo >= mes.indicadores.ingresos_periodo &&
      invalido.status === 400,
    `${claves.length} indicadores, ingresos mes ${mes.indicadores?.ingresos_periodo}, periodo inválido ${invalido.status}`);
}

{
  const panel = await peticion('get', '/api/dashboard/mio?periodo=mes', tokenEntrena);
  const ind = panel.body.datos?.indicadores ?? {};
  const claves = Object.keys(ind).sort().join(',');
  cond(25, 'Panel del entrenador: solo su carga y ninguna cifra financiera (clarify Q1 B, HU6 esc.6)',
    panel.status === 200 &&
      claves ===
        'clientes_carga,objetivos_cumplidos,objetivos_en_curso,progresos_recientes,rutinas_activas' &&
      ind.clientes_carga >= 1 &&
      !/ingres|monto|pago/i.test(JSON.stringify(ind)),
    `claves [${claves}], clientes_carga ${ind.clientes_carga}`);
}

{
  const dashRecep = await peticion('get', '/api/dashboard', tokenRecep);
  const dashCliente = await peticion('get', '/api/dashboard/mio', tokenCliente);
  cond(26, 'Dashboard denegado a recepcionista y cliente: 403 en ambos (HU6 esc.3, FR-018)',
    dashRecep.status === 403 && dashCliente.status === 403,
    `recep ${dashRecep.status}, cliente ${dashCliente.status}`);
}

// ---------------------------------------------------------------------------
// Escenarios 28–31: personal asignado (HU7)
// ---------------------------------------------------------------------------

{
  const admin = await peticion('get', '/api/entrenadores', tokenAdmin);
  const recep = await peticion('get', '/api/entrenadores', tokenRecep);
  const filas = admin.body.datos ?? [];
  const todosCompletos = filas.every(
    (e) => e.usuario?.email && typeof e.clientes_asignados === 'number'
  );
  cond(28, 'Personal con usuario, clientes vigentes y conteo de carga para admin y recepcionista (HU7 esc.1-2)',
    admin.status === 200 &&
      recep.status === 200 &&
      todosCompletos &&
      filas.find((e) => e.id === idEva)?.clientes_asignados >= 1,
    `${filas.length} perfiles, completos ${todosCompletos}`);
}

{
  // El perfil recién creado se da de alta para poder consultar su ficha
  // (escenario 29: entrenador recién creado con carga en 0).
  await crearUsuario('Sin Carga S3', 'sincarga@s3.test', 'Entrena1234', 'entrenador');
  const perfilSinCarga = await peticion('post', '/api/entrenadores', tokenAdmin).send({
    usuario_id: await idUsuario('sincarga@s3.test'),
    nombre: 'Sin Carga S3',
  });
  if (perfilSinCarga.status !== 201) throw new Error('No se pudo crear el perfil de Sin Carga');
  const idSinCarga = perfilSinCarga.body.datos?.id ?? (await idEntrenador(await idUsuario('sincarga@s3.test')));
  const ficha = await peticion('get', `/api/entrenadores/${idSinCarga}`, tokenAdmin);
  const enListado = (await peticion('get', '/api/entrenadores', tokenAdmin)).body.datos.find(
    (e) => e.id === idSinCarga
  );
  cond(29, 'Entrenador recién creado: carga en 0 con mensaje claro y sin error (HU7 esc.3)',
    ficha.status === 200 &&
      (ficha.body.datos?.clientes ?? []).length === 0 &&
      enListado?.clientes_asignados === 0,
    `clientes ${(ficha.body.datos?.clientes ?? []).length}, conteo ${enListado?.clientes_asignados}`);
}

{
  const carga = await peticion('get', '/api/entrenadores/mio/clientes', tokenEntrena);
  const filas = carga.body.datos ?? [];
  const lucia = filas.find((c) => c.id === clienteX.id);
  const texto = JSON.stringify(carga.body);
  cond(30, 'Carga propia: solo sus clientes con estado de membresía y sin importes (HU7 esc.4, Principio VI)',
    carga.status === 200 &&
      lucia?.membresia?.estado === 'activa' &&
      /^\d{4}-\d{2}-\d{2}$/.test(lucia?.membresia?.fecha_vencimiento ?? '') &&
      !filas.some((c) => c.id === clienteY.id || c.id === cliente2.id || c.id === clienteW.id) &&
      !/importe|monto|precio/i.test(texto),
    `${filas.length} clientes, membresía ${lucia?.membresia?.estado}`);
}

{
  const lista = await peticion('get', '/api/entrenadores', tokenCliente);
  const asignaciones = await peticion('get', '/api/asignaciones', tokenCliente);
  cond(31, 'Cliente sin acceso al personal: 403 en entrenadores y asignaciones (HU7 esc.5)',
    lista.status === 403 && asignaciones.status === 403,
    `entrenadores ${lista.status}, asignaciones ${asignaciones.status}`);
}

// ---------------------------------------------------------------------------
// Escenarios 32–36: auditoría, permisos, sin borrados, rendimiento y flujo
// ---------------------------------------------------------------------------

{
  const esperadas = {
    entrenadores: 'crear_entrenador',
    asignaciones: 'asignar_entrenador',
    rutinas: 'crear_rutina',
    objetivos: 'crear_objetivo',
    progresos: 'registrar_progreso',
  };
  const estados = [];
  const detalles = [];
  for (const [modulo, accion] of Object.entries(esperadas)) {
    const r = await peticion('get', `/api/auditoria?modulo=${modulo}`, tokenAdmin);
    const filas = r.body.datos ?? [];
    estados.push(r.status === 200 && filas.some((f) => f.accion === accion));
    detalles.push(`${modulo}:${filas.length}`);
  }
  const audRecep = await peticion('get', '/api/auditoria', tokenRecep);
  cond(32, 'Auditoría del sprint con usuario, fecha y resultado; 403 a otros roles (FR-023, SC-009)',
    estados.every(Boolean) && audRecep.status === 403,
    `${detalles.join(', ')}, recep ${audRecep.status}`);
}

{
  const muestras = [
    ['post', '/api/usuarios', tokenRecep, { nombre: 'X', email: 'x@s3.test', contraseña: 'X1234567', rol: 'cliente' }],
    ['get', '/api/dashboard', tokenRecep, null],
    ['put', `/api/entrenadores/${idEva}`, tokenRecep, { nombre: 'Hacked' }],
    ['put', `/api/rutinas/${rutina1.body.datos.id}`, tokenRecep, { nombre: 'Hacked' }],
    ['get', '/api/auditoria', tokenRecep, null],
    ['get', '/api/dashboard', tokenEntrena, null],
    ['get', '/api/entrenadores', tokenEntrena, null],
    ['post', '/api/asignaciones', tokenEntrena, { entrenador_id: idIvan, cliente_id: clienteW.id }],
    ['get', '/api/usuarios', tokenEntrena, null],
    ['get', '/api/auditoria', tokenEntrena, null],
    ['get', '/api/entrenadores', tokenCliente, null],
    ['get', '/api/rutinas', tokenCliente, null],
    ['get', '/api/clientes', tokenCliente, null],
    ['post', '/api/rutinas', tokenCliente, { cliente_id: clienteX.id, nombre: 'X', ejercicios: [] }],
    ['get', '/api/dashboard', tokenCliente, null],
  ];
  const estados = [];
  for (const [metodo, ruta, token, cuerpo] of muestras) {
    let p = peticion(metodo, ruta, token);
    if (cuerpo) p = p.send(cuerpo);
    const r = await p;
    estados.push(r.status);
  }
  cond(33, 'Permisos en servidor: 403 en cada endpoint restringido probado (FR-021, Principio V)',
    estados.every((s) => s === 403), `estados ${estados.join(',')}`);
}

{
  const rutas = [
    `/api/entrenadores/${idEva}`,
    `/api/asignaciones/${asignX.body.datos.id}`,
    `/api/rutinas/${rutina2.body.datos.id}`,
    `/api/objetivos/${objetivo.body.datos.id}`,
    `/api/progresos/${progreso1.body.datos.id}`,
  ];
  const estados = [];
  for (const ruta of rutas) {
    const r = await peticion('delete', ruta, tokenAdmin);
    estados.push(r.status);
  }
  const [entrenadores, asignaciones, rutinas, objetivos, progresos] = await Promise.all([
    consultar('SELECT COUNT(*) AS n FROM entrenadores'),
    consultar('SELECT COUNT(*) AS n FROM asignaciones_entrenador'),
    consultar('SELECT COUNT(*) AS n FROM rutinas'),
    consultar('SELECT COUNT(*) AS n FROM objetivos_entrenamiento'),
    consultar('SELECT COUNT(*) AS n FROM progresos_clientes'),
  ]);
  const persisten =
    entrenadores[0].n >= 4 &&
    asignaciones[0].n >= 3 &&
    rutinas[0].n >= 2 &&
    objetivos[0].n >= 1 &&
    progresos[0].n >= 2;
  cond(34, 'Sin borrados: ninguna ruta DELETE existe y los registros persisten (FR-010, FR-025)',
    estados.every((s) => s === 404) && persisten,
    `DELETE ${estados.join(',')}; entrenadores ${entrenadores[0].n}, rutinas ${rutinas[0].n}, progresos ${progresos[0].n}`);
}

{
  const inicio = Date.now();
  const dash = await peticion('get', '/api/dashboard?periodo=30d', tokenAdmin);
  const ms = Date.now() - inicio;
  cond(35, 'Rendimiento: indicadores del dashboard visibles en menos de 3 s (SC-006)',
    dash.status === 200 && ms < 3000, `${ms} ms`);
}

{
  const flujoCompleto = resultados.filter((r) => r.numero <= 35).every((r) => r.ok);
  cond(36, 'Demostración completa: entrenador → asignación → rutina → objetivo/progreso → cliente → dashboard (SC-001, SC-010)',
    flujoCompleto,
    'criterio humano (90% del personal sin ayuda) queda registrado como verificación manual');
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

const unicos = [...new Map(resultados.map((r) => [`${r.numero}-${r.titulo}`, r])).values()];
const numeros = [...new Set(unicos.map((r) => r.numero))].sort((a, b) => a - b);
const exitos = unicos.filter((r) => r.ok).length;
console.log('\n---------------------------------------------');
console.log(`Escenarios: ${numeros.length} | Filas OK: ${exitos}/${unicos.length} | FALLOS: ${unicos.length - exitos}`);
if (numeros.length !== 36) {
  console.log(`ADVERTENCIA: se esperaban 36 escenarios y se emitieron ${numeros.length}.`);
}
console.log('---------------------------------------------');

await consultar('SELECT 1'); // libera el pool antes de salir
process.exit(exitos === unicos.length && numeros.length === 36 ? 0 : 1);
