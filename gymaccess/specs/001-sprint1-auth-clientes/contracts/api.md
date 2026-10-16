# Contracts — API REST (Sprint 1)

**Date**: 2026-10-08 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Contrato de interfaces expuestas por el sistema. La definición definitiva de
la API era una decisión pendiente; se resuelve aquí (R-09).

## Convenciones

- Base: `/api`; recursos en plural (`/api/usuarios`, `/api/clientes`).
- Autenticación: encabezado `Authorization: Bearer <token>` (token JWT de 8 h,
  R-06). El token se obtiene en `POST /api/auth/login`.
- Envolvente de respuesta (JSON):

```json
{ "exito": true, "datos": {}, "mensaje": "" }
{ "exito": false, "error": { "codigo": "CODIGO", "mensaje": "Mensaje claro sin detalle interno" } }
```

- Códigos HTTP: `200` ok · `201` creado · `400` validación · `401` sin
  autenticación o credenciales inválidas · `403` sin permiso para el rol ·
  `404` no encontrado · `409` posible duplicado · `423` cuenta bloqueada ·
  `500` error genérico (nunca detalles internos — FR-002).
- Todos los datos de entrada se validan en el servidor antes de procesarse
  (FR-011); todas las consultas usan parámetros (FR-013).

## Matriz de permisos por rol

| Endpoint | administrador | recepcionista | entrenador | cliente |
|----------|:---:|:---:|:---:|:---:|
| `POST /api/auth/login` | ✔ | ✔ | ✔ | ✔ |
| `GET/POST /api/usuarios`, `GET/PUT /api/usuarios/:id` | ✔ | ✖ | ✖ | ✖ |
| `GET /api/clientes`, `GET /api/clientes/:id` | ✔ | ✔ | ✔ (solo nombre y contacto) | ✖ |
| `POST/PUT /api/clientes` | ✔ | ✔ | ✖ | ✖ |
| `GET /api/clientes/mio` | ✖ | ✖ | ✖ | ✔ |

Cualquier combinación fuera de la matriz responde `403` (FR-003, FR-006).

## Autenticación

### `POST /api/auth/login`

Body: `{ "email": "...", "contraseña": "..." }`

- `200` → `datos: { token, usuario: { id, nombre, email, rol } }`
- `401` → credenciales inválidas; mensaje genérico idéntico exista o no la
  cuenta (FR-002).
- `423` → `CUENTA_BLOQUEADA`: 5 fallos consecutivos acumulan bloqueo de
  15 minutos (FR-002, Q3); mensaje claro sin datos internos.
- `400` → campos faltantes.

Un inicio exitoso limpia `intentos_fallidos` y `bloqueado_hasta`.

## Usuarios (rol administrador)

### `GET /api/usuarios`

- `200` → lista `{ id, nombre, email, rol, estado }` (nunca incluye hash).

### `POST /api/usuarios`

Body: `{ "nombre", "email", "contraseña", "rol" }`

- `201` → usuario creado (hash de contraseña; FR-012).
- `400` → validación: política de contraseña (≥8, mayúscula, número — Q1),
  email con formato válido, rol de la lista.
- `409` → email ya registrado.
- `403` si el rol del solicitante no es administrador (FR-006).

### `GET /api/usuarios/:id`

- `200` → datos del usuario · `404` si no existe.

### `PUT /api/usuarios/:id`

Body parcial: `{ "nombre"?, "email"?, "rol"?, "estado"?, "contraseña"? }`

- `200` → cambios aplicados; si cambia `rol`, los permisos del usuario se
  actualizan de inmediato (US2-3).
- `400` → validación · `409` → email duplicado · `403` → no administrador.

No existe `DELETE` en este alcance (FR-014): se usa `estado: deshabilitado`.

## Clientes

### `GET /api/clientes?q=`

- Roles: administrador, recepcionista, entrenador.
- `q` filtra por nombre o contacto (US4-4). Sin coincidencias → `200` con
  lista vacía y mensaje claro (no es error).
- Entrenador recibe campos restringidos:
  `{ id, nombre_completo, telefono, correo }` (FR-009, Q2). Los demás roles
  reciben la ficha completa incluyendo `notas`.

### `GET /api/clientes/mio`

- Rol: cliente. Devuelve únicamente la ficha del cliente vinculado a su
  cuenta (FR-010, US5). Si no tiene ficha vinculada → `404` con mensaje
  claro. Esta ruta se define con precedencia sobre `/api/clientes/:id`.

### `GET /api/clientes/:id`

- Roles: administrador, recepcionista, entrenador (campos restringidos como
  en la lista). Un cliente autenticado recibe `403` (no puede ver fichas de
  terceros).

### `POST /api/clientes`

Body: `{ "nombre_completo", "telefono"?, "correo"?, "notas"?, "usuario_id"?, "confirmar_duplicado"? }`

- `201` → cliente creado.
- `400` → validación (nombre obligatorio; al menos teléfono o correo —
  data-model.md).
- `409` → `POSIBLE_DUPLICADO` con el registro que coincide (mismo nombre con
  mismo teléfono o correo). Reenviar con `"confirmar_duplicado": true`
  guarda el cliente (FR-007, Q4).
- `403` → rol sin permiso (entrenador o cliente).

### `PUT /api/clientes/:id`

Body parcial de los mismos campos.

- `200` → cambios guardados y confirmación visible (FR-015).
- `400` → validación · `403` → rol sin permiso · `404` → no existe.

No existe `DELETE` (FR-014).

## Ejemplo de intercambio (login)

```json
POST /api/auth/login
{ "email": "recepcion@gimnasio.test", "contraseña": "Clave1234" }

200
{ "exito": true,
  "datos": { "token": "eyJhbGciOi...", "usuario": { "id": 2, "nombre": "Ana Pérez",
  "email": "recepcion@gimnasio.test", "rol": "recepcionista" } } }
```

```json
POST /api/auth/login   (5º fallo consecutivo)
{ "exito": false,
  "error": { "codigo": "CUENTA_BLOQUEADA",
  "mensaje": "Cuenta bloqueada temporalmente por intentos fallidos. Intente de nuevo más tarde." } }
```
