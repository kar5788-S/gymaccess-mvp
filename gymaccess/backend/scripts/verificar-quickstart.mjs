// T086 [Polish] Verificación automática de los 34 escenarios de
// `specs/002-sprint2-membresias-pagos-acceso-facial/quickstart.md`.
//
// Se ejecuta contra una base de datos TEMPORAL (`gymaccess_quickstart`)
// con migraciones y seeds aplicados; NUNCA toca la base de datos real.
// Los escenarios de cámara usan descriptores simulados (vectores de 128
// valores), tal como indica el propio quickstart para CI.
//
// Uso:
//   1) Crear la BD temporal y aplicar migraciones/seeds (ver informe).
//   2) cd backend && node scripts/verificar-quickstart.mjs
// Sale con código 1 si algún escenario falla.

// Variables de entorno ANTES de importar la app (config/db.js las lee al cargar).
process.env.DB_NOMBRE = process.env.DB_NOMBRE_VERIFICACION || 'gymaccess_quickstart';
process.env.FACIAL_UMBRAL_COINCIDENCIA = '0.6';

// Carga backend/.env (credenciales reales); dotenv NO pisa DB_NOMBRE, que ya
// quedó apuntando a la base de datos temporal.
await import('dotenv/config');

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { consultar } = await import('../src/config/db.js');

// ---------------------------------------------------------------------------
// Utilidades
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

const sumarDias = (fecha, n) => iso(new Date(Date.parse(`${fecha}T00:00:00Z`) + n * 86400000));

const HOY = dias(0);

// Vectores simulados de 128 dimensiones (uno por cliente, bien separados
// entre sí: distancias >> umbral 0.6; el "cercano" está a ~0.113).
const vector = (base) => Array.from({ length: 128 }, (_, i) => base + i / 1000);
const cercano = (base) => vector(base).map((v) => v + 0.01);
const V_LEJANO = Array.from({ length: 128 }, () => 0.9);

const peticion = (metodo, ruta, token) => {
  const p = request(app)[metodo](ruta);
  return token ? p.set('Authorization', `Bearer ${token}`) : p;
};

// ---------------------------------------------------------------------------
// Preparación: usuarios de prueba
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

const tokenRecep = await crearUsuario('Recepcionista Q', 'recep@quick.test', 'Recep1234', 'recepcionista');
const tokenEntrena = await crearUsuario('Entrenador Q', 'entrena@quick.test', 'Entrena1234', 'entrenador');
const tokenCliente = await crearUsuario('Cliente Q', 'cliente@quick.test', 'Cliente1234', 'cliente');

// Cliente vinculado al usuario de rol cliente (para escenario 16).
async function crearCliente(nombre, token, datosExtra = {}) {
  const res = await peticion('post', '/api/clientes', token).send({
    nombre_completo: nombre,
    telefono: '555-0000',
    ...datosExtra,
  });
  if (res.status !== 201) throw new Error(`No se pudo crear el cliente ${nombre}: ${res.status}`);
  return res.body.datos;
}

// ---------------------------------------------------------------------------
// Escenarios 1–3: tipos de membresía (HU1)
// ---------------------------------------------------------------------------

{
  const creada = await peticion('post', '/api/tipos-membresia', tokenAdmin)
    .send({ nombre: 'Semestral Q', descripcion: '180 días', duracion_dias: 180, precio: 700 });
  cond(1, 'Alta de tipo de membresía (HU1, SC-002)', creada.status === 201 && creada.body.datos.duracion_dias === 180, `status ${creada.status}`);

  const invalida = await peticion('post', '/api/tipos-membresia', tokenAdmin)
    .send({ nombre: 'Sin duración', duracion_dias: 0, precio: -5 });
  const conteo = await consultar('SELECT COUNT(*) AS n FROM tipos_membresia');
  cond(2, 'Validación de tipo: duración/precio inválidos (HU1 esc.2)',
    invalida.status === 400 && conteo[0].n === 4, `status ${invalida.status}, tipos ${conteo[0].n}`);

  const prohibida = await peticion('post', '/api/tipos-membresia', tokenRecep)
    .send({ nombre: 'No debería', duracion_dias: 30, precio: 100 });
  cond(3, 'Tipos exclusivos del administrador (FR-016)', prohibida.status === 403, `status ${prohibida.status}`);
}

