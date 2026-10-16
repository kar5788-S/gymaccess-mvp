# Phase 1: Data Model — Entrenadores, rutinas de entrenamiento y dashboard administrativo (Sprint 3)

**Date**: 2026-10-15 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Modelo de datos del Sprint 3 según la constitución (Principio IV). Motor
InnoDB, codificación `utf8mb4`, script versionado en
`database/migrations/003_sprint3.sql` (R-36). Todas las consultas usan
parámetros (R-10 heredada). **Sin operaciones de borrado**: entrenadores,
asignaciones, rutinas, ejercicios, objetivos y progresos solo cambian de
estado o se actualizan; el historial se conserva íntegro (FR-010, FR-025).

## Cambios en tablas existentes (migración 003)

**Ninguno.** Las tablas heredadas se usan tal cual:

- `usuarios` — se consulta para validar `rol = 'entrenador'` y `estado` en el
  alta de perfiles (FR-001/FR-002) y para la auditoría.
- `clientes` — FK de asignaciones, rutinas, objetivos y progresos; su
  `estado` (Sprint 2) gobierna si admite asignación (FR-004).
- `membresias` y `accesos` — solo se leen para los indicadores del dashboard
  (FR-016); no se modifican.
- `auditoria` — se reutiliza con los nuevos valores de `modulo` (R-35), sin
  cambios de esquema.

## Tablas nuevas (migración 003)

## `entrenadores`

Perfil profesional del personal de coaching (R-28).

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK AUTO_INCREMENT | — |
| `usuario_id` | INT UNSIGNED | NOT NULL, UNIQUE, FK → `usuarios.id` (RESTRICT) | FR-001, insumo §6 |
| `nombre` | VARCHAR(100) | NOT NULL | HU1 |
| `telefono` | VARCHAR(30) | NULL | HU1 |
| `especialidad` | VARCHAR(120) | NULL | HU1 |
| `estado` | ENUM('activo','inactivo') | NOT NULL DEFAULT 'activo' | FR-025 (retiro sin borrado) |
| `creado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |
| `actualizado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |

**Validaciones**: el usuario debe existir, tener `rol = 'entrenador'` y
`estado = 'activo'` (`409 ENTRENADOR_NO_VALIDO`, FR-002); no puede haber dos
perfiles para el mismo usuario (UNIQUE + SELECT en la transacción del alta,
`409 USUARIO_YA_ENTRENADOR`); `nombre` obligatorio. **Sin DELETE**: la baja
pasa `estado` a `inactivo` (FR-025) — no elimina asignaciones ni rutinas, que
quedan como historial; las asignaciones vigentes se cierran manualmente
(caso límite del spec). Un entrenador inactivo no admite nuevas asignaciones
ni rutinas.

## `asignaciones_entrenador`

