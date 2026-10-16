# Contracts — API REST (Sprint 2)

**Date**: 2026-10-14 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Contrato de interfaces expuestas por el sistema en el Sprint 2. Hereda las
convenciones y la matriz de permisos del Sprint 1
(`specs/001-sprint1-auth-clientes/contracts/api.md`) y las amplía con
membresías, pagos, rostros, accesos y auditoría.

## Convenciones

- Base: `/api`; recursos en plural (`/api/membresias`, `/api/pagos`).
- Autenticación: encabezado `Authorization: Bearer <token>` (JWT de 8 h). El
  token se obtiene en `POST /api/auth/login`.
- Envolvente de respuesta (JSON) heredada del Sprint 1:

```json
{ "exito": true, "datos": {}, "mensaje": "" }
{ "exito": false, "error": { "codigo": "CODIGO", "mensaje": "Mensaje claro sin detalle interno" } }
```

- Códigos HTTP: `200` ok · `201` creado · `400` validación · `401` sin
  autenticación · `403` sin permiso para el rol · `404` no encontrado ·
  `409` conflicto con una regla de negocio · `500` error genérico (nunca
  detalles internos).
- Todos los datos de entrada se validan en el servidor (FR-018) y todas las
  consultas usan parámetros.
- **Ninguna respuesta incluye `descriptor_facial` ni cualquier otro dato
  biométrico** (FR-017). Los endpoints de rostro solo devuelven metadatos.
- Los permisos se validan siempre en el backend: cualquier combinación fuera
  de la matriz responde `403` (FR-016).

## Códigos de error nuevos del Sprint 2

| Código | HTTP | Significado |
|--------|:----:|-------------|
| `VALIDACION` | 400 | Dato inválido o faltante (se indica cuál) |
| `MEMBRESIA_ACTIVA_EXISTENTE` | 409 | El cliente ya tiene una membresía activa (FR-004) |
| `ADEUDO_PENDIENTE` | 409 | El cliente tiene adeudo por saldar antes de asignar o renovar (FR-023) |
| `ESTADO_NO_PERMITE` | 409 | La operación no está permitida en el estado actual (ej. renovar una suspendida, FR-005) |
| `CLIENTE_NO_ACTIVO` | 409 | La operación exige un cliente en estado activo (FR-003) |
| `MEMBRESIA_REQUERIDA` | 400 | El pago no indica una membresía existente (FR-007) |
| `DESCRIPTOR_INVALIDO` | 400 | El descriptor facial no tiene 128 valores numéricos (R-15) |
| `ROSTRO_NO_ENCONTRADO` | 404 | El cliente no tiene información facial registrada (FR-011) |

## Matriz de permisos por rol (ampliación del Sprint 2)

| Endpoint | administrador | recepcionista | entrenador | cliente |
|----------|:---:|:---:|:---:|:---:|
| `GET /api/tipos-membresia` | ✔ | ✔ (solo lectura) | ✖ | ✖ |
| `POST/PUT /api/tipos-membresia` | ✔ | ✖ | ✖ | ✖ |
| `POST /api/membresias` | ✔ | ✔ | ✖ | ✖ |
| `GET /api/membresias` | ✔ | ✔ | ✔ (sin precios) | ✖ |
| `POST /api/membresias/:id/renovar` | ✔ | ✔ | ✖ | ✖ |
| `PUT /api/membresias/:id/estado` | ✔ | ✖ | ✖ | ✖ |
| `GET /api/clientes/mio/membresia` | ✖ | ✖ | ✖ | ✔ |
| `POST/GET /api/pagos`, `GET /api/adeudos` | ✔ | ✔ (alta y consulta de pagos) | ✖ | ✖ |
| `GET /api/pagos/mios`, `GET /api/adeudos/mios` | ✖ | ✖ | ✖ | ✔ |
| `POST/GET /api/rostros` | ✔ | ✔ | ✖ | ✖ |
| `POST /api/accesos/intento` | ✔ | ✔ | ✖ | ✖ |
| `GET /api/accesos` | ✔ | ✔ | ✔ (solo fechas, hora, resultado y cliente) | ✖ |
| `GET /api/accesos/mios` | ✖ | ✖ | ✖ | ✔ |
| `GET /api/auditoria` | ✔ | ✖ | ✖ | ✖ |

Notas:

- La lectura de tipos de membresía se comparte con recepcionista porque es
  requisito previo de HU2 (asignar una membresía); **crear y modificar tipos
  sigue siendo exclusivo del administrador** (FR-016).
- El entrenador nunca recibe importes ni datos financieros (Principio VI).
- Los endpoints `/mios`, `/mio` se definen con precedencia sobre las rutas con
  `:id`, igual que `GET /api/clientes/mio` en el Sprint 1.

## Tipos de membresía

### `GET /api/tipos-membresia`

- `200` → lista `{ id, nombre, descripcion, duracion_dias, precio, estado }`.
- Filtro opcional `?estado=activo` (lo usa el formulario de asignación).