// ---------------------------------------------------------------------------
// Escenarios 4–10: membresías (HU2, HU4)
// ---------------------------------------------------------------------------

const clienteLucia = await crearCliente('Lucía Quickstart', tokenRecep);
const MEMBRESIA_LUCIA_INICIO = dias(-29); // vence HOY (vigencia inclusiva)

const membresiaLucia = await peticion('post', '/api/membresias', tokenRecep).send({
  cliente_id: clienteLucia.id,
  tipo_membresia_id: 1, // Mensual (30 días, 150)
  fecha_inicio: MEMBRESIA_LUCIA_INICIO,
});

cond(4, 'Asignación válida con vencimiento = inicio + duración (HU2, SC-003)',
  membresiaLucia.status === 201 &&
    membresiaLucia.body.datos.fecha_vencimiento === sumarDias(MEMBRESIA_LUCIA_INICIO, 30) &&
    membresiaLucia.body.datos.estado === 'activa',
  `vence ${membresiaLucia.body.datos?.fecha_vencimiento}`);

const clienteBaja = await crearCliente('Baja Quickstart', tokenRecep);
await peticion('put', `/api/clientes/${clienteBaja.id}`, tokenAdmin).send({ estado: 'inactivo' });
const aBaja = await peticion('post', '/api/membresias', tokenAdmin).send({
  cliente_id: clienteBaja.id,
  tipo_membresia_id: 1,
  fecha_inicio: HOY,
});
cond(5, 'Cliente inactivo → 409 CLIENTE_NO_ACTIVO (HU2 esc.6)',
  aBaja.status === 409 && aBaja.body.error.codigo === 'CLIENTE_NO_ACTIVO', aBaja.body.error?.codigo);

const duplicada = await peticion('post', '/api/membresias', tokenRecep).send({
  cliente_id: clienteLucia.id,
  tipo_membresia_id: 1,
  fecha_inicio: dias(30),
});
cond(6, 'Membresía activa existente → 409 MEMBRESIA_ACTIVA_EXISTENTE (FR-004)',
  duplicada.status === 409 && duplicada.body.error.codigo === 'MEMBRESIA_ACTIVA_EXISTENTE', duplicada.body.error?.codigo);

// Escenario 7: bloqueo por adeudo al renovar.
const clienteDiego = await crearCliente('Diego Quickstart', tokenRecep);
const membresiaDiego = await peticion('post', '/api/membresias', tokenRecep).send({
  cliente_id: clienteDiego.id,
  tipo_membresia_id: 1,
  fecha_inicio: HOY,
});
await peticion('post', '/api/pagos', tokenRecep).send({
  cliente_id: clienteDiego.id,
  membresia_id: membresiaDiego.body.datos.id,
  monto: 50,
});
const renovarConAdeudo = await peticion('post', `/api/membresias/${membresiaDiego.body.datos.id}/renovar`, tokenRecep);
const pagoResto = await peticion('post', '/api/pagos', tokenRecep).send({
  cliente_id: clienteDiego.id,
  membresia_id: membresiaDiego.body.datos.id,
  monto: 100,
});
const renovarSaldada = await peticion('post', `/api/membresias/${membresiaDiego.body.datos.id}/renovar`, tokenRecep);
cond(7, 'Bloqueo por adeudo y desbloqueo tras pagar (FR-023, SC-003)',
  renovarConAdeudo.status === 409 &&
    renovarConAdeudo.body.error.codigo === 'ADEUDO_PENDIENTE' &&
    pagoResto.status === 201 &&
    renovarSaldada.status === 200,
  `${renovarConAdeudo.body.error?.codigo ?? ''} → ${renovarSaldada.status}`);