Responsabilidad de seguimiento entre un entrenador y un cliente, con historial
de vigencias (R-29; clarify 2026-10-15 Q2).

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK AUTO_INCREMENT | — |
| `cliente_id` | INT UNSIGNED | NOT NULL, FK → `clientes.id` (RESTRICT) | FR-004 |
| `entrenador_id` | INT UNSIGNED | NOT NULL, FK → `entrenadores.id` (RESTRICT) | FR-004 |
| `fecha_inicio` | DATE | NOT NULL | HU2 |
| `fecha_fin` | DATE | NULL | FR-005 (cierre) |
| `estado` | ENUM('activa','cerrada') | NOT NULL DEFAULT 'activa' | FR-005 |
| `creado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |

**Validaciones**: cliente con `estado = 'activo'` (`409 CLIENTE_NO_ACTIVO`) y
entrenador existente y `activo` (`409 ENTRENADOR_NO_VALIDO`); **un solo
registro `activa` por cliente** — al asignar, la transacción cierra la vigente
(`fecha_fin = hoy`, `estado = 'cerrada'`) e inserta la nueva (R-29); el
cierre manual (`PUT /api/asignaciones/:id/cerrar`) exige estado `activa`
(`409 ESTADO_NO_PERMITE`); una `cerrada` no se reabre. **Sin DELETE**: todas
las vigencias se conservan (FR-025, SC-008).

## `rutinas`

Plan de entrenamiento de un cliente firmado por un entrenador (R-31).

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK AUTO_INCREMENT | — |
| `cliente_id` | INT UNSIGNED | NOT NULL, FK → `clientes.id` (RESTRICT) | FR-006 |
| `entrenador_id` | INT UNSIGNED | NOT NULL, FK → `entrenadores.id` (RESTRICT) | FR-008, insumo §6 |
| `nombre` | VARCHAR(150) | NOT NULL | FR-009 |
| `estado` | ENUM('activa','archivada') | NOT NULL DEFAULT 'activa' | FR-010 |
| `creado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |
| `actualizado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |

**Validaciones**: el cliente debe tener asignación `activa` — si no la tiene,
`409 CLIENTE_SIN_ENTRENADOR`; si está asignado a otro entrenador y el que
opera no es el administrador, `403 FUERA_DE_CARGA` (FR-008); `entrenador_id`
se deriva del responsable vigente del cliente (una rutina siempre pertenece a
quien lleva la carga — insumo §6). **Una sola `activa` por cliente**: crear o
reactivar archiva la vigente en la misma transacción (R-31, clarify Q3);
`nombre` obligatorio y al menos un ejercicio (FR-009), exigido también al
reactivar. **Sin DELETE** (FR-010).

## `ejercicios_rutina`

Componentes de una rutina, una fila por ejercicio (R-30).

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK AUTO_INCREMENT | — |
| `rutina_id` | INT UNSIGNED | NOT NULL, FK → `rutinas.id` (RESTRICT) | FR-009 |
| `nombre` | VARCHAR(150) | NOT NULL | FR-009 |
| `series` | INT | NULL, > 0 | FR-009 |
| `repeticiones` | INT | NULL, > 0 | FR-009 |
| `instrucciones` | TEXT | NULL | FR-009 |
| `orden` | INT | NOT NULL DEFAULT 1 | HU3 (secuencia del plan) |

**Validaciones**: `nombre` obligatorio y al menos una de `series`/`repeticiones`
(> 0) o `instrucciones` no vacía (`400 VALIDACION`, FR-009); la edición de la
rutina reemplaza la lista completa de forma atómica (se borran y reinsertan
sus filas dentro de la transacción — operación interna, la rutina misma nunca
se elimina).

## `objetivos_entrenamiento`

Meta definida para un cliente (R-32).

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK AUTO_INCREMENT | — |
| `cliente_id` | INT UNSIGNED | NOT NULL, FK → `clientes.id` (RESTRICT) | FR-011 |
| `descripcion` | VARCHAR(255) | NOT NULL | FR-011 |
| `meta` | VARCHAR(255) | NULL | HU4 (meta a alcanzar) |
| `fecha_limite` | DATE | NULL | FR-011 (fecha opcional) |
| `estado` | ENUM('en curso','cumplido') | NOT NULL DEFAULT 'en curso' | FR-011 |
| `creado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |
| `actualizado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |

**Validaciones**: cliente en la carga del entrenador (`403 FUERA_DE_CARGA`);
`descripcion` obligatoria; modificar el objetivo (incluido marcarlo
`cumplido`) **no altera ni elimina sus progresos** (FR-013). **Sin DELETE**
(FR-025).

## `progresos_clientes`

Registro fechado de un avance del cliente (R-32; insumo: peso, medidas,
marcas, comentarios).

| Campo | Tipo | Restricciones | Origen |
|-------|------|---------------|--------|
| `id` | INT UNSIGNED | PK AUTO_INCREMENT | — |
| `cliente_id` | INT UNSIGNED | NOT NULL, FK → `clientes.id` (RESTRICT) | FR-012 |
| `objetivo_id` | INT UNSIGNED | NULL, FK → `objetivos_entrenamiento.id` (SET NULL) | FR-012 (progreso ligado o general) |
| `fecha` | DATE | NOT NULL | FR-012 |
| `peso` | DECIMAL(5,2) | NULL, > 0 | insumo §5 |
| `medidas` | VARCHAR(255) | NULL | insumo §5 |
| `marca` | VARCHAR(255) | NULL | insumo §5 |
| `comentario` | VARCHAR(255) | NULL | insumo §5/§7.2 |
| `creado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |
| `actualizado_en` | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | auditoría |

**Validaciones**: `fecha` legible y **al menos un dato de medición** entre
`peso`, `medidas`, `marca` o `comentario` (`400 VALIDACION`, HU4 esc.6);
cliente en la carga del entrenador; si `objetivo_id` no existe → `404`;
modificar una fila está permitido y se audita, **borrarla no existe**
(historial append-only, FR-012/FR-025). Al eliminar (lógicamente) el objetivo
la FK pone `objetivo_id` en `NULL` conservando el progreso.

## Vista `estadisticas_dashboard` (R-33)

Vista de solo lectura con los indicadores globales del momento; el insumo la
lista como tabla "de consultas y resúmenes" sin almacenamiento propio:

