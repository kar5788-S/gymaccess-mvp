# Sistema de Gestión de Acceso y Control Financiero para Gimnasio

Sistema con reconocimiento facial.

- **Sprint 1**: autenticación con JWT, roles y gestión de clientes.
- **Sprint 2**: tipos de membresía, membresías (asignar, renovar, estados),
  pagos y adeudos, información facial (descriptores de 128 dimensiones),
  control de acceso por rostro con registro de intentos y auditoría.
- **Sprint 3**: perfiles de entrenador, asignaciones cliente–entrenador,
  rutinas con ejercicios, objetivos y progresos de entrenamiento, consultas
  propias del cliente y dashboard por rol.

## Estructura

```
gymaccess/
├── frontend/    React + JavaScript (Vite)
├── backend/     Node + Express + JavaScript (ES Modules)
├── database/    migraciones y seeds SQL (MySQL local, InnoDB, utf8mb4)
└── specs/       especificaciones por sprint (Spec Kit)
```

## Requisitos

- Node.js 18+
- MySQL local (InnoDB, utf8mb4)
- Webcam para la captura facial en el navegador (solo en `localhost` o HTTPS)

## Puesta en marcha

1. **Base de datos** (desde `database/`):

   ```bash
   mysql -u root -p -e "CREATE DATABASE gymaccess CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p gymaccess < migrations/001_initial.sql
   mysql -u root -p gymaccess < migrations/002_sprint2.sql
   mysql -u root -p gymaccess < migrations/003_sprint3.sql
   mysql -u root -p gymaccess < seeds/001_admin_inicial.sql
   mysql -u root -p gymaccess < seeds/002_tipos_membresia.sql
   ```

2. **Backend** (desde `backend/`):

   ```bash
   cp .env.example .env   # completar credenciales MySQL y JWT_SECRET
   npm install
   npm run db:seed-admin # alternativa al seed SQL (lee variables de entorno)
   npm run dev            # http://localhost:4000
   ```

3. **Frontend** (desde `frontend/`):

   ```bash
   npm install
   npm run dev            # http://localhost:5173
   ```

Cuenta inicial (seed por defecto): `admin@gimnasio.test` / `Admin1234`.
Cambiar en el primer ingreso o regenerar el seed con otras credenciales.

Los pesos de face-api.js para la captura facial están en
`frontend/public/modelos/` y el umbral de coincidencia facial se ajusta con
`FACIAL_UMBRAL_COINCIDENCIA` en `backend/.env` (defecto `0.6`, R-16).

## Módulos del Sprint 2

| Módulo | Backend | Frontend |
|---|---|---|
| Tipos de membresía | `tipos-membresia.*` (model/service/controller/routes/validators) | `TiposMembresiaPage.jsx` |
| Membresías, renovación y estados | `membresia.*` | `MembresiasPage.jsx` |
| Pagos (método único `efectivo`) y adeudos | `pago.*`, `adeudo.routes.js` | `PagosPage.jsx` |
| Información facial (registro/reemplazo/baja) | `rostro.*`, `utils/descriptor.js` | `RegistrarRostroPage.jsx`, `useCara.js` |
| Control de acceso (identificar → vigencia → registro) | `acceso.*`, `services/matching.service.js` | `AccesoPage.jsx` |
| Historial de accesos y consultas propias | `acceso.*` | `AccesosPage.jsx`, `MiInformacionPage.jsx` |
| Auditoría (solo administrador) | `auditoria.*` | vista `AuditoriaPage` |
| Membresía propia del cliente (solo lectura) | `cliente.service` (`/mio/membresia`) | `MiMembresiaPage.jsx` |

## Módulos del Sprint 3

| Módulo | Backend | Frontend |
|---|---|---|
| Perfiles de entrenador (alta, edición y baja lógica) | `entrenador.*` | `EntrenadoresPage.jsx` |
| Personal con carga y carga propia del entrenador (`/mio/clientes`) | `entrenador.*` | `EntrenadoresPage.jsx` (vista "Mi carga") |
| Asignaciones cliente–entrenador (la reasignación cierra la anterior) | `asignacion.*` | `AsignacionesPage.jsx` |
| Rutinas con ejercicios (una sola activa por cliente) | `rutina.*` | `RutinasPage.jsx` |
| Objetivos y progresos de entrenamiento | `objetivo.*`, `progreso.*` | `SeguimientoPage.jsx` |
| Consultas propias del cliente: rutina activa y evolución | `cliente.service` (`/mio/rutina`, `/mio/progreso`) | `MiRutinaPage.jsx` |
| Dashboard por rol (14 indicadores del admin / 5 del entrenador) | `dashboard.*`, vista `estadisticas_dashboard` | `DashboardPage.jsx` |

## Pruebas

```bash
cd backend  && npm test   # contratos + integración (Vitest + Supertest)
cd frontend && npm test   # componentes (Vitest + React Testing Library)
```

