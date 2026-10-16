# Quickstart — Validación del Sprint 2

**Date**: 2026-10-14 | **Spec**: [spec.md](spec.md) | **Contract**: [contracts/api.md](contracts/api.md) | **Data model**: [data-model.md](data-model.md)

Guía de ejecución y validación de extremo a extremo. No incluye código de
implementación ni migraciones completas; los escenarios referencian el
contrato y el modelo de datos.

## Previos requisitos

- Node.js 20 o superior (backend con ES Modules, `type: module`).
- MySQL 8 local, con acceso de administrador para crear la base de datos.
- Un navegador moderno con soporte de `getUserMedia` (Chrome, Edge o Firefox
  actualizados) y una webcam USB o integrada.
- Conexión local (`localhost`) o HTTPS: los navegadores solo entregan la
  cámara en contextos seguros (R-17).

## Puesta en marcha

1. Copiar `.env.example` a `.env` en la raíz y en `backend/`, y completar:
   credenciales de MySQL, `JWT_SECRET`, credenciales del administrador del
   seed y `FACIAL_UMBRAL_COINCIDENCIA` (umbral de distancia euclidiana,
   `0.6` por defecto — R-16; no es secreto, va documentado en
   `.env.example`).
2. Ejecutar en orden los scripts de `database/migrations/`: `001_initial.sql`
   (5 tablas del Sprint 1) y `002_sprint2.sql` (ALTER de
   `tipos_membresia`/`membresias`/`pagos` + tablas `rostros`, `accesos` y
   `auditoria` — R-25).
3. Ejecutar los seeds: `001_admin_inicial.sql` (cuenta administradora) y
   `002_tipos_membresia.sql` (3 planes de ejemplo: mensual, trimestral,
   anual).
4. Descargar los pesos del modelo facial y colocarlos en
   `frontend/public/modelos/` (R-13; se sirven localmente, sin descargas
   externas en tiempo de ejecución).
5. Backend: `cd backend && npm install && npm run dev`.
6. Frontend: `cd frontend && npm install && npm run dev` y abrir la URL que
   muestra la consola.

## Comandos de prueba

- Backend: `cd backend && npm test` (Vitest + Supertest; R-01). El servicio
  de identificación facial se prueba con **descriptores simulados** (vectores
  de prueba de 128 valores) para no depender de la cámara en CI.
- Frontend: `cd frontend && npm test` (Vitest + React Testing Library).
- Re-ejecutar las migraciones desde cero para verificar que la estructura es
  reconstruible con scripts versionados (Principio IV).

## Condiciones de captura para las pruebas manuales (R-17)

- Iluminación frontal uniforme (evitar contraluz o ventanas a la espalda).
- Rostro a unos 50–80 cm de la cámara, sin gafas de sol ni gorras que tapen
  la cara.
- El sistema toma 5 muestras con ~300 ms de separación y promedia los
  descriptores; mantener la quietud durante la captura.
- Si la cámara no está disponible o el permiso se deniega, el sistema debe
  informarlo con un mensaje claro y registrar el intento como rechazado
  (caso límite del spec).

## Escenarios de validación

