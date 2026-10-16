# Phase 1: Data Model — Base del sistema, usuarios y clientes (Sprint 1)

**Date**: 2026-10-08 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Tablas del Sprint 1 según la constitución (Principio IV). Motor InnoDB,
codificación `utf8mb4`, scripts SQL versionados en `database/migrations/`.
Todas las consultas usan parámetros (R-10). Eliminación física: prohibida
(FR-014) — no existen operaciones de borrado en este alcance.

## `usuarios`

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT | PK, autoincremento | — |
| `nombre` | VARCHAR(100) | NOT NULL | FR-004 |
| `email` | VARCHAR(150) | NOT NULL, UNIQUE | FR-001 (identificador de acceso) |
| `contrasena_hash` | VARCHAR(255) | NOT NULL (bcrypt ≥10) | FR-012, R-05 |
| `rol` | ENUM | NOT NULL: `administrador`, `recepcionista`, `entrenador`, `cliente` | FR-003, entidad Rol |
| `estado` | ENUM | NOT NULL, default `activo`: `activo`, `deshabilitado` | FR-014/R-12 (deshabilitar reemplaza al borrado) |
| `intentos_fallidos` | TINYINT | NOT NULL, default 0 | FR-002, R-07 |
| `bloqueado_hasta` | DATETIME | NULL | FR-002, R-07 |
| `creado_en` | DATETIME | NOT NULL, default actual | auditoría básica |
| `actualizado_en` | DATETIME | NOT NULL, default actual | auditoría básica |

**Validaciones**:

- Contraseña: ≥ 8 caracteres, al menos una mayúscula y un número (Q1);
  se guarda únicamente como hash (FR-012).
- Email con formato válido y único (conflicto → rechazo con mensaje claro).
- `rol` obligatorio y de la lista permitida.

**Transiciones de estado**:

```text
activo --(5 intentos fallidos)--> bloqueado_temporal (15 min)
bloqueado_temporal --(pasa el tiempo o login exitoso)--> activo
activo --(admin lo modifica)--> deshabilitado
deshabilitado --(admin lo reactiva)--> activo
```

Nota: un usuario `deshabilitado` o con `bloqueado_hasta` en el futuro no
puede autenticarse (FR-002, caso límite del spec).

## `clientes`

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT | PK, autoincremento | — |
| `nombre_completo` | VARCHAR(150) | NOT NULL | supuesto: datos mínimos |
| `telefono` | VARCHAR(30) | al menos un contacto obligatorio | US3/US4 (teléfono) |
| `correo` | VARCHAR(150) | al menos un contacto obligatorio | US3/US4 (correo) |
| `notas` | TEXT | NULL | supuesto: notas opcionales |
| `usuario_id` | INT | NULL, FK → `usuarios.id` | US5: cliente consulta lo propio |
| `creado_en` | DATETIME | NOT NULL | auditoría básica |
| `actualizado_en` | DATETIME | NOT NULL | auditoría básica |

**Validaciones**:

- `nombre_completo` obligatorio; al menos uno de `telefono` o `correo`
  obligatorio (el entrenador ve "teléfono/correo", Q2 — al menos un medio de
  contacto debe existir para que la consulta sea útil).
- **Duplicados (FR-007, Q4)**: coincidencia de `nombre_completo` + (`telefono`
  o `correo`) con un registro existente → advertencia; solo se guarda con
  `confirmar_duplicado: true`.
- Sin eliminación física ni operaciones de borrado (FR-014).

## `tipos_membresia` (estructura inicial — sin operaciones en Sprint 1)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | INT | PK, autoincremento |
| `nombre` | VARCHAR(100) | NOT NULL |
| `duracion_dias` | INT | NOT NULL, > 0 |
| `precio` | DECIMAL(10,2) | NOT NULL, ≥ 0 |

## `membresias` (estructura inicial — sin operaciones en Sprint 1)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | INT | PK, autoincremento |
| `cliente_id` | INT | NOT NULL, FK → `clientes.id` |
| `tipo_membresia_id` | INT | NOT NULL, FK → `tipos_membresia.id` |
| `fecha_inicio` | DATE | NOT NULL |
| `fecha_vencimiento` | DATE | NOT NULL (> `fecha_inicio`) |
| `estado` | ENUM | `activa`, `vencida`, `suspendida`, `cancelada` |

## `pagos` (estructura inicial — sin operaciones en Sprint 1)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | INT | PK, autoincremento |
| `cliente_id` | INT | NOT NULL, FK → `clientes.id` |
| `membresia_id` | INT | NULL, FK → `membresias.id` |
| `monto` | DECIMAL(10,2) | NOT NULL, > 0 |
| `fecha_pago` | DATETIME | NOT NULL |
| `metodo` | VARCHAR(30) | NULL (se define en Sprint 2) |

## Relaciones

```text
usuarios 1 ──── 0..1 clientes        (clientes.usuario_id, rol "cliente")
tipos_membresia 1 ──── N membresias  (membresias.tipo_membresia_id)
clientes 1 ──── N membresias
clientes 1 ──── N pagos
membresias 1 ──── N pagos
```

## Índices

- `usuarios`: UNIQUE(`email`).
- `clientes`: INDEX(`nombre_completo`), INDEX(`telefono`), INDEX(`correo`)
  — soportan la detección de duplicados (R-08) y la búsqueda por nombre o
  contacto del escenario US4-4.

## Entidades futuras (Sprint 2 — fuera de este alcance)

`rostros`, `accesos`, `auditoria`. En este sprint solo se garantiza que
`clientes` pueda relacionarse con datos faciales futuros (FR-018); no se
crea la tabla `rostros` todavía.