Verificación de extremo a extremo de los quickstarts (contra una base de datos
temporal `gymaccess_quickstart`, nunca la real):

```bash
cd backend && node scripts/verificar-quickstart.mjs         # Sprint 2: 34 escenarios
cd backend && node scripts/verificar-quickstart-sprint3.mjs # Sprint 3: 36 escenarios
```

## Roles y permisos

La autoridad de permisos es el servidor (`MATRIZ_PERMISOS` en
`backend/src/middlewares/authorization.js`); la interfaz solo oculta lo que
no le corresponde al rol.

| Función | administrador | recepcionista | entrenador | cliente |
|---|:-:|:-:|:-:|:-:|
| Login / propia sesión | ✅ | ✅ | ✅ | ✅ |
| Gestión de usuarios | ✅ | ✅ | ❌ | ❌ |
| Clientes: alta/edición/consulta completa | ✅ | ✅ | ❌ | ❌ |
| Clientes: consulta (solo nombre y contacto) | — | — | ✅ | ❌ |
| Cliente: propia ficha, pagos, adeudos y accesos | — | — | — | ✅ |
| Tipos de membresía: alta/edición | ✅ | ❌ | ❌ | ❌ |
| Tipos de membresía: consulta | ✅ | ✅ | ❌ | ❌ |
| Membresías: asignar, consultar y renovar | ✅ | ✅ | consulta ✅ | ❌ |
| Membresías: cambiar estado | ✅ | ❌ | ❌ | ❌ |
| Pagos: registrar y consultar | ✅ | ✅ | ❌ | ❌ |
| Adeudos: control financiero | ✅ | ❌ | ❌ | ❌ |
| Rostros: registrar y consultar | ✅ | ✅ | ❌ | ❌ |
| Intento de acceso (terminal) | ✅ | ✅ | ❌ | ❌ |
| Registro de accesos (historial) | ✅ | ✅ | ✅ | solo lo propio |
| Entrenadores: alta y edición | ✅ | ❌ | ❌ | ❌ |
| Entrenadores: consulta del personal y su carga | ✅ | ✅ | ✅ (solo la propia) | ❌ |
| Asignaciones cliente–entrenador (crear/cerrar) | ✅ | ✅ | ❌ | ❌ |
| Rutinas: crear y editar | ✅ | ❌ | ✅ (solo su carga) | ❌ |
| Rutinas: consulta | ✅ | ✅ (solo lectura) | ✅ (solo su carga) | ❌ |
| Objetivos y progresos (crear, editar, consultar) | ✅ | ❌ | ✅ (solo su carga) | ❌ |
| Cliente: propia rutina y evolución | — | — | — | ✅ (solo lectura) |
| Dashboard completo | ✅ | ❌ | ❌ | ❌ |
| Dashboard de la propia carga | ❌ | ❌ | ✅ | ❌ |
| Auditoría | ✅ | ❌ | ❌ | ❌ |

Reglas de negocio clave visibles en el sistema:

- El intento de acceso identifica el rostro **antes** de validar la
  membresía; la coincidencia facial sola nunca autoriza (FR-012/FR-013).
- Todo intento queda registrado con su motivo cerrado (FR-015, R-23).
- Nunca se exponen descriptores biométricos en ninguna respuesta (FR-017).
- Renovar bloquea mientras exista adeudo pendiente (FR-023).
- Suspender conserva la fecha de vencimiento; reactivar no la modifica (R-21).
- La baja de un cliente elimina físicamente su rostro (FR-022); no existen
  operaciones DELETE en la API (historial inmutable, FR-008).
- Cada cliente tiene como máximo **una asignación de entrenador vigente**:
  la reasignación cierra la anterior con su `fecha_fin` y conserva el
  historial (FR-005, SC-008).
- Cada cliente tiene **una sola rutina activa**: al crear o activar otra,
  la anterior pasa a `archivada` en la misma transacción (clarify Q3).
- El entrenador solo opera sobre su carga y **jamás recibe cifras
  financieras** (Principio VI): su lista y su panel muestran estados, fechas
  e indicadores, sin importes, ingresos ni pagos.
- El dashboard es del administrador (14 indicadores agregados por periodo,
  sin nombres de clientes) y el entrenador solo ve su panel reducido de 5
  indicadores de su carga (FR-016 a FR-019).
- El cliente solo consulta lo propio en modo solo lectura: su ficha, su
  rutina activa y su evolución (clarify Q4, FR-014/FR-015).

## Documentación del proyecto

- Especificaciones por sprint bajo `specs/001-sprint1-auth-clientes/`,
  `specs/002-sprint2-membresias-pagos-acceso-facial/` y
  `specs/003-entrenadores-rutinas-dashboard/` (spec, plan, contratos API,
  modelo de datos, tareas, checklists y quickstart con resultados).
- Reglas del proyecto: `../docs/reglas.md`.