### `POST /api/tipos-membresia`

Body: `{ "nombre", "descripcion"?, "duracion_dias", "precio" }`

- `201` → tipo creado.
- `400` → validación: nombre obligatorio, `duracion_dias > 0`, `precio >= 0`.
- `403` → rol distinto de administrador.

### `PUT /api/tipos-membresia/:id`

Body parcial de los mismos campos.

- `200` → cambios guardados; las membresías ya asignadas conservan sus fechas
  y su precio congelado (FR-002).
- `400` · `403` · `404` si no existe.
- No existe `DELETE`: se usa `estado: inactivo` (FR-002).

## Membresías

### `POST /api/membresias`

Body: `{ "cliente_id", "tipo_membresia_id", "fecha_inicio" }`

- `201` → `{ id, cliente_id, tipo_membresia_id, fecha_inicio,
  fecha_vencimiento, estado: "activa", precio }`. `fecha_vencimiento` se
  calcula como `fecha_inicio + duracion_dias` (FR-003).
- `400` → validación de fechas o identificadores.
- `404` → el cliente o el tipo no existen.
- `409 CLIENTE_NO_ACTIVO` → el cliente está inactivo.
- `409 MEMBRESIA_ACTIVA_EXISTENTE` → ya tiene una membresía activa (FR-004).
- `409 ADEUDO_PENDIENTE` → adeudo total del cliente mayor que cero (FR-023).
- `403` → recepcionista/administrador únicamente.

### `GET /api/membresias?cliente_id=&estado=`

- `200` → lista con `{ id, cliente, tipo, fecha_inicio, fecha_vencimiento,
  estado, precio, saldo_pendiente }`.
- Entrenador recibe la versión sin `precio` ni `saldo_pendiente`.
- `404` solo si se pidió un `cliente_id` inexistente; sin coincidencias la
  lista viene vacía con mensaje claro (no es error).

### `GET /api/membresias/:id`

- `200` → ficha completa con `saldo_pendiente` calculado (FR-009) ·
  `404` si no existe · `403` para cliente y entrenador.

### `POST /api/membresias/:id/renovar`

Body: `{}` (la nueva fecha se deriva del tipo)

- `200` → `{ id, fecha_vencimiento: "<nueva>", estado: "activa" }`: se suman
  `duracion_dias` a la `fecha_vencimiento` vigente (FR-005).
- `409 ESTADO_NO_PERMITE` → la membresía está suspendida o cancelada (FR-005).
- `409 ADEUDO_PENDIENTE` → hay adeudo pendiente en la membresía (FR-023).
- `403` → rol sin permiso.

### `PUT /api/membresias/:id/estado`

Body: `{ "estado": "suspendida" | "cancelada" | "activa" }`

- `200` → estado actualizado con confirmación visible.
- `403` → **solo administrador** (FR-016): recepcionista no gestiona estados.
- `409 ESTADO_NO_PERMITE` → transiciones inválidas (cancelar es terminal;
  reactivar solo desde `suspendida`).
- Al reactivar (`suspendida → activa`) **no se modifica
  `fecha_vencimiento`** (los días de suspensión no se recuperan, R-21).

### `GET /api/clientes/mio/membresia`

- Rol: cliente. Devuelve `{ tipo, descripcion, fecha_inicio,
  fecha_vencimiento, estado }` de su única membresía vigente o más reciente
  (FR-024). `404` si nunca ha tenido membresía. Solo lectura.

## Pagos

### `POST /api/pagos`

Body: `{ "cliente_id", "membresia_id", "monto", "fecha_pago"? }`

- El backend fija `metodo = "efectivo"` (único método del catálogo, R-18 /
  clarify 2026-10-14). Si el body incluye `metodo` distinto de `efectivo`,
  responde `400 VALIDACION`.
- `201` → pago registrado en el historial (FR-007).
- `400` → `monto <= 0` o método no permitido.
- `400 MEMBRESIA_REQUERIDA` → la membresía no existe o no pertenece al
  cliente indicado (FR-007).
- `403` → rol sin permiso.
- No existe `DELETE` ni `PUT` de pagos (FR-008): el historial es inmutable de
  forma ordinaria.

### `GET /api/pagos?cliente_id=&desde=&hasta=`

- Rol: administrador (histórico completo) y recepcionista (consulta
  operativa). `200` → lista `{ id, cliente, membresia, monto, fecha_pago,
  metodo }`.

### `GET /api/pagos/mios`

- Rol: cliente. Devuelve únicamente sus propios pagos (FR-010).

### `GET /api/adeudos`

- Rol: administrador. `200` → lista `{ cliente_id, cliente, membresia_id,
  precio, pagado, saldo_pendiente }` solo con saldos mayores que cero
  (FR-009, FR-010).

### `GET /api/adeudos/mios`

- Rol: cliente. Sus propios saldos pendientes, nunca los de terceros.

## Rostros (información facial)

### `POST /api/rostros`

Body: `{ "cliente_id", "descriptor": [0.012, -0.045, ...] }` (128 números)