cond(8, 'Renovación extiende el vencimiento en la duración del plan (HU4, R-21)',
  renovarSaldada.status === 200 &&
    renovarSaldada.body.datos.fecha_vencimiento === sumarDias(sumarDias(HOY, 30), 30) &&
    renovarSaldada.body.datos.estado === 'activa',
  `nuevo vence ${renovarSaldada.body.datos?.fecha_vencimiento}`);

// Renovación de una membresía ya vencida por fecha.
const clienteVenc = await crearCliente('Vencida Quickstart', tokenRecep);
const membVenc = await peticion('post', '/api/membresias', tokenRecep).send({
  cliente_id: clienteVenc.id,
  tipo_membresia_id: 1,
  fecha_inicio: dias(-100),
});
await peticion('post', '/api/pagos', tokenRecep).send({
  cliente_id: clienteVenc.id,
  membresia_id: membVenc.body.datos.id,
  monto: 150,
});
const renovarVencida = await peticion('post', `/api/membresias/${membVenc.body.datos.id}/renovar`, tokenRecep);
cond(8, 'Renovación también aplica a membresías vencidas (HU4)',
  renovarVencida.status === 200 && renovarVencida.body.datos.estado === 'activa', `status ${renovarVencida.status}`);

// Escenario 9: estados que no permiten renovar.
const clienteAna = await crearCliente('Ana Quickstart', tokenRecep);
const membAna = await peticion('post', '/api/membresias', tokenRecep).send({
  cliente_id: clienteAna.id,
  tipo_membresia_id: 1,
  fecha_inicio: HOY,
});
await peticion('post', '/api/pagos', tokenRecep).send({
  cliente_id: clienteAna.id,
  membresia_id: membAna.body.datos.id,
  monto: 150,
});
await peticion('put', `/api/membresias/${membAna.body.datos.id}/estado`, tokenAdmin).send({ estado: 'suspendida' });
const renovarSuspendida = await peticion('post', `/api/membresias/${membAna.body.datos.id}/renovar`, tokenRecep);
await peticion('put', `/api/membresias/${membAna.body.datos.id}/estado`, tokenAdmin).send({ estado: 'activa' });
await peticion('put', `/api/membresias/${membAna.body.datos.id}/estado`, tokenAdmin).send({ estado: 'cancelada' });
const renovarCancelada = await peticion('post', `/api/membresias/${membAna.body.datos.id}/renovar`, tokenRecep);
cond(9, 'Renovar suspendida o cancelada → 409 ESTADO_NO_PERMITE (HU4 esc.2)',
  renovarSuspendida.status === 409 &&
    renovarSuspendida.body.error.codigo === 'ESTADO_NO_PERMITE' &&
    renovarCancelada.status === 409,
  `${renovarSuspendida.body.error?.codigo}/${renovarCancelada.body.error?.codigo}`);

// Escenario 10: suspensión → reactivación conserva la fecha.
const clienteBeto = await crearCliente('Beto Quickstart', tokenRecep);
const membBeto = await peticion('post', '/api/membresias', tokenRecep).send({
  cliente_id: clienteBeto.id,
  tipo_membresia_id: 1,
  fecha_inicio: HOY,
});
const vencimientoOriginal = membBeto.body.datos.fecha_vencimiento;
await peticion('put', `/api/membresias/${membBeto.body.datos.id}/estado`, tokenAdmin).send({ estado: 'suspendida' });
const reactivada = await peticion('put', `/api/membresias/${membBeto.body.datos.id}/estado`, tokenAdmin).send({ estado: 'activa' });
cond(10, 'Suspender y reactivar conserva fecha_vencimiento idéntica (R-21)',
  reactivada.status === 200 &&
    reactivada.body.datos.fecha_vencimiento === vencimientoOriginal,
  `${vencimientoOriginal} → ${reactivada.body.datos?.fecha_vencimiento}`);

// ---------------------------------------------------------------------------
// Escenarios 11–17: pagos y adeudos (HU3, HU7, FR-009/010)
// ---------------------------------------------------------------------------