```sql
CREATE OR REPLACE VIEW estadisticas_dashboard AS
SELECT
  (SELECT COUNT(*) FROM clientes) AS clientes_total,
  (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') AS clientes_activos,
  (SELECT COUNT(*) FROM membresias WHERE estado = 'activa') AS membresias_activas,
  (SELECT COUNT(*) FROM membresias WHERE estado = 'vencida') AS membresias_vencidas,
  (SELECT COUNT(*) FROM entrenadores WHERE estado = 'activo') AS entrenadores_activos,
  (SELECT COUNT(DISTINCT cliente_id) FROM asignaciones_entrenador WHERE estado = 'activa') AS clientes_con_entrenador,
  (SELECT COUNT(*) FROM rutinas WHERE estado = 'activa') AS rutinas_activas,
  (SELECT COUNT(*) FROM objetivos_entrenamiento WHERE estado = 'en curso') AS objetivos_en_curso,
  (SELECT COUNT(*) FROM objetivos_entrenamiento WHERE estado = 'cumplido') AS objetivos_cumplidos;
```

Los indicadores con periodo (ingresos y pagos del periodo, accesos recientes
autorizados/rechazados, progresos recientes) se calculan con consultas
parametrizadas en `dashboard.service` — la vista no admite filtros de fecha
útiles. **El frontend nunca consulta la vista**: la lectura ocurre
exclusivamente en el backend, que aplica los permisos del rol antes de
devolver cifras (FR-018/FR-019, Principio II).

## Transiciones de estado

```text
entrenadores:
activo ──(admin: dar de baja)──► inactivo          (terminal; no borra nada)
                                    └─ cierra sus asignaciones manualmente
                                       y sus rutinas quedan como historial

asignaciones_entrenador:
(no existe) ──(admin/recepcionista: asignar)──► activa
activa ──(asignar otro entrenador: cierre automático en transacción)──► cerrada
activa ──(admin/recepcionista: cerrar)──► cerrada   (terminal)
   └─ al crear la nueva se inserta la siguiente `activa` con fecha_inicio = hoy

rutinas:
(no existe) ──(entrenador/admin: crear)──► activa   (archiva la anterior del cliente)
activa ──(crear nueva | archivar manualmente)──► archivada
archivada ──(reactivar; exige ejercicios)──► activa (archiva la vigente)

objetivos_entrenamiento:
en curso ──(entrenador/admin: marcar cumplido)──► cumplido   (terminal)
   └─ modificar no toca progresos (FR-013)
```

Reglas derivadas de las aclaraciones del 2026-10-15:

- **Cierre automático** de la asignación anterior al reasignar (respuesta A/Q2)
  y un solo entrenador principal activo por cliente.
- **Una sola rutina activa** por cliente; la nueva archiva la anterior
  (respuesta A/Q3).
- El **cliente nunca escribe** objetivos ni progresos (respuesta A/Q4): solo
  consulta por `GET /api/clientes/mio/rutina` y `GET /api/clientes/mio/progreso`.
- El **recepcionista consulta rutinas en solo lectura** y no accede a
  progresos (respuesta C/Q5); en la matriz no aparece en `objetivos` ni
  `progresos`, por lo que la API responde `403`.

## Relaciones

```text
usuarios 1 ──── 0..1 entrenadores   (entrenadores.usuario_id UNIQUE)
usuarios 1 ──── 0..1 clientes       (heredada del Sprint 1)
clientes 1 ──── N asignaciones_entrenador   (una `activa` por cliente)
entrenadores 1 ── N asignaciones_entrenador
clientes 1 ──── N rutinas           (una `activa` por cliente)
entrenadores 1 ── N rutinas         (autor)
rutinas 1 ──── N ejercicios_rutina
clientes 1 ──── N objetivos_entrenamiento
clientes 1 ──── N progresos_clientes
objetivos_entrenamiento 1 ── 0..N progresos_clientes (SET NULL)
usuarios 1 ──── N auditoria         (heredada)
clientes 1 ──── N membresias|accesos|pagos (heredadas; solo lectura para el dashboard)
```

## Índices nuevos

- `entrenadores`: UNIQUE(`usuario_id`), INDEX(`estado`).
- `asignaciones_entrenador`: INDEX(`cliente_id`), INDEX(`entrenador_id`),
  INDEX(`estado`) — el índice de `cliente_id` soporta la validación de "un
  solo registro `activa` por cliente" en la transacción del servicio.
- `rutinas`: INDEX(`cliente_id`), INDEX(`entrenador_id`), INDEX(`estado`).
- `ejercicios_rutina`: INDEX(`rutina_id`).
- `objetivos_entrenamiento`: INDEX(`cliente_id`), INDEX(`estado`).
- `progresos_clientes`: INDEX(`cliente_id`), INDEX(`objetivo_id`),
  INDEX(`fecha`) — soporta el historial ordenado y los agregados por periodo
  del dashboard (R-33).
