# Contracts — API REST (Sprint 3)

**Date**: 2026-10-15 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Contrato de interfaces expuestas por el sistema en el Sprint 3. Hereda las
convenciones y la matriz de permisos de los sprints anteriores
(`specs/001-sprint1-auth-clientes/contracts/api.md` y
`specs/002-sprint2-membresias-pagos-acceso-facial/contracts/api.md`) y las
amplía con entrenadores, asignaciones, rutinas, objetivos, progresos y
dashboard.

## Convenciones

- Base: `/api`; recursos en plural (`/api/entrenadores`, `/api/rutinas`).
- Autenticación: encabezado `Authorization: Bearer <token>` (JWT de 8 h). El
  token se obtiene en `POST /api/auth/login`.
- Envolvente de respuesta (JSON) heredada del Sprint 1:

```json
{ "exito": true, "datos": {}, "mensaje": "" }
{ "exito": false, "error": { "codigo": "CODIGO", "mensaje": "Mensaje claro sin detalle interno" } }
```

- Códigos HTTP: `200` ok · `201` creado · `400` validación · `401` sin
  autenticación · `403` sin permiso para el rol o fuera de la carga · `404` no
  encontrado · `409` conflicto con una regla de negocio · `500` error genérico
  (nunca detalles internos).
- Todos los datos de entrada se validan en el servidor (FR-016/FR-022) y todas
  las consultas usan parámetros.
- **Doble capa de autorización** (R-34): primero la matriz de permisos por rol
  (`MATRIZ_PERMISOS` en el servidor), después la verificación de pertenencia —
  un entrenador solo opera recursos de los clientes de su carga (`403
  FUERA_DE_CARGA`) y el cliente solo alcanza sus propios recursos. Ocultar
  opciones en la interfaz no es seguridad (FR-021, Principio V).
- **No existe `DELETE` en ningún endpoint de este sprint**: los entrenadores se
  inactivan, las asignaciones se cierran, las rutinas se archivan y los
  objetivos/progresos solo se modifican (FR-010, FR-025).
- Los endpoints `/mio` y `/mios` tienen precedencia sobre las rutas con `:id`
  y resuelven el identificador del cliente o del entrenador desde la sesión
  autenticada, nunca desde parámetros manipulables (patrón heredado).

## Códigos de error nuevos del Sprint 3

| Código | HTTP | Significado |
|--------|:----:|-------------|
| `ENTRENADOR_NO_VALIDO` | 409 | El usuario indicado no existe con rol `entrenador` activo, o el entrenador está inactivo (FR-002) |
| `USUARIO_YA_ENTRENADOR` | 409 | El usuario ya tiene un perfil de entrenador vinculado (unicidad de R-28) |
| `CLIENTE_SIN_ENTRENADOR` | 409 | La operación exige que el cliente tenga entrenador responsable vigente (ej. crear una rutina, FR-008) |
| `FUERA_DE_CARGA` | 403 | El cliente o el recurso no pertenece a la carga del entrenador autenticado (FR-008, HU3) |

Se reutilizan los códigos heredados `VALIDACION` (400), `CLIENTE_NO_ACTIVO`
(409), `ESTADO_NO_PERMITE` (409), `SIN_PERMISO` (403) y `NO_AUTENTICADO`
(401).

## Matriz de permisos por rol (ampliación del Sprint 3)

| Endpoint | administrador | recepcionista | entrenador | cliente |
|----------|:---:|:---:|:---:|:---:|
| `GET /api/entrenadores`, `GET /api/entrenadores/:id` | ✔ | ✔ (lectura y carga) | ✖ | ✖ |
| `POST/PUT /api/entrenadores` | ✔ | ✖ | ✖ | ✖ |
| `GET /api/entrenadores/mio/clientes` | ✖ | ✖ | ✔ (solo su carga) | ✖ |
| `POST /api/asignaciones` | ✔ | ✔ | ✖ | ✖ |
| `GET /api/asignaciones` | ✔ | ✔ | ✖ | ✖ |
| `PUT /api/asignaciones/:id/cerrar` | ✔ | ✔ | ✖ | ✖ |
| `POST /api/rutinas` | ✔ (en nombre del responsable) | ✖ | ✔ (solo su carga) | ✖ |
| `GET /api/rutinas`, `GET /api/rutinas/:id` | ✔ | ✔ (solo lectura) | ✔ (solo su carga) | ✖ |
| `PUT /api/rutinas/:id`, `PUT /api/rutinas/:id/estado` | ✔ | ✖ | ✔ (solo su carga) | ✖ |
| `POST/GET /api/objetivos`, `PUT /api/objetivos/:id` | ✔ | ✖ | ✔ (solo su carga) | ✖ |
| `POST/GET /api/progresos`, `PUT /api/progresos/:id` | ✔ | ✖ | ✔ (solo su carga) | ✖ |
| `GET /api/clientes/mio/rutina`, `GET /api/clientes/mio/progreso` | ✖ | ✖ | ✖ | ✔ |
| `GET /api/dashboard` | ✔ | ✖ | ✖ | ✖ |
| `GET /api/dashboard/mio` | ✖ | ✖ | ✔ | ✖ |

