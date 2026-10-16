# Phase 1: Data Model — Membresías, pagos, reconocimiento facial y control de acceso (Sprint 2)

**Date**: 2026-10-12 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md) | **Actualizado**: 2026-10-14 (sincronizado con `/speckit.clarify`)

Modelo de datos del Sprint 2 según la constitución (Principio IV). Motor
InnoDB, codificación `utf8mb4`, scripts versionados en
`database/migrations/002_sprint2.sql`. Todas las consultas usan parámetros
(R-10 heredada). Eliminación física prohibida: pagos, accesos y auditoría no
tienen operaciones de borrado (FR-008, FR-015). La tabla `usuarios` del
Sprint 1 se usa sin cambios; `clientes` recibe únicamente la columna
`estado` descrita abajo (resolución de la inconsistencia detectada durante
la implementación: el spec exige distinguir clientes activos de dados de
baja, FR-003 / FR-022, y la tabla no tenía ese campo).

## Cambios en tablas existentes (migración 002)

### `clientes`

| Campo | Cambio | Origen |
|-------|--------|--------|
| `estado` | ADD ENUM('activo','inactivo') NOT NULL DEFAULT 'activo' | FR-003 (asignar solo a clientes activos), FR-022 (la baja elimina `rostros`) |

**Validaciones**: la baja no borra la ficha; al pasar a `inactivo` se
elimina la fila de `rostros` del cliente (FR-022 / R-27) y una reactivación
posterior exige una nueva captura facial.

### `tipos_membresia`

| Campo | Cambio | Origen |
|-------|--------|--------|
| `descripcion` | ADD VARCHAR(255) NULL | FR-001 |
| `estado` | ADD ENUM('activo','inactivo') NOT NULL DEFAULT 'activo' | FR-002 (inactivar sin borrar) |

Campos existentes: `id` (PK), `nombre` VARCHAR(100) NOT NULL,
`duracion_dias` INT NOT NULL (> 0), `precio` DECIMAL(10,2) NOT NULL (≥ 0).

**Validaciones**: nombre obligatorio; `duracion_dias` > 0; `precio` ≥ 0;
modificar un tipo no altera membresías ya asignadas (FR-002 — el precio se
congela en la membresía, ver abajo).

### `membresias`

| Campo | Cambio | Origen |
|-------|--------|--------|
| `precio` | ADD DECIMAL(10,2) NOT NULL DEFAULT 0; backfill desde el tipo | FR-002, FR-009 (precio congelado al asignar) |

Campos existentes: `id` (PK), `cliente_id` (FK → `clientes.id`),
`tipo_membresia_id` (FK → `tipos_membresia.id`), `fecha_inicio` DATE NOT NULL,
`fecha_vencimiento` DATE NOT NULL (> `fecha_inicio`),
`estado` ENUM('activa','vencida','suspendida','cancelada') DEFAULT 'activa'.

**Validaciones**: cliente existente y activo (FR-003); tipo en estado
`activo` para asignar; una sola membresía `activa` por cliente (FR-004 — se
valida en el servicio con SELECT previo, no hay índice único parcial en MySQL);
`fecha_vencimiento` calculada como `fecha_inicio + duracion_dias` y siempre
mayor que `fecha_inicio` (FR-003); renovar solo desde `activa` o `vencida`
(FR-005); **el cliente no debe tener adeudo pendiente para asignar o renovar
(FR-023 — se calcula con la misma fórmula de adeudo de `pagos` y se rechaza
con mensaje claro, R-26)**; **al reactivar una `suspendida` no se modifica
`fecha_vencimiento` (los días de suspensión no se recuperan, R-21)**. La baja
de un cliente no elimina su fila en `clientes`; sí elimina su fila en
`rostros` (FR-022, ver más abajo).

### `pagos`

| Campo | Cambio | Origen |
|-------|--------|--------|
| `membresia_id` | MODIFY NOT NULL | FR-007 (todo pago se relaciona con una membresía) |
| `metodo` | MODIFY NOT NULL | FR-007 (método obligatorio; único valor `efectivo`, R-18) |

Campos existentes: `id` (PK), `cliente_id` (FK → `clientes.id`), `monto`
DECIMAL(10,2) NOT NULL (> 0), `fecha_pago` DATETIME DEFAULT actual.

**Validaciones**: `monto` > 0 (FR-018); método obligatorio y **únicamente
`efectivo`** (catálogo de un solo valor en este sprint, R-18, decisión de
clarify 2026-10-14); la membresía debe pertenecer al
cliente indicado (FR-007); sin DELETE (FR-008).

**Adeudo** (no es columna, se calcula — R-19):

```sql
GREATEST(0, m.precio - COALESCE(SUM(p.monto), 0))
FROM membresias m LEFT JOIN pagos p ON p.membresia_id = m.id
```

## Tablas nuevas (migración 002)

## `rostros`

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK, autoincremento | — |
| `cliente_id` | INT UNSIGNED | NOT NULL, UNIQUE, FK → `clientes.id` | FR-011 (un rostro por cliente) |
| `descriptor_facial` | VARBINARY(512) | NOT NULL (128 float32 little-endian) | R-15 |
| `fecha_registro` | DATETIME | NOT NULL, default actual | FR-011 |
| `estado` | ENUM | NOT NULL, default `activo`: `activo`, `inactivo` | FR-011 (reemplazo) |