| # | Escenario | Pasos | Resultado esperado | Criterio |
|---|-----------|-------|--------------------|----------|
| 1 | Alta de tipo de membresía | Admin: crear "Mensual" con duración 30 y precio válido | Tipo creado y visible en la lista | HU1, SC-002 |
| 2 | Validación de tipo | Intentar guardar un tipo sin nombre o con duración/precio inválidos | Rechazo con el dato incorrecto indicado; nada se guarda | HU1 esc.2 |
| 3 | Tipos exclusivos del admin | Con sesión de recepcionista, llamar directamente a `POST /api/tipos-membresia` | `403`, sin cambios en datos | FR-016 |
| 4 | Asignación válida | Admin/recepcionista: asignar una membresía con fecha de inicio | Se crean `fecha_vencimiento = inicio + duración` y estado `activa` | HU2, SC-003 |
| 5 | Cliente inactivo | Asignar membresía a un cliente dado de baja | `409 CLIENTE_NO_ACTIVO` con mensaje claro | HU2 esc.6 |
| 6 | Miembros duplicados | Asignar una segunda membresía a un cliente con una activa | `409 MEMBRESIA_ACTIVA_EXISTENTE` | FR-004 |
| 7 | **Bloqueo por adeudo** | Dejar un saldo pendiente e intentar asignar o renovar | `409 ADEUDO_PENDIENTE`; tras registrar el pago, la operación procede | FR-023, SC-003 |
| 8 | Renovación | Renovar una membresía activa o vencida | `fecha_vencimiento` extendida en `duracion_dias` desde la fecha vigente; estado `activa` | HU4, R-21 |
| 9 | Renovación no permitida | Intentar renovar una membresía suspendida o cancelada | `409 ESTADO_NO_PERMITE` | HU4 esc.2 |
| 10 | **Suspensión y reactivación** | Admin: suspender y luego reactivar una membresía | La `fecha_vencimiento` queda **idéntica** a la original (sin días extra) | R-21, clarify 2026-10-14 |
| 11 | Pago válido | Registrar un pago con monto positivo y fecha | Pago asociado a cliente y membresía con `metodo = efectivo` | HU3, SC-003 |
| 12 | **Método único** | Enviar un pago con `metodo: "transferencia"` o `tarjeta` | `400 VALIDACION`; solo se acepta `efectivo` | R-18, clarify 2026-10-14 |
| 13 | Pago inválido | Monto 0 o negativo | Rechazo con mensaje del monto incorrecto | HU3 esc.2 |
| 14 | Historial inmutable | Intentar eliminar o modificar un pago desde la API | No existe la operación; el registro persiste | FR-008 |
| 15 | Cálculo de adeudos | Registrar pagos parciales y consultar el saldo | `saldo = max(0, precio − Σ pagos)`; pagos de más ⇒ saldo en 0 y pago en el historial | FR-009, HU3 esc.5-6 |
| 16 | Cliente ve lo propio | Login como cliente y consultar pagos, adeudos y membresía | Ve solo lo suyo (estado y fechas de su membresía); otros clientes → `403` | FR-010, FR-024 |
| 17 | Entrenador sin finanzas | Login como entrenador y consultar pagos o adeudos | `403`; en membresías y accesos no recibe importes | Principio VI |
| 18 | Registro facial | Admin/recepcionista: capturar el rostro de un cliente registrado | Información facial guardada y reemplazo si ya existía | HU5, FR-011 |
| 19 | Cliente no registrado | Intentar registrar un rostro sin ficha de cliente | `404` con mensaje de que el cliente debe existir primero | HU5 esc.3 |
| 20 | Sin datos biométricos expuestos | Revisar todas las respuestas de rostros y fichas de cliente | Nunca aparece `descriptor_facial`; solo metadatos | FR-017, SC-008 |
| 21 | **Acceso autorizado** | Cliente con membresía activa se captura en la terminal de acceso | Identificado, membresía verificada, `resultado: autorizado` y intento registrado | HU6 esc.1, SC-004 |
| 22 | Acceso rechazado por vencida | Repetir con una membresía vencida | `rechazado` con motivo `membresia_vencida`, mensaje claro e intento registrado | HU6 esc.2, SC-004 |
| 23 | Rechazo por suspensida/cancelada/sin membresía | Repetir con esos estados | `rechazado` con el motivo correspondiente en cada caso | HU6 esc.3-4 |
| 24 | Rostro no identificado | Capturar un rostro no registrado (o `descriptor: null`) | `rechazado` con motivo `rostro_no_identificado`, sin datos de clientes ni errores técnicos | HU6 esc.5, SC-006 |
| 25 | Identificación antes que membresía | Revisar la respuesta de un intento no identificado | `cliente` y `membresia` en `null`: no se consulta ni se muestra membresía de nadie | HU6 esc.7, FR-012 |
| 26 | Orden facial → membresía | Revisar los casos 21-25 en conjunto | Ningún acceso se autoriza solo por coincidencia facial; siempre exige membresía vigente | FR-013, SC-006 |
| 27 | Registro de intentos | Consultar `GET /api/accesos` tras los casos 21-25 | Todos los intentos aparecen con fecha, hora, resultado y motivo cuando aplica; sin borrados | FR-015, SC-005 |
| 28 | Filtros de accesos | Filtrar por fecha y por resultado; buscar sin coincidencias | Lista filtrada; vacío con mensaje claro (no error) | HU8 esc.4 |
| 29 | **Baja de cliente** | Dar de baja a un cliente con información facial | Se elimina su fila en `rostros`; si se reactiva, exige nueva captura | FR-022, clarify 2026-10-14 |
| 30 | Auditoría | Revisar `GET /api/auditoria` con admin y con recepcionista | Admin ve asignaciones, renovaciones, pagos, rostros y accesos; recepcionista recibe `403` | FR-020 |
| 31 | Permisos en servidor | Con sesión de rol sin permiso, llamar a cada endpoint restringido directamente a la API | `403` en todos; la interfaz oculta opciones pero la seguridad está en el backend | FR-016, Principio V |
| 32 | Escalamiento de tiempo | Consultar membresías en varias fechas (o con fechas manipuladas en pruebas) | `vencida` se detecta por fecha sin cron; vigencia inclusiva hasta el final del día | FR-006, R-20 |
| 33 | Rendimiento del acceso | Cronometrar la captura en la terminal | Identificación o rechazo en menos de 5 s desde la captura | SC-007 |
| 34 | Prueba de demostración | Recorrer el flujo completo: tipo → cliente → membresía → pago → rostro → acceso autorizado y rechazado | Todos los escenarios pasan sin errores; 90% del personal lo completa sin ayuda | SC-001, SC-009 |

## Verificación de constitución (resumen)

- `.env.example` presente y sin secretos; `.env` fuera del repositorio;
  `FACIAL_UMBRAL_COINCIDENCIA` documentado sin valor sensible.
- Solo el backend tiene credenciales de MySQL; el frontend solo captura y
  envía descriptores (Principio II y IV).
- Reconocimiento facial únicamente para identificar clientes registrados en el
  punto de acceso; sin vigilancia ni seguimiento (Principio VIII).
- Información facial nunca expuesta en respuestas ni en endpoints públicos
  (Principio V).
- Backend ES Modules (`"type": "module"`), sin `require` ni
  `module.exports`; consultas parametrizadas.
- Historial de pagos, accesos y auditoría sin operaciones de borrado
  ordinario (Principio VII).