Notas:

- El entrenador nunca recibe importes ni datos financieros (Principio VI): su
  carga y su panel muestran estados, fechas e indicadores de seguimiento, sin
  ingresos, pagos ni precios.
- El recepcionista **consulta las rutinas en solo lectura** (clarify
  2026-10-15, respuesta C) pero no accede a objetivos ni progresos (respuesta
  Q4/Q5): no figura en esas filas, por lo que la API responde `403`.
- El cliente permanece en modo solo lectura sobre lo suyo (clarify Q4): no
  registra objetivos ni progresos propios.
- El dashboard completo es exclusivo del administrador y el entrenador solo
  obtiene su panel reducido (clarify Q1); recepcionista y cliente no tienen
  endpoint de dashboard (`403`).

## Entrenadores

### `GET /api/entrenadores?estado=`

- `200` → lista `{ id, nombre, telefono, especialidad, estado, usuario: { id,
  email, rol }, clientes_asignados }` (`clientes_asignados` cuenta las
  asignaciones con `estado = activa` — HU7).
- `403` → rol distinto de administrador o recepcionista.

### `POST /api/entrenadores`

Body: `{ "usuario_id", "nombre", "telefono"?, "especialidad"? }`

- `201` → perfil creado con `estado: "activo"`.
- `400` → validación: `usuario_id` y `nombre` obligatorios.
- `404` → el usuario no existe.
- `409 ENTRENADOR_NO_VALIDO` → el usuario no tiene rol `entrenador` o está
  deshabilitado (FR-002).
- `409 USUARIO_YA_ENTRENADOR` → el usuario ya tiene perfil de entrenador
  (R-28).
- `403` → rol distinto de administrador (HU1 esc.4).

### `GET /api/entrenadores/:id`

- `200` → ficha del entrenador con su usuario y la lista de clientes vigentes
  (HU7).
- `404` → no existe.

### `PUT /api/entrenadores/:id`

Body parcial de `{ nombre, telefono, especialidad, estado }`.

- `200` → cambios guardados. Poner `estado: "inactivo"` retira al entrenador
  **sin borrar** asignaciones ni rutinas (FR-025); sus asignaciones vigentes
  se cierran manualmente desde `/api/asignaciones` y no admite nuevas
  asignaciones ni rutinas.
- `400` · `403` · `404`. No existe `DELETE`.

### `GET /api/entrenadores/mio/clientes`

- `200` → carga del entrenador autenticado: lista `{ id, nombre_completo,
  correo, telefono, estado, membresia: { estado, fecha_vencimiento } }` —
  estados y fechas, sin importes (Principio VI). Con carga vacía, lista `[]`.
- `403` → cualquier rol distinto de entrenador.

## Asignaciones

### `POST /api/asignaciones`

Body: `{ "cliente_id", "entrenador_id" }`

- `201` → `{ id, cliente_id, entrenador_id, fecha_inicio: "hoy", fecha_fin:
  null, estado: "activa" }`. Si el cliente ya tenía entrenador vigente, la
  asignación anterior se **cierra automáticamente** con su `fecha_fin` y el
  historial se conserva (FR-005, clarify Q2).
- `400` → validación de identificadores.
- `404` → el cliente o el entrenador no existen.
- `409 CLIENTE_NO_ACTIVO` → el cliente está inactivo (FR-004).
- `409 ENTRENADOR_NO_VALIDO` → el entrenador no existe o está inactivo.
- `403` → rol distinto de administrador o recepcionista (HU2 esc.6).

### `GET /api/asignaciones?cliente_id=&entrenador_id=&estado=`

- `200` → lista con `fecha_inicio`, `fecha_fin` y `estado` de cada vigencia
  (por defecto, todas para conservar el historial; `?estado=activa` filtra la
  vigente).
- `403` → rol no autorizado.

### `PUT /api/asignaciones/:id/cerrar`

- `200` → la asignación queda con `fecha_fin: "hoy"` y `estado: "cerrada"`
  (baja del entrenador, reorganización — caso límite del spec).
