<!--

Plantilla de insumo para /speckit.specify.

NO lo pongas dentro de specs/ (esa carpeta la genera Spec Kit).

-->

# Insumo de especificación - Sprint 3: Entrenadores, rutinas y dashboard administrativo

> **Referencias obligatorias para el agente:**
>
> * Contexto maestro: `docs/project-context.md`
> * Constitución: `docs/reglas.md` (y `.specify/memory/constitution.md` una vez ratificada)
> * Sprint 1: `docs/sprint-1.md`
> * Sprint 2: `docs/sprint-2.md`
> * Este documento describe únicamente el alcance de este sprint.

## 1. Contexto del sprint

Este sprint centrará la operación del gimnasio en la parte de coaching y seguimiento deportivo. Se implementará la gestión de entrenadores, la asignación de clientes a entrenadores, la creación y administración de rutinas de entrenamiento, el seguimiento del progreso y la visualización de un dashboard administrativo con indicadores clave del negocio.

La prioridad del sprint será que el administrador y los entrenadores puedan operar de forma clara y segura sobre los clientes asignados, sin ampliar el alcance a clases masivas, asistencia a sesiones grupales o reportes complejos de operación que se dejarán fuera de este ciclo.

La aplicación mantendrá la arquitectura establecida en los sprints anteriores:

* `frontend/`: aplicación React con JavaScript.
* `backend/`: aplicación Node.js + Express con JavaScript.
* `database/`: scripts, migraciones y semillas de MySQL.

El backend utilizará **ES Modules**, mediante `import` y `export`. No se utilizará CommonJS mediante `require()` o `module.exports`.

El archivo `backend/package.json` deberá mantener:

```json
{
  "type": "module"
}
```

El frontend no tendrá acceso directo a MySQL. Toda comunicación con la base de datos se realizará mediante la API REST del backend.

Este sprint se enfoca en la capa de negocio del entrenamiento y en la gestión operativa del personal responsable del acompañamiento físico de los clientes. El control de acceso y las membresías ya quedaron desarrolladas en el Sprint 2 y no serán revisadas aquí salvo su relación con la asignación de clientes y la visualización del dashboard.

## 2. Objetivo

Implementar la gestión de entrenadores y rutinas de entrenamiento, así como un dashboard administrativo que permita al administrador supervisar de forma rápida el estado de clientes, entrenadores y progreso del gimnasio sin ampliar el alcance a procesos de clases o asistencia compleja.

## 3. Historias de usuario del sprint

### US-S3-01 — Registro de entrenadores

Como administrador, quiero registrar a los entrenadores del gimnasio para definir quiénes estarán a cargo del acompañamiento de los clientes.

### US-S3-02 — Asignación de entrenador a cliente

Como administrador o recepcionista, quiero asignar un entrenador a un cliente para establecer la responsabilidad del seguimiento físico y de entrenamiento.

### US-S3-03 — Creación de rutinas de entrenamiento

Como entrenador, quiero crear rutinas personalizadas para los clientes asignados para orientar su plan de entrenamiento.

### US-S3-04 — Registro de objetivos y progresos

Como entrenador, quiero registrar objetivos y avances del cliente para seguir su evolución de forma ordenada y medible.

### US-S3-05 — Consulta de rutina y progreso

Como cliente, quiero consultar mi rutina y mi progreso para conocer mi evolución y mantenerme motivado.

### US-S3-06 — Dashboard administrativo

Como administrador, quiero ver un resumen de clientes activos, entrenadores asignados, progreso general y rendimiento del gimnasio para tomar decisiones operativas.

### US-S3-07 — Consulta del personal asignado

Como administrador o recepcionista, quiero consultar los clientes asignados a cada entrenador para organizar la carga de trabajo del equipo.

## 4. Flujo demostrable al cierre del sprint