{
  const pago = await peticion('post', '/api/pagos', tokenRecep).send({
    cliente_id: clienteDiego.id,
    membresia_id: membresiaDiego.body.datos.id,
    monto: 25,
    metodo: 'efectivo',
    fecha_pago: HOY,
  });
  cond(11, 'Pago válido con método efectivo (HU3, SC-003)',
    pago.status === 201 && pago.body.datos.metodo === 'efectivo', `status ${pago.status}`);

  const transferencia = await peticion('post', '/api/pagos', tokenAdmin).send({
    cliente_id: clienteDiego.id,
    membresia_id: membresiaDiego.body.datos.id,
    monto: 10,
    metodo: 'transferencia',
  });
  cond(12, 'Método único: transferencia/tarjeta → 400 (R-18)',
    transferencia.status === 400 && transferencia.body.error.codigo === 'VALIDACION', transferencia.body.error?.codigo);

  const montoCero = await peticion('post', '/api/pagos', tokenAdmin).send({
    cliente_id: clienteDiego.id,
    membresia_id: membresiaDiego.body.datos.id,
    monto: 0,
  });
  cond(13, 'Monto cero o negativo → 400 (HU3 esc.2)', montoCero.status === 400, `status ${montoCero.status}`);

  const antes = (await consultar('SELECT COUNT(*) AS n FROM pagos'))[0].n;
  const borrar = await peticion('delete', `/api/pagos/${pago.body.datos.id}`, tokenAdmin);
  const editar = await peticion('put', `/api/pagos/${pago.body.datos.id}`, tokenAdmin).send({ monto: 999 });
  const despues = (await consultar('SELECT COUNT(*) AS n FROM pagos'))[0].n;
  cond(14, 'Historial inmutable: sin DELETE/PUT de pagos (FR-008)',
    borrar.status === 404 && editar.status === 404 && despues === antes,
    `delete ${borrar.status}, put ${editar.status}, pagos ${despues}`);

  // Escenario 15: saldo = max(0, precio − Σ pagos); excedente → saldo 0.
  const clienteFer = await crearCliente('Fernanda Quickstart', tokenRecep);
  const membFer = await peticion('post', '/api/membresias', tokenRecep).send({
    cliente_id: clienteFer.id,
    tipo_membresia_id: 1,
    fecha_inicio: HOY,
  });
  await peticion('post', '/api/pagos', tokenRecep).send({
    cliente_id: clienteFer.id,
    membresia_id: membFer.body.datos.id,
    monto: 50,
  });
  const parcial = await peticion('get', `/api/membresias?cliente_id=${clienteFer.id}`, tokenAdmin);
  await peticion('post', '/api/pagos', tokenRecep).send({
    cliente_id: clienteFer.id,
    membresia_id: membFer.body.datos.id,
    monto: 500,
  });
  const excedido = await peticion('get', `/api/membresias?cliente_id=${clienteFer.id}`, tokenAdmin);
  const historialFer = await peticion('get', `/api/pagos?cliente_id=${clienteFer.id}`, tokenRecep);
  cond(15, 'Saldo = max(0, precio − Σ pagos); excedente → saldo 0 sin borrar pagos (FR-009)',
    parcial.body.datos[0].saldo_pendiente === 100 &&
      excedido.body.datos[0].saldo_pendiente === 0 &&
      historialFer.body.datos.length === 2,
    `${parcial.body.datos[0]?.saldo_pendiente} → ${excedido.body.datos[0]?.saldo_pendiente}, pagos ${historialFer.body.datos.length}`);
}