- `409 ESTADO_NO_PERMITE` → ya estaba cerrada.
- `403` · `404`. No existe `DELETE`: las vigencias se conservan (SC-008).

## Rutinas

### `POST /api/rutinas`

Body: `{ "cliente_id", "nombre", "ejercicios": [ { "nombre", "series"?,
"repeticiones"?, "instrucciones"? } ] }`

- `201` → rutina con `estado: "activa"`, `entrenador_id` derivado del
  responsable vigente del cliente y sus ejercicios numerados por `orden`. La
  rutina activa anterior del cliente pasa a `archivada` en la misma operación
  (FR-010, clarify Q3).
- `400 VALIDACION` → falta `nombre`, `ejercicios` está vacío o un ejercicio
  no tiene nombre o datos válidos (series/repeticiones > 0 o instrucciones) —
  FR-009.
- `403 FUERA_DE_CARGA` → el cliente está asignado a otro entrenador y quien
  opera es un entrenador distinto (HU3 esc.3, SC-004).
- `404` → el cliente no existe.
- `409 CLIENTE_SIN_ENTRENADOR` → el cliente no tiene entrenador responsable
  vigente (HU3 esc.2).
- `403` → recepcionista o cliente (HU3 esc.6).

### `GET /api/rutinas?cliente_id=&entrenador_id=&estado=`

- `200` → lista de rutinas con su estado. El entrenador recibe **solo las de
  su carga** (si filtra por un cliente ajeno: `403 FUERA_DE_CARGA`); el
  recepcionista las consulta en modo solo lectura; el administrador, todas.
- `403` → cliente o rol sin permiso.

### `GET /api/rutinas/:id`

- `200` → rutina con sus ejercicios ordenados (`{ rutina: {...}, ejercicios:
  [...] }`).
- `403 FUERA_DE_CARGA` · `404`.

### `PUT /api/rutinas/:id`

Body: `{ "nombre"?, "ejercicios": [ … ] }` (parcial; si se envía
`ejercicios`, se reemplaza la lista completa de forma atómica).

- `200` → cambios guardados (HU3 esc.5).
- `400` → validación de ejercicios.
- `403` → recepcionista (solo lectura) o entrenador fuera de carga.
- `404`.

### `PUT /api/rutinas/:id/estado`

Body: `{ "estado": "activa" | "archivada" }`

- `200` → cambio aplicado. Al pasar a `activa` se archiva la rutina vigente
  del cliente (misma regla) y se exige al menos un ejercicio; al archivar,
  la rutina queda como historial.
- `400 VALIDACION` → se intenta activar una rutina sin ejercicios (FR-009).
- `403` · `404` · `409 ESTADO_NO_PERMITE`. No existe `DELETE`.

## Objetivos de entrenamiento

### `POST /api/objetivos`

Body: `{ "cliente_id", "descripcion", "meta"?, "fecha_limite"? }`

- `201` → objetivo con `estado: "en curso"`.
- `400` → `descripcion` obligatoria o fecha ilegible (FR-022).
- `403 FUERA_DE_CARGA` → el cliente no está en la carga del entrenador.
- `404` → el cliente no existe.
- `403` → recepcionista o cliente (nunca editan seguimiento).

### `GET /api/objetivos?cliente_id=&estado=`

- `200` → lista de objetivos con `en curso` / `cumplido`.
- `403` → rol sin permiso (el recepcionista no accede, clarify Q5).

### `PUT /api/objetivos/:id`

Body parcial de `{ descripcion, meta, fecha_limite, estado }`.

- `200` → cambios guardados; **los progresos ya registrados no se alteran ni
  desaparecen** (FR-013).
- `400` · `403` (incluido `FUERA_DE_CARGA`) · `404`. No existe `DELETE`.

## Progresos del cliente

### `POST /api/progresos`

Body: `{ "cliente_id", "objetivo_id"?, "fecha", "peso"?, "medidas"?,
"marca"?, "comentario"? }`

- `201` → progreso registrado en el historial.
- `400 VALIDACION` → fecha ilegible o **sin ningún dato de medición** (HU4
  esc.6): exige al menos `peso`, `medidas`, `marca` o `comentario`.
- `403 FUERA_DE_CARGA` → el cliente no está en la carga del entrenador.
- `404` → el cliente o el `objetivo_id` no existen.
- `403` → recepcionista o cliente: el cliente nunca escribe progresos
  (clarify Q4).

### `GET /api/progresos?cliente_id=&objetivo_id=&desde=&hasta=`