**Validaciones**: el cliente debe existir y estar registrado antes de asociar
información facial (FR-011); la longitud del descriptor debe ser exactamente
512 bytes (se valida en el servicio antes de guardar); el re-registro
reemplaza el descriptor de la misma fila (UPDATE, no INSERT duplicado); la
baja o inactivación del cliente **elimina esta fila** (FR-022 / R-27).

**Transiciones de estado**:

```text
(no existe) --(registro)--> activo
activo --(re-registro del cliente)--> activo (descriptor reemplazado)
activo --(baja o inactivación del cliente)--> eliminado (DELETE de la fila, FR-022)
eliminado --(reactivación del cliente + nueva captura)--> activo
```

El valor `inactivo` del ENUM queda reservado para deshabilitaciones
puntuales; la regla normal ante una baja del cliente es el borrado físico
del descriptor.

**Regla de protección (FR-017)**: `descriptor_facial` nunca se incluye en
ninguna respuesta de la API; las consultas solo exponen `cliente_id`,
`fecha_registro` y `estado`.

## `accesos`

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK, autoincremento | — |
| `cliente_id` | INT UNSIGNED | NULL, FK → `clientes.id` | R-23 (NULL = rostro no identificado) |
| `fecha` | DATE | NOT NULL, default actual | FR-015 |
| `hora` | TIME | NOT NULL, default actual | FR-015 |
| `resultado` | ENUM | NOT NULL: `autorizado`, `rechazado` | FR-015 |
| `motivo_rechazo` | VARCHAR(100) | NULL; obligatorio si `resultado='rechazado'` (validado en el servicio) | FR-014 |

**Motivos de rechazo** (catálogo cerrado — R-23):
`membresia_vencida`, `membresia_suspendida`, `membresia_cancelada`,
`sin_membresia`, `rostro_no_identificado`.

**Reglas**: todo intento se registra antes de responder (FR-015); la
identificación facial ocurre antes de consultar la membresía (FR-012); sin
operaciones de borrado.

## `auditoria`

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK, autoincremento | — |
| `usuario_id` | INT UNSIGNED | NULL, FK → `usuarios.id` (NULL = acción del sistema) | R-22 |
| `accion` | VARCHAR(50) | NOT NULL | R-22 |
| `modulo` | VARCHAR(30) | NOT NULL | R-22 |
| `fecha` | DATETIME | NOT NULL, default actual | R-22 |
| `resultado` | VARCHAR(20) | NOT NULL (`exitoso`/`rechazado`/`error`) | R-22 |
| `descripcion` | TEXT | NULL (sin datos biométricos ni sensibles) | R-22 |

**Reglas**: la consulta es exclusiva del administrador (FR-020); las acciones
críticas auditadas son: crear/modificar tipo de membresía, asignar, renovar,
suspender/cancelar/reactivar membresía, registrar pago, registrar/reemplazar
rostro, acceso autorizado y rechazado. Sin operaciones de borrado.

## Transiciones de estado de membresías (R-20, R-21)

```text
(asignación) ──────────────► activa
activa ──(fecha_vencimiento < hoy)──► vencida        (evaluada por fecha)
activa ──(admin)──► suspendida ──(admin)──► activa
activa|vencida ──(admin)──► cancelada                 (terminal)
activa|vencida ──(renovación: suma duracion_dias a
                  fecha_vencimiento)──► activa
```

`suspendida` y `cancelada` no autorizan acceso (FR-014) y no admiten
renovación (FR-005). No existe tiempo de tolerancia (R-20); la vigencia es
inclusiva hasta el final de `fecha_vencimiento`.

Reglas complementarias de las aclaraciones del 2026-10-14:

- `suspendida ──(admin)──► activa` **conserva `fecha_vencimiento` sin
  cambios**: los días de suspensión no se recuperan (R-21).
- Asignar o renovar exige que el **adeudo total del cliente esté en cero**
  (FR-023 / R-26); el pago se registra contra la membresía original para
  desbloquear la operación.

## Relaciones

```text
clientes 1 ──── 0..1 rostros       (rostros.cliente_id UNIQUE)
clientes 1 ──── N membresias       (heredada del Sprint 1)
clientes 1 ──── N accesos          (accesos.cliente_id NULL)
tipos_membresia 1 ──── N membresias (heredada)
membresias 1 ──── N pagos          (pagos.membresia_id NOT NULL)
usuarios 1 ──── N auditoria        (auditoria.usuario_id)
```

## Índices nuevos

- `rostros`: UNIQUE(`cliente_id`).
- `accesos`: INDEX(`fecha`), INDEX(`cliente_id`), INDEX(`resultado`).
- `auditoria`: INDEX(`fecha`), INDEX(`usuario_id`), INDEX(`modulo`).
- `membresias`: índice existente `idx_membresias_cliente` soporta la
  validación de "una sola activa por cliente" en el servicio.