// Escenario 16: el cliente ve solo lo suyo.
const { id: idUsuarioCliente } = await consultar(
  "SELECT id FROM usuarios WHERE email = 'cliente@quick.test'"
).then((f) => f[0]);
const clienteVinculado = await crearCliente('Carla Cliente Q', tokenAdmin, { usuario_id: idUsuarioCliente });
const membCarla = await peticion('post', '/api/membresias', tokenRecep).send({
  cliente_id: clienteVinculado.id,
  tipo_membresia_id: 1,
  fecha_inicio: HOY,
});
await peticion('post', '/api/pagos', tokenRecep).send({
  cliente_id: clienteVinculado.id,
  membresia_id: membCarla.body.datos.id,
  monto: 50,
});
const miosPagos = await peticion('get', '/api/pagos/mios', tokenCliente);
const miosAdeudos = await peticion('get', '/api/adeudos/mios', tokenCliente);
const miosMembresia = await peticion('get', '/api/clientes/mio/membresia', tokenCliente);
const pagosAjeno = await peticion('get', '/api/pagos', tokenCliente);
const adeudosAjeno = await peticion('get', '/api/adeudos', tokenCliente);
const clientesAjeno = await peticion('get', '/api/clientes', tokenCliente);
cond(16, 'El cliente ve solo lo suyo: pagos, adeudos y membresía (FR-010, FR-024)',
  miosPagos.status === 200 &&
    miosPagos.body.datos.length === 1 &&
    miosAdeudos.status === 200 &&
    miosAdeudos.body.datos.length === 1 &&
    miosMembresia.status === 200 &&
    miosMembresia.body.datos.estado === 'activa' &&
    pagosAjeno.status === 403 &&
    adeudosAjeno.status === 403 &&
    clientesAjeno.status === 403,
  `mios ${miosPagos.status}/${miosAdeudos.status}/${miosMembresia.status}; ajenos ${pagosAjeno.status}/${adeudosAjeno.status}/${clientesAjeno.status}`);

const entrenaPagos = await peticion('get', '/api/pagos', tokenEntrena);
const entrenaAdeudos = await peticion('get', '/api/adeudos', tokenEntrena);
const entrenaMembresias = await peticion('get', '/api/membresias', tokenEntrena);
const entrenaAccesos = await peticion('get', '/api/accesos', tokenEntrena);
const sinFinanzas =
  entrenaMembresias.status === 200 &&
  entrenaMembresias.body.datos.every(
    (m) => !('precio' in m) && !('saldo_pendiente' in m)
  );
cond(17, 'Entrenador sin finanzas: 403 en pagos/adeudos; sin importes en membresías (Principio VI)',
  entrenaPagos.status === 403 && entrenaAdeudos.status === 403 && sinFinanzas && entrenaAccesos.status === 200,
  `pagos ${entrenaPagos.status}, adeudos ${entrenaAdeudos.status}, accesos ${entrenaAccesos.status}`);

// ---------------------------------------------------------------------------
// Escenarios 18–20: información facial (HU5, FR-011/017)
// ---------------------------------------------------------------------------

{
  const primero = await peticion('post', '/api/rostros', tokenRecep).send({
    cliente_id: clienteLucia.id,
    descriptor: vector(0),
  });
  const filas1 = (await consultar('SELECT COUNT(*) AS n FROM rostros WHERE cliente_id = ?', [clienteLucia.id]))[0].n;
  const segundo = await peticion('post', '/api/rostros', tokenRecep).send({
    cliente_id: clienteLucia.id,
    descriptor: vector(0.02),
  });
  const filas2 = (await consultar('SELECT COUNT(*) AS n FROM rostros WHERE cliente_id = ?', [clienteLucia.id]))[0].n;
  cond(18, 'Registro facial y reemplazo en la misma fila (HU5, FR-011)',
    primero.status === 201 && segundo.status === 201 && filas1 === 1 && filas2 === 1,
    `status ${primero.status}/${segundo.status}, filas ${filas1}/${filas2}`);

  const sinFicha = await peticion('post', '/api/rostros', tokenAdmin).send({
    cliente_id: 99999,
    descriptor: vector(0),
  });
  cond(19, 'Rostro sin ficha de cliente → 404 (HU5 esc.3)', sinFicha.status === 404, `status ${sinFicha.status}`);

  const consultaRostro = await peticion('get', `/api/rostros/${clienteLucia.id}`, tokenAdmin);
  const consultaCliente = await peticion('get', `/api/clientes/${clienteLucia.id}`, tokenRecep);
  const auditoria = await peticion('get', '/api/auditoria', tokenAdmin);
  const texto = JSON.stringify(consultaRostro.body) + JSON.stringify(consultaCliente.body) + JSON.stringify(auditoria.body);
  cond(20, 'Ninguna respuesta expone descriptor_facial (FR-017, SC-008)',
    !texto.includes('descriptor_facial') && !texto.includes('descriptor'),
    'sin datos biométricos en respuestas');
}

