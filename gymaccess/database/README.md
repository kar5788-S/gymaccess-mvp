# Base de datos

MySQL local con motor **InnoDB** y codificación **utf8mb4**.

## Contenido

| Ruta | Descripción |
|---|---|
| `migrations/001_initial.sql` | Estructura inicial: `usuarios`, `clientes` y tablas base de membresías/pagos (Sprint 1) |
| `migrations/002_sprint2.sql` | Sprint 2: `estado` en `clientes` (baja sin borrado, FR-003/FR-022), `descripcion`/`estado` en tipos, `precio` congelado en membresías, pagos obligatorios con método `efectivo`, y tablas nuevas `rostros`, `accesos`, `auditoria` |
| `migrations/003_sprint3.sql` | Sprint 3 (tercera etapa de BD, R-36): tablas nuevas `entrenadores`, `asignaciones_entrenador`, `rutinas`, `ejercicios_rutina`, `objetivos_entrenamiento` y `progresos_clientes`, más la vista `estadisticas_dashboard` con los indicadores globales. Sin `ALTER` sobre tablas existentes y sin seeds nuevos |
| `seeds/001_admin_inicial.sql` | Cuenta administradora inicial (bcrypt cost 10) |
| `seeds/002_tipos_membresia.sql` | Tipos de membresía de ejemplo: mensual (30 días), trimestral (90) y anual (365) |

## Aplicar (orden obligatorio)

```bash
mysql -u root -p -e "CREATE DATABASE gymaccess CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p gymaccess < migrations/001_initial.sql
mysql -u root -p gymaccess < migrations/002_sprint2.sql
mysql -u root -p gymaccess < migrations/003_sprint3.sql
mysql -u root -p gymaccess < seeds/001_admin_inicial.sql
mysql -u root -p gymaccess < seeds/002_tipos_membresia.sql
```

Sobre una base ya existente del Sprint 1, basta con aplicar
`002_sprint2.sql` y `003_sprint3.sql` (más sus seeds correspondientes).
La migración 003 usa `CREATE TABLE IF NOT EXISTS` y `CREATE OR REPLACE
VIEW`, por lo que se puede aplicar sin riesgo sobre la base vigente.

## Seed administrador

- El SQL usa un hash precalkulado de la contraseña por defecto `Admin1234`
  (igual a `ADMIN_CONTRASENA` en `.env.example`) y `INSERT IGNORE`: nunca
  sobrescribe una cuenta existente.
- Para usar credenciales definidas por variables de entorno (recomendado):

  ```bash
  cd backend
  cp .env.example .env   # completar ADMIN_* y DB_*
  npm run db:seed-admin
  ```

## Reglas

- Consultas siempre parametrizadas (`?`); nunca interpolación de valores.
- No hay operaciones de borrado físico: la gestión usa estados
  (`usuarios.estado`, `clientes` se conservan). Ver FR-014.
- **Excepción única**: la tabla `rostros` sí se borra físicamente cuando el
  cliente se da de baja o pasa a inactivo (FR-022 / research R-27); la
  prohibición de DELETE aplica a `pagos`, `accesos` y `auditoria`.
- `pagos.metodo` solo admite `efectivo` en este sprint (research R-18) y
  `pagos.membresia_id` es obligatorio (FR-007).
- `accesos.motivo_rechazo` es obligatorio cuando `resultado = 'rechazado'`
  (se valida en el servidor, no en la base de datos).
- Sprint 3: las tablas de entrenamiento **tampoco se borran**:
  `entrenadores` pasan a `estado = 'inactivo'`, `asignaciones_entrenador`
  se cierran con `fecha_fin` (una sola vigente por cliente, garantizada en
  transacción) y `rutinas` pasan a `archivada` cuando surge otra activa
  para el mismo cliente.
- La vista `estadisticas_dashboard` es de solo lectura y la consulta
  únicamente el backend (`dashboard.model`); el frontend nunca la invoca
  directamente (FR-018/FR-019, Principio II).
- Migraciones versionadas en orden: `NNN_nombre.sql`; no editar un archivo
  ya aplicado, crear una nueva migración.
