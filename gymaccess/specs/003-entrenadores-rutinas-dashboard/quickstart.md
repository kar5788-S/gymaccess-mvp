# Quickstart — Validación del Sprint 3

**Date**: 2026-10-15 | **Spec**: [spec.md](spec.md) | **Contract**: [contracts/api.md](contracts/api.md) | **Data model**: [data-model.md](data-model.md)

Guía de ejecución y validación de extremo a extremo. No incluye código de
implementación ni migraciones completas; los escenarios referencian el
contrato y el modelo de datos.

## Previos requisitos

- Node.js 20 o superior (backend con ES Modules, `type: module`).
- MySQL 8 local, con acceso de administrador para crear la base de datos.
- Un navegador moderno (Chrome, Edge o Firefox actualizados).
- **Este sprint no requiere cámara**: no se usa información facial en los
  escenarios (el módulo del Sprint 2 queda intacto).

## Puesta en marcha

1. Copiar `.env.example` a `.env` en la raíz y en `backend/`, y completar:
   credenciales de MySQL, `JWT_SECRET` y credenciales del administrador del
   seed (heredado de los sprints anteriores).
2. Ejecutar en orden los scripts de `database/migrations/`: `001_initial.sql`,
   `002_sprint2.sql` y el nuevo **`003_sprint3.sql`** (6 tablas de
   entrenamiento + vista `estadisticas_dashboard` — R-36).
3. Ejecutar los seeds heredados: `001_admin_inicial.sql` y
   `002_tipos_membresia.sql`. **No hay seeds nuevos**: el entrenador, la
   asignación y la rutina de prueba se dan de alta por API en los escenarios
   1-8 (R-36).
4. Backend: `cd backend && npm install && npm run dev`.
5. Frontend: `cd frontend && npm install && npm run dev` y abrir la URL que
   muestra la consola.

## Comandos de prueba

- Backend: `cd backend && npm test` (Vitest + Supertest; mocks en memoria,
  patrón de los sprints anteriores). Cobertura mínima esperada: servicios de
  entrenador, asignación, rutina, seguimiento y dashboard + pruebas de
  permisos por rol.
- Frontend: `cd frontend && npm test` (Vitest + React Testing Library) para
  las páginas nuevas y las entradas de `VISTAS`.
- Re-ejecutar las migraciones desde cero (001 → 002 → 003) para verificar que
  la estructura es reconstruible con scripts versionados (Principio IV).

## Escenarios de validación