// ---------------------------------------------------------------------------
// Escenarios 21–28: control de acceso (HU6, HU8)
// ---------------------------------------------------------------------------

async function prepararClienteConRostro(nombre, base, estadoMembresia) {
  const cliente = await crearCliente(nombre, tokenRecep);
  await peticion('post', '/api/rostros', tokenRecep).send({
    cliente_id: cliente.id,
    descriptor: vector(base),
  });
  if (estadoMembresia !== 'ninguna') {
    const memb = await peticion('post', '/api/membresias', tokenRecep).send({
      cliente_id: cliente.id,
      tipo_membresia_id: 1,
      fecha_inicio: estadoMembresia === 'vencida' ? dias(-100) : HOY,
    });
    await peticion('post', '/api/pagos', tokenRecep).send({
      cliente_id: cliente.id,
      membresia_id: memb.body.datos.id,
      monto: 150,
    });
    if (estadoMembresia === 'suspendida') {
      await peticion('put', `/api/membresias/${memb.body.datos.id}/estado`, tokenAdmin).send({ estado: 'suspendida' });
    }
    if (estadoMembresia === 'cancelada') {
      await peticion('put', `/api/membresias/${memb.body.datos.id}/estado`, tokenAdmin).send({ estado: 'cancelada' });
    }
  }
  return cliente;
}

const clienteRosa = await prepararClienteConRostro('Rosa Vencida Q', 0.1, 'vencida');
const clienteSaul = await prepararClienteConRostro('Saúl Suspendido Q', 0.2, 'suspendida');
const clienteCris = await prepararClienteConRostro('Cris Cancelado Q', 0.3, 'cancelada');
const clienteNini = await prepararClienteConRostro('Nini Sin Membresía Q', 0.4, 'ninguna');

const intento = (descriptor, token = tokenRecep) =>
  peticion('post', '/api/accesos/intento', token).send({ descriptor });

const accesoAutorizado = await intento(cercano(0)); // Lucía: activa que vence HOY
cond(21, 'Acceso autorizado: rostro + membresía vigente, intento registrado (HU6 esc.1, SC-004)',
  accesoAutorizado.status === 200 &&
    accesoAutorizado.body.datos.resultado === 'autorizado' &&
    accesoAutorizado.body.datos.cliente?.nombre === 'Lucía Quickstart' &&
    (await consultar('SELECT COUNT(*) AS n FROM accesos WHERE resultado = ? AND cliente_id = ?', ['autorizado', clienteLucia.id]))[0].n === 1,
  accesoAutorizado.body.mensaje);

const accesoVencida = await intento(cercano(0.1));
cond(22, 'Rechazo por membresía vencida con motivo y registro (HU6 esc.2, SC-004)',
  accesoVencida.status === 200 &&
    accesoVencida.body.datos.resultado === 'rechazado' &&
    accesoVencida.body.datos.motivo === 'membresia_vencida',
  accesoVencida.body.mensaje);

const accesoSuspendida = await intento(cercano(0.2));
const accesoCancelada = await intento(cercano(0.3));
const accesoSinMembresia = await intento(cercano(0.4));
cond(23, 'Rechazos por suspendida, cancelada y sin membresía (HU6 esc.3-4)',
  accesoSuspendida.body.datos?.motivo === 'membresia_suspendida' &&
    accesoCancelada.body.datos?.motivo === 'membresia_cancelada' &&
    accesoSinMembresia.body.datos?.motivo === 'sin_membresia',
  `${accesoSuspendida.body.datos?.motivo}/${accesoCancelada.body.datos?.motivo}/${accesoSinMembresia.body.datos?.motivo}`);