- `200` → historial ordenado por `fecha` ascendente (HU4 esc.4).
- `403` → rol sin permiso.

### `PUT /api/progresos/:id`

Body parcial de los mismos campos.

- `200` → modificación aplicada y auditada (el insumo permite crear, consultar
  y modificar; **nunca eliminar** — FR-012/FR-025).
- `400` · `403` (incluido `FUERA_DE_CARGA`) · `404`.

## Consultas propias del cliente

### `GET /api/clientes/mio/rutina`

- `200` → `{ "rutina": { id, nombre, estado, entrenador, ejercicios: [...] } }`
  con la rutina **activa** del cliente autenticado; si solo tiene archivadas o
  ninguna: `{ "rutina": null, "mensaje": "Aún no tiene una rutina activa
  asignada." }` — mensaje claro, sin error técnico (FR-015, HU5 esc.3).
- `403` → cualquier rol distinto de cliente.

### `GET /api/clientes/mio/progreso`

- `200` → `{ "objetivos": [ ... ], "progresos": [ ... ] }` con **solo** los
  objetivos y progresos del cliente autenticado, en orden de fecha (HU5
  esc.2). Un cliente no puede obtener datos de terceros (HU5 esc.4,
  FR-014/SC-005).
- `403` → rol distinto de cliente.

## Dashboard

### `GET /api/dashboard?periodo=mes|30d|historico`

- `200` → `{ "periodo": "mes", "indicadores": { "clientes_total",
  "clientes_activos", "membresias_activas", "membresias_vencidas",
  "ingresos_periodo", "pagos_periodo", "accesos_autorizados",
  "accesos_rechazados", "entrenadores_activos", "clientes_con_entrenador",
  "rutinas_activas", "objetivos_en_curso", "objetivos_cumplidos",
  "progresos_recientes" } }`. `periodo` por defecto `mes` (mes en curso);
  `30d` últimos 30 días; `historico` desde el inicio (FR-016/FR-017).
- `400` → `periodo` no reconocido.
- `403` → cualquier rol distinto de administrador (FR-018, HU6 esc.3).
- Los indicadores son cifras y resúmenes agregados, sin nombres ni datos
  sensibles de clientes (FR-019).

### `GET /api/dashboard/mio?periodo=mes|30d|historico`

- `200` → `{ "periodo": "mes", "indicadores": { "clientes_carga",
  "rutinas_activas", "objetivos_en_curso", "objetivos_cumplidos",
  "progresos_recientes" } }` — **solo la carga del entrenador autenticado y
  sin cifras financieras** (clarify Q1, respuesta B; HU6 esc.6).
- `403` → cualquier rol distinto de entrenador.

## Auditoría

### `GET /api/auditoria?fecha=&modulo=`

- `200` → heredado del Sprint 2; en este sprint admite los nuevos valores de
  `modulo`: `entrenadores`, `asignaciones`, `rutinas`, `objetivos` y
  `progresos`. Se registran: alta y modificación de entrenadores, creación y
  cierre de asignaciones, creación y modificación de rutinas y registro de
  objetivos y progresos (FR-023, SC-009).
- `403` → solo administrador.

## Ejemplo de intercambio (creación de una rutina)

```json
POST /api/rutinas
Authorization: Bearer <token>

{
  "cliente_id": 12,
  "nombre": "Fuerza tren superior - semana 1",
  "ejercicios": [
    { "nombre": "Press de banca", "series": 4, "repeticiones": 8 },
    { "nombre": "Remo con barra", "series": 3, "repeticiones": 10 },
    { "nombre": "Plancha", "instrucciones": "3 series de 45 segundos con respiración estable" }
  ]
}
```

```json
201
{
  "exito": true,
  "mensaje": "Rutina creada y activada. La rutina anterior pasó a archivada.",
  "datos": {
    "id": 5,
    "cliente_id": 12,
    "entrenador_id": 2,
    "nombre": "Fuerza tren superior - semana 1",
    "estado": "activa",
    "ejercicios": [
      { "id": 11, "nombre": "Press de banca", "series": 4, "repeticiones": 8, "orden": 1 },
      { "id": 12, "nombre": "Remo con barra", "series": 3, "repeticiones": 10, "orden": 2 },
      { "id": 13, "nombre": "Plancha", "instrucciones": "3 series de 45 segundos con respiración estable", "orden": 3 }
    ]
  }
}
```

Rechazo típico (cliente de otra carga):

```json
403
{
  "exito": false,
  "error": { "codigo": "FUERA_DE_CARGA", "mensaje": "Este cliente no está en su carga de entrenamiento." }
}
```