1. El administrador registra los entrenadores del gimnasio.
2. El administrador o recepcionista asigna un entrenador a un cliente activo.
3. El entrenador crea una rutina con ejercicios, series, repeticiones o instrucciones.
4. El entrenador define objetivos y registra el progreso del cliente.
5. El cliente consulta su rutina y su evolución desde la aplicación.
6. El administrador accede al dashboard para revisar indicadores clave del gimnasio.
7. El sistema presenta la información de acuerdo con el rol del usuario autenticado.

## 5. Entidades y tablas que toca este sprint

| Tabla                         | Operaciones principales                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `usuarios`                    | Consultar y validar permisos                                 |
| `clientes`                    | Consultar y relacionar con entrenador y progreso             |
| `entrenadores`                | Crear, consultar y modificar                                  |
| `rutinas`                     | Crear, consultar y modificar                                  |
| `ejercicios_rutina`           | Crear, consultar y modificar                                  |
| `objetivos_entrenamiento`     | Crear, consultar y modificar                                  |
| `progresos_clientes`          | Crear, consultar y modificar                                  |
| `asignaciones_entrenador`     | Crear, consultar y modificar                                  |
| `estadisticas_dashboard`     | Consultar y resumir datos operativos                          |
| `auditoria`                   | Según las acciones de auditoría definidas para el sistema     |

Las tablas `usuarios`, `clientes`, `membresias` y `accesos` serán reutilizadas a partir de la información creada en los Sprints 1 y 2.

La tabla `entrenadores` deberá relacionarse con el usuario del sistema y con los clientes asignados.

La información de `rutinas`, `ejercicios_rutina`, `objetivos_entrenamiento` y `progresos_clientes` deberá mantenerse histórica para poder evaluar evolución y cumplimiento.

El dashboard administrativo se alimentará principalmente de consultas y agregados sobre clientes, entrenadores y progresos, sin requerir almacenamiento adicional complejo más allá de vistas o consultas consolidadas.

La tabla `auditoria` se utilizará de acuerdo con las reglas establecidas en `docs/project-context.md` y `docs/reglas.md`.

## 6. Reglas de negocio aplicables

* Un entrenador debe estar asociado a un usuario del sistema válido.
* Un cliente puede tener un solo entrenador principal asignado en el periodo activo de seguimiento.
* La rutina debe estar asociada a un cliente y a un entrenador válidos.
* Un cliente solo podrá consultar su propia rutina y su propio progreso.
* Un entrenador solo podrá gestionar los clientes asignados a su carga.
* El administrador puede ver el resumen general del gimnasio y los indicadores del dashboard.
* El recepcionista puede consultar información de asignación y estado general del personal, pero no puede editar rutinas ni progresos médicos o deportivos.
* Las metas y el progreso del cliente deben conservar historial para comparar evolución en el tiempo.
* El dashboard debe mostrar información resumida y segura, sin exponer datos sensibles de clientes no autorizados.
* Los indicadores del dashboard deben filtrarse por rol y permisos del usuario autenticado.
* La auditoría debe registrar cambios relevantes en la asignación del entrenador, creación de rutinas y actualizaciones de progreso.
* La información del entrenamiento solo se utilizará para seguimiento del cliente y apoyo operativo del gimnasio.

## 7. Criterios de aceptación

Los criterios utilizan los patrones EARS **Event-driven** (`CUANDO ... EL
SISTEMA DEBE ...`) y **Unwanted behavior** (`SI ... ENTONCES EL SISTEMA DEBE
...`).

### 7.1 Clientes y asignación

* **Event-driven**: CUANDO el administrador o el recepcionista asigna un
  entrenador a un cliente activo y a un entrenador válido, EL SISTEMA DEBE
  registrar la asignación con su fecha y mostrar al cliente en la carga del
  entrenador.
* **Event-driven**: CUANDO se asigna un entrenador diferente a un cliente con
  una asignación vigente, EL SISTEMA DEBE cerrar la asignación anterior con su
  fecha de fin, conservarla como historial y dejar vigente únicamente la nueva.
