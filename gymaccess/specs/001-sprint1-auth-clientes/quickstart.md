# Quickstart — Validación del Sprint 1

**Date**: 2026-10-08 | **Spec**: [spec.md](spec.md) | **Contract**: [contracts/api.md](contracts/api.md)

Guía de ejecución y validación de extremo a extremo. No incluye código de
implementación; los escenarios referencian el contrato y el modelo de datos.

## Previos requisitos

- Node.js 20 o superior (backend con ES Modules, `type: module`).
- MySQL 8 local, con acceso de administrador para crear la base de datos.
- Un navegador moderno.

## Puesta en marcha

1. Copiar `.env.example` a `.env` en la raíz y en `backend/`, y completar:
   credenciales de MySQL, `JWT_SECRET`, y las credenciales del administrador
   inicial del seed (R-11). El archivo `.env` NO se versiona.
2. Crear la base de datos ejecutando, en orden, los scripts de
   `database/migrations/` (el inicial crea las 5 tablas del Sprint 1:
   `usuarios`, `clientes`, `tipos_membresia`, `membresias`, `pagos`).
3. Ejecutar `database/seeds/001_admin_inicial.sql` para crear la cuenta
   administradora.
4. Backend: `cd backend && npm install && npm run dev` (escucha en el puerto
   indicado en `.env`).
5. Frontend: `cd frontend && npm install && npm run dev` y abrir la URL que
   muestra la consola.

## Comandos de prueba

- Backend: `cd backend && npm test` (Vitest + Supertest; R-01)
- Frontend: `cd frontend && npm test` (Vitest + React Testing Library)
- Re-ejecutar migraciones desde cero para verificar que la estructura es
  reconstruible con scripts versionados (constitución, Principio IV).

## Escenarios de validación

| # | Escenario | Pasos | Resultado esperado | Criterio |
|---|-----------|-------|--------------------|----------|
| 1 | Login correcto | Iniciar sesión con el admin del seed | Se entra y solo se muestran las funciones de administrador | SC-001, SC-002 |
| 2 | Credenciales inválidas | Login con contraseña incorrecta | Mensaje de error claro, sin detalle interno ni revelación de si la cuenta existe | SC-006 |
| 3 | Bloqueo por fallos | 5 logins fallidos con la misma cuenta y un intento más | Los primeros 5: mensaje genérico; el 6.º: rechazo durante 15 minutos | SC-008 |
| 4 | Crear usuario | Admin: registrar usuario con rol "recepcionista" y contraseña válida; luego ese usuario entra | Usuario creado y con las funciones del rol asignado | SC-001, SC-003 |
| 5 | Política de contraseña | Crear usuario con contraseña corta o sin mayúscula/número | Rechazo con mensaje del requisito incumplido | SC-001 (FR-012) |
| 6 | Gestión exclusiva de admin | Con sesión de recepcionista, intentar crear/modificar usuarios (directamente contra la API) | `403`, sin cambios en datos | SC-004 |
| 7 | Registrar cliente | Admin o recepcionista: crear cliente con nombre y contacto | Cliente guardado con confirmación visible | SC-003, SC-007 |
| 8 | Cliente duplicado | Repetir el registro con el mismo nombre y teléfono o correo | Aviso de posible duplicado; solo guarda si se confirma | SC-001 (FR-007) |
| 9 | Vista del entrenador | Login como entrenador y consultar la lista de clientes | Solo nombre completo y teléfono/correo por cliente | SC-004 (FR-009) |
| 10 | Cliente ve lo propio | Login como cliente | Ve solo su ficha; intentar ver otro cliente → `403` sin datos ajenos | SC-004 (FR-010) |
| 11 | Sin eliminación física | Revisar endpoints y datos tras CRUD de usuarios y clientes | No hay operación de borrado; registros persisten | FR-014 |
| 12 | Contraseñas protegidas | Consultar la tabla `usuarios` directamente en MySQL | Ninguna contraseña en texto plano; solo hashes | SC-005 |
| 13 | Sesión expirada | Usar un token con más de 8 horas de emisión (o esperar; para pruebas, emitir un token de corta duración desde las pruebas del backend) | Rechazo `401` y re-login; ninguna operación a medias | FR-016 |
| 14 | Acceso a BD | Revisar que solo el backend tiene credenciales de MySQL y el frontend no | Cumplimiento estructural de la constitución | Principio IV |

## Verificación de constitución (resumen)

- `.env.example` presente y sin secretos; `.env` fuera del repositorio.
- Permisos validados en el servidor, no solo ocultos en la interfaz.
- Estructura `frontend/`, `backend/`, `database/` sin carpetas alternativas.
- Backend ES Modules (`"type": "module"`), sin `require`/`module.exports`.