const accesoDesconocido = await intento(V_LEJANO);
const accesoSinCamara = await intento(null);
cond(24, 'Rostro no identificado y descriptor null → rostro_no_identificado (HU6 esc.5, SC-006)',
  accesoDesconocido.body.datos?.motivo === 'rostro_no_identificado' &&
    accesoSinCamara.body.datos?.motivo === 'rostro_no_identificado',
  `${accesoDesconocido.body.mensaje} / ${accesoSinCamara.body.mensaje}`);

cond(25, 'Identificación antes que membresía: cliente y membresia en null (HU6 esc.7, FR-012)',
  accesoDesconocido.body.datos.cliente === null && accesoDesconocido.body.datos.membresia === null,
  'sin datos de terceros');

cond(26, 'Ningún acceso se autoriza solo por coincidencia facial (FR-013, SC-006)',
  accesoSinMembresia.body.datos.resultado === 'rechazado',
  'rostro coincide pero sin membresía vigente se rechaza');

const historial = await peticion('get', '/api/accesos', tokenAdmin);
const filasHistorial = historial.body.datos ?? [];
cond(27, 'Todos los intentos aparecen en GET /api/accesos con fecha, hora y motivo (FR-015, SC-005)',
  historial.status === 200 &&
    filasHistorial.length >= 6 &&
    filasHistorial.every((f) => f.fecha && f.hora && f.resultado) &&
    filasHistorial.filter((f) => f.resultado === 'rechazado').every((f) => f.motivo) &&
    (await consultar('SELECT COUNT(*) AS n FROM accesos'))[0].n === filasHistorial.length,
  `${filasHistorial.length} intentos registrados`);

const porFecha = await peticion('get', `/api/accesos?fecha=${HOY}`, tokenRecep);
const porResultado = await peticion('get', '/api/accesos?resultado=rechazado', tokenRecep);
const vacio = await peticion('get', '/api/accesos?fecha=2000-01-01', tokenRecep);
cond(28, 'Filtros de accesos y estado vacío sin error (HU8 esc.4)',
  porFecha.status === 200 &&
    porFecha.body.datos.every((f) => f.fecha === HOY) &&
    porResultado.status === 200 &&
    porResultado.body.datos.every((f) => f.resultado === 'rechazado') &&
    vacio.status === 200 &&
    vacio.body.datos.length === 0,
  `fecha ${porFecha.body.datos?.length}, rechazos ${porResultado.body.datos?.length}, vacío ${vacio.body.datos?.length}`);

// ---------------------------------------------------------------------------
// Escenarios 29–34: baja, auditoría, permisos, fechas, rendimiento, demo
// ---------------------------------------------------------------------------