| # | Escenario | Pasos | Resultado esperado | Criterio |
|---|-----------|-------|--------------------|----------|
| 1 | **Alta de entrenador** | Admin: crear usuario con rol `entrenador` y registrar el perfil (nombre, contacto) | Perfil creado, visible en el listado con su usuario y carga en 0 | HU1, SC-002 |
| 2 | Usuario no válido | Registrar un entrenador con un usuario inexistente, de otro rol o deshabilitado | `404` o `409 ENTRENADOR_NO_VALIDO` con mensaje claro; nada se guarda | HU1 esc.2, FR-002 |
| 3 | Perfil duplicado | Vincular el mismo usuario a un segundo perfil de entrenador | `409 USUARIO_YA_ENTRENADOR` | R-28 |
| 4 | Entrenadores solo admin | Con sesión de recepcionista/entrenador, llamar a `POST /api/entrenadores` | `403`; la interfaz ni siquiera ofrece el alta | HU1 esc.4, FR-021 |
| 5 | Edición sin pérdida | Admin: cambiar teléfono o especialidad de un entrenador con clientes y rutinas | Cambios guardados; asignaciones y rutinas intactas | HU1 esc.3 |
| 6 | **Asignación válida** | Admin/recepcionista: asignar un entrenador a un cliente activo | Asignación `activa` con `fecha_inicio`; el entrenador lo ve en su carga | HU2, SC-002 |
| 7 | **Reasignación cierra la anterior** | Asignar otro entrenador al mismo cliente | La anterior queda `cerrada` con `fecha_fin`; hay una sola `activa`; historial completo | HU2 esc.2, clarify Q2, SC-008 |
| 8 | Cliente inactivo | Asignar entrenador a un cliente dado de baja | `409 CLIENTE_NO_ACTIVO` | HU2 esc.3, FR-004 |
| 9 | Entrenador inactivo | Asignar un perfil con `estado: inactivo` o usuario deshabilitado | `409 ENTRENADOR_NO_VALIDO` | HU2 esc.4 |
| 10 | Roles sin asignación | Entrenador o cliente llaman a `POST /api/asignaciones` y a `PUT /api/asignaciones/:id/cerrar` | `403` en ambos | HU2 esc.6 |
| 11 | **Creación de rutina** | Entrenador: crear rutina con 3 ejercicios (series, repeticiones e instrucciones) | `201`, rutina `activa` con ejercicios ordenados; SC cronometrable | HU3, SC-003 |
| 12 | Cliente sin entrenador | Crear rutina para un cliente sin asignación vigente | `409 CLIENTE_SIN_ENTRENADOR` | HU3 esc.2 |
| 13 | **Fuera de la carga** | Entrenador B intenta crear o editar rutina de un cliente de A | `403 FUERA_DE_CARGA`; en la lista, la consulta filtrada por cliente ajeno también se deniega | HU3 esc.3, SC-004 |
| 14 | **Una sola activa** | El entrenador crea una segunda rutina para el mismo cliente | La anterior pasa a `archivada` y ambas se conservan; el cliente ve la nueva | HU3 esc.4, clarify Q3 |
| 15 | Rutina inválida | Guardar sin nombre, sin ejercicios o con `series: 0` / `repeticiones: -1` | `400 VALIDACION` indicando el dato; nada se guarda | HU3 esc.7, FR-009 |
| 16 | Supervisión y lectura | Admin edita cualquier rutina; recepcionista consulta una y luego intenta editarla | Admin: `200`; recepcionista: lectura `200`, edición `403` | HU3 esc.6, clarify Q4/Q5 |
| 17 | **Objetivo y progreso** | Entrenador: registrar un objetivo y dos progresos con fechas distintas | Ambos progresos en el historial ordenado por fecha | HU4, SC-009 (auditoría) |
| 18 | Objetivo modificado | Marcar el objetivo como `cumplido` y editarlo | Los progresos previos siguen intactos | HU4 esc.3, FR-013 |
| 19 | **Cliente no escribe** | Con sesión de cliente, llamar a `POST /api/objetivos` o `POST /api/progresos` | `403`; el cliente solo consulta | clarify Q4, HU5 |
| 20 | Progreso sin datos | Registrar un progreso solo con `fecha` | `400 VALIDACION` (exige al menos un dato de medición) | HU4 esc.6, FR-022 |
| 21 | **Cliente ve lo propio** | Login como cliente: abrir su rutina y su evolución | Rutina activa con ejercicios; objetivos y progresos propios | HU5 esc.1-2, SC-005 |
| 22 | Cliente sin rutina | Un cliente sin rutina activa consulta su plan | `200` con `rutina: null` y mensaje claro; sin errores técnicos | HU5 esc.3, FR-015 |
| 23 | Aislamiento entre clientes | Manipular la solicitud para ver datos de otro cliente | `403`/`404`; nunca información ajena | HU5 esc.4, SC-005 |
| 24 | **Dashboard completo** | Admin: abrir el dashboard y cambiar el periodo (mes / 30 días / histórico) | Indicadores de clientes, membresías, ingresos, accesos, entrenadores, rutinas y objetivos recalculados por periodo | HU6 esc.1-2, FR-016/017 |
| 25 | **Panel del entrenador** | Login como entrenador: abrir su panel | Solo los indicadores de su carga (clientes, rutinas, objetivos, progresos); **ninguna cifra financiera** | clarify Q1 (B), HU6 esc.6 |
| 26 | Dashboard denegado | Recepcionista o cliente llaman a `GET /api/dashboard` o `/api/dashboard/mio` | `403` en ambos | HU6 esc.3, FR-018 |
| 27 | Dashboard vacío | Con una instalación sin entrenadores ni rutinas, abrir el dashboard | Ceros o mensajes vacíos legibles; sin errores | HU6 esc.4 |
| 28 | **Personal asignado** | Admin/recepcionista: consultar el listado de personal | Cada entrenador con sus clientes vigentes y su conteo de carga | HU7 esc.1-2 |
| 29 | Entrenador sin carga | Consultar un entrenador recién creado | Carga en 0 con mensaje claro, sin error | HU7 esc.3 |
| 30 | Carga propia | Login como entrenador: abrir su lista de clientes | Solo sus clientes (con estado de membresía, sin importes) | HU7 esc.4, Principio VI |
| 31 | Cliente sin acceso al personal | Cliente llama a `GET /api/entrenadores` o `/api/asignaciones` | `403` | HU7 esc.5 |
| 32 | **Auditoría del sprint** | Revisar `GET /api/auditoria?modulo=rutinas` (y `entrenadores`, `asignaciones`, `objetivos`, `progresos`) con admin | Aparecen altas, cambios y cierres con usuario, fecha y resultado; con otros roles, `403` | FR-023, SC-009 |
| 33 | Permisos en servidor | Con cada rol sin permiso, llamar directamente a la API en cada endpoint restringido | `403` en todos; la interfaz oculta opciones pero la seguridad está en el backend | FR-021, Principio V |
| 34 | Sin borrados | Revisar la API: intentar eliminar entrenador, asignación, rutina, objetivo o progreso | No existe ninguna operación `DELETE`; los registros persisten (se inactivan, cierran o archivan) | FR-010, FR-025 |
| 35 | Rendimiento del dashboard | Cronometrar la apertura del dashboard como admin | Indicadores visibles en menos de 3 s | SC-006 |
| 36 | **Demostración completa** | Recorrer el flujo de cierre: registrar entrenador → asignar cliente → crear rutina → registrar objetivo y progreso → ver la rutina como cliente → revisar dashboard | Todos los escenarios anteriores pasan sin errores; 90% del personal lo completa sin ayuda | SC-001, SC-010 |

## Verificación de constitución (resumen)

