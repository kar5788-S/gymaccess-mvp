# Phase 0: Research — Base del sistema, usuarios y clientes (Sprint 1)

**Date**: 2026-10-08 | **Plan**: [plan.md](plan.md)

Resolución de todos los unknowns del Technical Context y de las decisiones
pendientes aplicables al Sprint 1. Formato: Decisión / Justificación /
Alternativas consideradas.

## R-01: Estrategia y herramienta de pruebas (unknown original: Testing)

- **Decision**: Vitest como corredor de pruebas para backend y frontend;
  Supertest para pruebas de endpoints; React Testing Library para componentes.
- **Rationale**: el backend usa ES Modules y Vitest los soporta de forma
  nativa sin configuración especial; un solo corredor unifica el flujo `npm
  test`; Supertest permite probar la API sin levantar el servidor completo,
  lo que acelera la lista mínima de pruebas de la constitución (auth,
  roles, clientes).
- **Alternatives considered**: Jest (fricción conocida con ESM y `type:
  module`), Mosa/Mocha + Chai (más configuración y aserciones menos
  uniformes), Cypress/Playwright (E2E de navegador; se difiere porque el
  alcance actual se cubre con pruebas de API y de componentes).

## R-02: Manejo de estado en el frontend (decisión pendiente de docs/reglas.md)

- **Decision**: Context API de React + hooks locales (`useState`,
  `useReducer` donde haga falta).
- **Rationale**: el Sprint 1 solo necesita el estado de sesión (usuario y
  token) y datos de formularios/listas; Context cubre eso sin dependencias
  adicionales, cumpliendo la regla "no agregar dependencias innecesarias".
- **Alternatives considered**: Redux o Zustand (peso y complejidad
  innecesarios para 5 historias), React Query (aporte real cuando haya
  caché y sincronización avanzada; se reevalúa en Sprint 2).

## R-03: Librería de componentes para React (decisión pendiente de docs/reglas.md)

- **Decision**: componentes propios + CSS propio (clases simples y variables
  de diseño); sin librería de componentes en el Sprint 1.
- **Rationale**: el alcance (login, tablas de usuarios/clientes, formularios)
  es pequeño; una librería de UI es una dependencia pesada que la constitución
  exige justificar, y el criterio de éxito SC-007 se logra con una interfaz
  clara, no con un framework visual.
- **Alternatives considered**: Material UI, Bootstrap, Chakra (se
  reconsideran si el "diseño final de la interfaz" pendiente los exige).

## R-04: Validación de entradas en el backend (FR-011, FR-013)

- **Decision**: express-validator para reglas de validación en las rutas
  (formato de email, campos obligatorios, política de contraseña), con
  mensajes genéricos al usuario.
- **Rationale**: la validación es requisito de seguridad (la constitución
  exige validar en el backend); una librería consolidada evita errores de
  validación casera; es una dependencia justificada y pequeña.
- **Alternatives considered**: validación manual en cada controlador
  (rechazada por inconsistencia y duplicación), Joi (igual de pesada sin
  ventaja para Express).

## R-05: Protección de contraseñas (FR-012)

- **Decision**: bcrypt con factor de costo ≥ 10 para el hash.
- **Rationale**: la constitución nombra bcrypt explícitamente; factor ≥ 10
  es la recomendación habitual para credenciales interactivas.
- **Alternatives considered**: Argon2/scrypt (técnicamente sólidos pero la
  constitución exige bcrypt; cambiarlo requeriría enmienda).

## R-06: Sesión y token (unknown original: configuración de sesiones)

- **Decision**: JWT firmado con secreto de `.env`, expiración de 8 horas
  (clarificado el 2026-10-08), enviado en el encabezado `Authorization:
  Bearer` y persistido en `localStorage` en el frontend.
- **Rationale**: cumple el stack de la constitución (JWT) y la duración
  acordada; el patrón Bearer es el más simple para probar con Supertest y
  mantiene la API sin estado.
- **Alternatives considered**: cookie `httpOnly` (mejor protección XSS
  frontal pero agrega manejo de CSRF y complejidad fuera de alcance),
  refresh tokens (ciclo de vida más complejo; no requerido en Sprint 1).

## R-07: Bloqueo por intentos fallidos (FR-002, clarificación Q3)