- `201` → información facial registrada; si ya existía, se reemplaza en la
  misma fila (FR-011). Devuelve `{ cliente_id, fecha_registro, estado }`
  **sin el descriptor**.
- `400 DESCRIPTOR_INVALIDO` → no son exactamente 128 valores numéricos.
- `404` → el cliente no está registrado (FR-011).
- `409 CLIENTE_NO_ACTIVO` → el cliente está dado de baja; reactívelo antes
  de capturar su rostro (coherente con FR-022: la baja elimina el rostro).
- `403` → solo administrador o recepcionista (FR-016).
- Auditoría: registra `registrar_rostro` o `reemplazar_rostro` (R-22).

### `GET /api/rostros/:cliente_id`

- `200` → `{ cliente_id, registrado: true, fecha_registro }`; si no tiene
  información facial → `registrado: false` (no es error, evita `404` en la
  ficha del cliente).
- `403` → cliente autenticado no puede consultar rostros de terceros.
- El descriptor jamás aparece en la respuesta (FR-017).

### Efecto de la baja de cliente

`PUT /api/clientes/:id` con `estado: inactivo` (o baja del cliente) elimina
la fila de `rostros` correspondiente (FR-022 / R-27); una reactivación
posterior exige una nueva captura antes de volver a identificarlo.

## Accesos (control de acceso)

### `POST /api/accesos/intento`

Body: `{ "descriptor": [ ... ] | null }` — lo llama la terminal de acceso
(`AccesoPage`) con el descriptor calculado en el navegador; `descriptor: null`
simula la cámara no disponible o captura fallida.

- `200` → **siempre que el intento pudo registrarse** (FR-015), con la
  estructura:

```json
{
  "exito": true,
  "datos": {
    "acceso_id": 128,
    "resultado": "autorizado",
    "motivo": null,
    "cliente": { "id": 42, "nombre": "Lucía Torres" },
    "membresia": { "estado": "activa", "fecha_vencimiento": "2026-11-30" }
  },
  "mensaje": "Acceso autorizado"
}
```

  - `resultado: "rechazado"` → `motivo` con uno de los valores cerrados de
    R-23: `membresia_vencida`, `membresia_suspendida`,
    `membresia_cancelada`, `sin_membresia`, `rostro_no_identificado`.
  - Si `resultado` es `rechazado` por `rostro_no_identificado`, `cliente` y
    `membresia` vienen `null` y la respuesta no revela información de
    terceros (HU6-5).
- `400` → cuerpo ausente (el intento no pudo procesarse).
- `403` → rol sin permiso (el endpoint es solo administrador/recepcionista).
- **Orden obligatorio**: identificar el rostro primero y validar la membresía
  después (FR-012); la coincidencia facial sola nunca autoriza (FR-013).
- El registro del intento se realiza **antes** de responder (FR-015); no hay
  endpoint de borrado.

### `GET /api/accesos?fecha=&resultado=&cliente_id=`

- Administrador y recepcionista: `{ id, fecha, hora, resultado,
  motivo_rechazo, cliente: { id, nombre } }`.
- Entrenador: mismos campos sin identificadores financieros (no aplica) —
  consulta de asistencia (HU8-2).
- Sin coincidencias → `200` con lista vacía y mensaje claro (HU8-4).

### `GET /api/accesos/mios`

- Rol: cliente. Únicamente sus propios registros (HU8-3).

## Auditoría

### `GET /api/auditoria?fecha=&modulo=`

- **Solo administrador** (FR-020). `200` → `{ id, usuario, accion, modulo,
  fecha, resultado, descripcion }`; `403` para el resto de los roles.
- La escritura no expone endpoint: la realiza el backend en las acciones
  críticas (R-22).

## Ejemplo de intercambio (intento de acceso autorizado)

```json
POST /api/accesos/intento
Authorization: Bearer eyJhbGciOi...
{ "descriptor": [0.013, -0.041, 0.087, "... 128 valores ..."] }

200
{ "exito": true,
  "datos": { "acceso_id": 128, "resultado": "autorizado", "motivo": null,
             "cliente": { "id": 42, "nombre": "Lucía Torres" },
             "membresia": { "estado": "activa", "fecha_vencimiento": "2026-11-30" } },
  "mensaje": "Acceso autorizado" }
```

```json
POST /api/accesos/intento
{ "descriptor": null }

200
{ "exito": true,
  "datos": { "acceso_id": 129, "resultado": "rechazado",
             "motivo": "rostro_no_identificado",
             "cliente": null, "membresia": null },
  "mensaje": "No fue posible identificar al cliente" }
```

```json
POST /api/membresias
{ "cliente_id": 42, "tipo_membresia_id": 2, "fecha_inicio": "2026-10-14" }

409
{ "exito": false,
  "error": { "codigo": "ADEUDO_PENDIENTE",
             "mensaje": "El cliente tiene un adeudo pendiente. Debe saldarse antes de asignar una membresía." } }
```
