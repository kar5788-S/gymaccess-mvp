<!--
Plantilla de insumo para /speckit.specify.
Copia este archivo como docs/sprints/sprint-N-<nombre-corto>.md y completalo.
NO lo pongas dentro de specs/ (esa carpeta la genera Spec Kit).
-->

# Insumo de especificacion - Sprint N: <Titulo del sprint>

> **Referencias obligatorias para el agente:**
> - Contexto maestro: `docs/project-context.md`
> - Constitucion: `docs/reglas.md` (y `.specify/memory/constitution.md` una vez ratificada)
> - Este documento describe unicamente el alcance de este sprint.

## 1. Contexto del sprint

<2-4 lineas explicando por que este sprint va aqui, que resuelve y con que sprints previos se relaciona.>

## 2. Objetivo

<Copiado o derivado de la seccion del sprint en project-context.md. Una sola idea clara.>

## 3. Historias de usuario del sprint

> Formato: "Como [rol], quiero [accion] para [beneficio]".

- **US1** - Como ..., quiero ..., para ...
- **US2** - Como ..., quiero ..., para ...
- **US3** - ...

## 4. Flujo demostrable al cierre del sprint

    Paso 1
    -> Paso 2
    -> Paso 3
    -> Resultado esperado

## 5. Entidades y tablas que toca este sprint

> Basado en la seccion 14.1 de `project-context.md`.

| Entidad / tabla | Accion en este sprint |
|-----------------|-----------------------|
| `users`         | crear / leer / ...    |
| ...             | ...                   |

## 6. Reglas de negocio aplicables

> Listar solo las reglas de la seccion 13 de `project-context.md` que aplican a este sprint, no todas.

- RN-...
- RN-...

## 7. Criterios de aceptacion

- [ ] CA-1 ...
- [ ] CA-2 ...
- [ ] CA-3 ...

## 8. Fuera de alcance de este sprint

> Explicitar para evitar que el agente se disperse.

- ...
- ...

## 9. Decisiones pendientes que deben resolverse en /speckit.clarify

> Cosas que NO deben asumirse sin confirmacion.

- ...
- ...

## 10. Restricciones tecnicas heredadas

> Recordatorios que vienen de la constitucion y aplican a este sprint.

- Backend en **ES Modules**.
- Solo el backend accede a MySQL.
- Permisos validados en backend, no solo en UI.
- Sin secretos en el repo.
- Idioma: espanol (chat, docs, comentarios, pruebas).