{
  const baja = await peticion('put', `/api/clientes/${clienteLucia.id}`, tokenAdmin).send({ estado: 'inactivo' });
  const rostrosTrasBaja = (await consultar('SELECT COUNT(*) AS n FROM rostros WHERE cliente_id = ?', [clienteLucia.id]))[0].n;
  await peticion('put', `/api/clientes/${clienteLucia.id}`, tokenAdmin).send({ estado: 'activo' });
  const trasReactivar = await peticion('get', `/api/rostros/${clienteLucia.id}`, tokenAdmin);
  // La reactivación exige capturar de nuevo (coherente con el flujo real).
  await peticion('post', '/api/rostros', tokenRecep).send({
    cliente_id: clienteLucia.id,
    descriptor: vector(0),
  });
  cond(29, 'Baja de cliente elimina su rostro; reactivar exige nueva captura (FR-022, R-27)',
    baja.status === 200 && rostrosTrasBaja === 0 && trasReactivar.body.datos.registrado === false,
    `rostros tras baja ${rostrosTrasBaja}, registrado ${trasReactivar.body.datos?.registrado}`);

  const audAdmin = await peticion('get', '/api/auditoria', tokenAdmin);
  const audRecep = await peticion('get', '/api/auditoria', tokenRecep);
  const acciones = new Set((audAdmin.body.datos ?? []).map((f) => f.accion));
  cond(30, 'Auditoría visible solo para administrador con acciones del sprint (FR-020)',
    audAdmin.status === 200 &&
      audRecep.status === 403 &&
      acciones.has('asignar_membresia') &&
      acciones.has('registrar_pago') &&
      acciones.has('acceso_autorizado') &&
      acciones.has('registrar_rostro'),
    `${acciones.size} acciones auditadas`);

  const muestras = [
    ['post', '/api/tipos-membresia', tokenRecep, { nombre: 'X', duracion_dias: 1, precio: 1 }],
    ['put', `/api/membresias/${membBeto.body.datos.id}/estado`, tokenRecep, { estado: 'cancelada' }],
    ['get', '/api/auditoria', tokenEntrena, null],
    ['get', '/api/adeudos', tokenRecep, null],
    ['post', '/api/accesos/intento', tokenEntrena, { descriptor: vector(0) }],
    ['post', '/api/usuarios', tokenRecep, { nombre: 'X', email: 'x@q.test', contraseña: 'X1234567', rol: 'cliente' }],
    ['get', '/api/usuarios', tokenEntrena, null],
    ['post', '/api/pagos', tokenCliente, { cliente_id: 1, membresia_id: 1, monto: 10 }],
  ];
  const estados = [];
  for (const [metodo, ruta, token, cuerpo] of muestras) {
    let p = peticion(metodo, ruta, token);
    if (cuerpo) p = p.send(cuerpo);
    const r = await p;
    estados.push(r.status);
  }
  cond(31, 'Permisos validados en el servidor: 403 en cada endpoint restringido (FR-016, Principio V)',
    estados.every((s) => s === 403), `estados ${estados.join(',')}`);

  // Escenario 32: vencida por fecha sin cron; vigencia inclusiva al final del día.
  const accesoHoyLimite = await intento(cercano(0)); // Lucía vence HOY (inclusive)
  const accesoVencidaPorFecha = await intento(cercano(0.1));
  cond(32, 'vencida se detecta por fecha sin cron; vigencia inclusiva hasta el final del día (FR-006, R-20)',
    accesoHoyLimite.body.datos?.resultado === 'autorizado' &&
      accesoVencidaPorFecha.body.datos?.motivo === 'membresia_vencida',
    `hoy ${accesoHoyLimite.body.datos?.resultado}, pasada ${accesoVencidaPorFecha.body.datos?.motivo}`);

  const inicio = Date.now();
  const rapido = await intento(cercano(0));
  const ms = Date.now() - inicio;
  cond(33, 'Rendimiento: identificación/rechazo en menos de 5 s desde la captura (SC-007)',
    rapido.status === 200 && ms < 5000, `${ms} ms (excluye tiempo humano de captura)`);

  // Escenario 34: el flujo completo ya se ejecutó de extremo a extremo.
  const flujoCompleto = resultados.filter((r) => r.numero <= 33).every((r) => r.ok);
  cond(34, 'Demostración: flujo completo tipo → cliente → membresía → pago → rostro → accesos (SC-001, SC-009)',
    flujoCompleto,
    'criterio humano (90% del personal sin ayuda) queda registrado como verificación manual');
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

const unicos = [...new Map(resultados.map((r) => [`${r.numero}-${r.titulo}`, r])).values()];
const numeros = [...new Set(unicos.map((r) => r.numero))];
const exitos = unicos.filter((r) => r.ok).length;
console.log('\n---------------------------------------------');
console.log(`Escenarios: ${numeros.length} | Filas OK: ${exitos}/${unicos.length} | FALLOS: ${unicos.length - exitos}`);
console.log('Nota: los escenarios de cámara (18, 21–26, 33) se ejecutaron con');
console.log('descriptores simulados, según quickstart.md (CI sin webcam).');
console.log('---------------------------------------------');

await consultar('SELECT 1'); // libera el pool antes de salir
process.exit(exitos === unicos.length ? 0 : 1);