* **Event-driven**: CUANDO el administrador o el recepcionista consulta los
  clientes asignados a un entrenador, EL SISTEMA DEBE mostrar su carga actual.
* **Unwanted behavior**: SI se intenta asignar un entrenador a un cliente
  inexistente o inactivo, ENTONCES EL SISTEMA DEBE rechazar la operación sin
  registrar la asignación.
* **Unwanted behavior**: SI se intenta asignar un usuario inexistente, inactivo
  o sin perfil de entrenador válido, ENTONCES EL SISTEMA DEBE rechazar la
  operación.
* **Unwanted behavior**: SI un entrenador intenta gestionar un cliente que no
  pertenece a su carga vigente, ENTONCES EL SISTEMA DEBE denegar la operación.

### 7.2 Rutinas y progreso

* **Event-driven**: CUANDO un entrenador crea una rutina para un cliente de su
  carga, EL SISTEMA DEBE guardar la rutina con al menos un ejercicio y asociarla
  al cliente y al entrenador.
* **Event-driven**: CUANDO un entrenador registra objetivos o progresos para un
  cliente de su carga, EL SISTEMA DEBE conservarlos en el historial del cliente.
* **Event-driven**: CUANDO un cliente consulta su rutina y evolución, EL SISTEMA
  DEBE mostrar únicamente su rutina activa y sus propios objetivos y progresos.
* **Unwanted behavior**: SI se intenta guardar una rutina sin nombre, sin
  ejercicios o con valores inválidos, ENTONCES EL SISTEMA DEBE rechazarla e
  indicar el dato incorrecto.
* **Unwanted behavior**: SI un cliente intenta consultar la rutina o el progreso
  de otro cliente, ENTONCES EL SISTEMA DEBE denegar la consulta sin exponer
  información ajena.
* **Event-driven**: CUANDO se modifica una rutina o un objetivo, EL SISTEMA
  DEBE conservar los progresos previamente registrados.

### 7.3 Dashboard y accesos

* **Event-driven**: CUANDO el administrador consulta el dashboard, EL SISTEMA
  DEBE mostrar el resumen de clientes activos, entrenadores e intentos de acceso
  recientes autorizados y rechazados.
* **Event-driven**: CUANDO el administrador selecciona un periodo para el
  dashboard, EL SISTEMA DEBE recalcular los indicadores correspondientes,
  incluidos los relacionados con accesos.
* **Unwanted behavior**: SI el recepcionista o el cliente intenta consultar el
  dashboard, ENTONCES EL SISTEMA DEBE denegar la consulta.
* **Event-driven**: CUANDO un entrenador consulta su panel, EL SISTEMA DEBE
  limitar los indicadores a su carga y no mostrar cifras financieras ni
  información sensible de clientes que no esté autorizado a consultar.
* **Unwanted behavior**: SI no existen registros para un indicador de clientes
  o accesos, ENTONCES EL SISTEMA DEBE mostrar cero o un mensaje vacío claro, sin
  producir un error.

## 8. Entregables esperados

* CRUD de entrenadores.
* Asignación de entrenador a cliente.
* CRUD de rutinas, ejercicios y objetivos de entrenamiento.
* Seguimiento de progreso del cliente.
* Dashboard administrativo con indicadores clave.
* Seguridad de permisos y auditoría de cambios relevantes.

## 9. Criterios de cierre del sprint

El sprint se considera completado cuando:

1. El administrador puede registrar y gestionar entrenadores.
2. Los clientes quedan asignados a un entrenador válido.
3. Los entrenadores pueden crear rutinas y registrar objetivos y progreso.
4. Los clientes pueden consultar su rutina y evolución.
5. El administrador cuenta con un dashboard funcional para supervisar la operación del gimnasio.
6. El sistema mantiene seguridad de permisos según el rol del usuario.
7. Se conserva la auditoría para los cambios más relevantes del sprint.