- **Decision**: campos `intentos_fallidos` y `bloqueado_hasta` en la tabla
  `usuarios`; la lógica vive en el servicio de autenticación (incrementar al
  fallar, bloquear 15 minutos al llegar a 5, limpiar al autenticar).
- **Rationale**: estado junto al dato que protege, transaccional con el
  login, sin dependencias nuevas; permite probar el SC-008 de forma
  determinista.
- **Alternatives considered**: tabla de intentos por IP con
  `express-rate-limit` (protege otra cosa y añade complejidad), tabla
  `intentos_login` (útil para auditoría, pero la auditoría es Sprint 2).

## R-08: Detección de clientes duplicados (FR-007, clarificación Q4)

- **Decision**: antes de insertar, buscar un cliente con el mismo
  `nombre_completo` y con teléfono o correo coincidente; si existe y no se
  recibe `confirmar_duplicado: true`, responder `409` con el aviso; con
  confirmación, guardar.
- **Rationale**: respeta exactamente la regla clarificada (aviso + confirmación)
  y deja al recepcionista decidir cuando el coincidencia sea familiar.
- **Alternatives considered**: bloqueo total por teléfono/correo (rechazado
  en la clarificación), sin detección (rechazado en la clarificación).

## R-09: Estructura de la API REST (decisión pendiente de docs/reglas.md)

- **Decision**: rutas bajo `/api` con recursos en plural
  (`/api/usuarios`, `/api/clientes`), respuestas en envolvente JSON
  consistente y códigos HTTP semánticos; detalle en `contracts/api.md`.
- **Rationale**: la constitución exige estructura consistente, JSON, códigos
  HTTP apropiados y manejo de errores centralizado; un contrato único evita
  divergencias entre módulos.
- **Alternatives considered**: GraphQL (fuera del stack REST exigido),
  versionado `/api/v1` (posible cuando exista un segundo consumidor; hoy
  añade prefijo sin beneficio).

## R-10: Persistencia en MySQL (FR-013, anti-inyección)

- **Decision**: driver `mysql2` con pool de conexiones y exclusivamente
  consultas parametrizadas (`?` con valores separados); migraciones como
  scripts SQL versionados en `database/migrations/`.
- **Rationale**: `mysql2` soporta promesas con ES Modules; los parámetros
  son la defensa exigida contra inyección SQL; los scripts versionados
  cumplen la constitución (estructura de BD reconstruible).
- **Alternatives considered**: ORM (Sequelize/Knex/Prisma): abstracción
  innecesaria para 8 tablas y entra en conflicto con la obligación de
  scripts SQL versionados; driver `mysql` legado (sin promesas).

## R-11: Cuenta administrador inicial (supuesto del spec)

- **Decision**: seed `database/seeds/001_admin_inicial.sql` que crea la
  cuenta administradora con credenciales definidas en variables de entorno;
  el backend nunca tiene cuentas por defecto codificadas.
- **Rationale**: el auto-registro está fuera de alcance, así que debe existir
  una primera cuenta; las credenciales en `.env` cumplen la regla de secretos.
- **Alternatives considered**: auto-creación al arrancar el backend (menos
  control y trazabilidad), auto-registro de usuarios (fuera de alcance).

## R-12: Eliminación de registros (FR-014)

- **Decision**: no existen endpoints de eliminación para `usuarios` y
  `clientes` en el Sprint 1; para usuarios, el "deshabilitar" se hace con el
  campo `estado`.
- **Rationale**: la regla del sprint prohíbe la eliminación física; exponer
  DELETE generaría una violación verificable.
- **Alternatives considered**: DELETE lógico con marca de eliminación
  (innecesario cuando el alcance solo pide mantener el registro).

## Unknowns resueltos

| Unknown del Technical Context | Resolución |
|-------------------------------|------------|
| Testing | R-01: Vitest + Supertest + React Testing Library |
| Configuración de sesiones (pendiente del spec) | R-06: JWT, 8 h, Bearer + localStorage |
| Estrategia de estado en React | R-02: Context API |
| Librería de componentes | R-03: componentes propios |
| Estructura definitiva de la API | R-09: `/api` + envolvente JSON (contrato en `contracts/`) |