- Backend ES Modules (`"type": "module"`), sin `require` ni `module.exports`;
  consultas parametrizadas en todos los servicios nuevos.
- Permisos validados en el servidor en dos capas: `MATRIZ_PERMISOS` por rol y
  pertenencia a la carga en el servicio (Principio V, FR-021).
- El entrenador opera solo sobre su carga y nunca recibe información
  financiera (Principio VI); el cliente solo consulta lo propio en modo solo
  lectura (Principio VI).
- El dashboard entrega solo cifras agregadas autorizadas por rol, sin datos
  sensibles de clientes no autorizados (FR-019, Principio V).
- Frontend sin acceso directo a MySQL: todo pasa por la API REST (Principio
  II y IV).
- Historial de entrenadores, asignaciones, rutinas, objetivos y progresos sin
  borrado ordinario (Principio VII); migración `003_sprint3.sql` versionada y
  reconstruible (Principio IV).
- Alcance acotado: sin clases masivas, asistencia grupal, reportes complejos
  ni datos médicos (Principio I).
- Nota de gobernanza: al cierre del sprint debe sincronizarse la
  documentación maestra (`project-context.md`, `reglas.md` y la constitución)
  con la tercera etapa de la base de datos y los permisos de escritura del
  entrenador (supuesto del spec, Principio I).

## Resultados de la verificación (T068/T069)

**Fecha**: 2026-10-15 · **Comando**:
`cd backend && node scripts/verificar-quickstart-sprint3.mjs` · **Base de
datos**: `gymaccess_quickstart` recreada desde cero con las migraciones
`001 → 002 → 003` y los seeds heredados (`001_admin_inicial.sql`,
`002_tipos_membresia.sql`).

**Resultado global: 36/36 escenarios OK (0 fallos; código de salida 0).**

| Grupos de escenarios | Resultado | Detalle |
|----------------------|-----------|---------|
| 1–5 Entrenadores (HU1) | ✅ 5/5 | Alta con usuario y carga 0; 404/409 y 409 `USUARIO_YA_ENTRENADOR` sin guardar nada; 403 a recepcionista y entrenador; edición sin pérdida de asignaciones ni rutinas |
| 6–10 Asignaciones (HU2) | ✅ 5/5 | Vigente con `fecha_inicio`; reasignación cierra la anterior con `fecha_fin` (SC-008); 409 `CLIENTE_NO_ACTIVO` y `ENTRENADOR_NO_VALIDO`; 403 en crear y cerrar |
| 11–16 Rutinas (HU3) | ✅ 6/6 | Rutina activa con 3 ejercicios ordenados; 409 `CLIENTE_SIN_ENTRENADOR`; 403 `FUERA_DE_CARGA` al crear y listar ajeno; una sola activa con archivada y el cliente ve la nueva; 400 `VALIDACION` ×4 sin guardar; admin edita / recepcionista lee y no edita |
| 17–20 Seguimiento (HU4) | ✅ 4/4 | Dos progresos ordenados por fecha; objetivo `cumplido` con progresos intactos; 403 al cliente; 400 por progreso sin dato de medición |
| 21–23 Cliente propio (HU5) | ✅ 3/3 | Rutina activa + objetivos + progresos propios; `rutina: null` con mensaje claro; aislamiento ante manipulación de la solicitud (SC-005) |
| 24–27 Dashboard (HU6) | ✅ 4/4 | 14 indicadores por mes/30d/histórico; panel del entrenador con 5 claves y sin cifras financieras; 403 por rol; instalación vacía en cero (esc. 27 ejecutado al inicio) |
| 28–31 Personal (HU7) | ✅ 4/4 | Listado con usuario, clientes vigentes y conteo; recién creado en carga 0; carga propia con membresía y sin importes; 403 al cliente |
| 32–36 Cierre | ✅ 5/5 | Auditoría por módulo con 403 a otros roles; 15/15 permisos en servidor con 403; sin rutas `DELETE` (5×404) y registros intactos; dashboard en 22 ms (< 3 s); flujo completo |

Notas de ejecución:

- **Hallazgo corregido durante T068**: las respuestas de asignaciones,
  objetivos y progresos serializaban las columnas `DATE` como marcas de
  tiempo ISO (mysql2 devuelve `Date`), mientras que el contrato promete
  fechas (`fecha_inicio: "hoy"`). Se normalizó a `AAAA-MM-DD` en los
  mappers públicos (`asignacionPublica`, `objetivoPublico`,
  `progresoPublico`), con lo que los escenarios 6 y 17 pasan y las suites
  se mantienen en verde.
- Los criterios **de interfaz** de los escenarios 4, 24, 27 y 35 quedan
  cubiertos por las pruebas de humo de las páginas
  (`EntrenadoresPage.test.jsx`, `DashboardPage.test.jsx`, etc.) y por el
  build de producción; la parte humana del escenario 36 (90 % del personal
  sin ayuda) queda como **verificación manual** pendiente de una prueba con
  personas.
- Suites automatizadas al cierre: backend **245/245** (26 archivos) y
  frontend **14/14** (7 archivos).
