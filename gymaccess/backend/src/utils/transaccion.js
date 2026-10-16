// T006 [Foundational] Transacciones para operaciones atómicas (R-29, R-31):
// el cierre de la asignación vigente con la inserción de la nueva, y el
// archivado de la rutina activa con la creación o reactivación de la nueva.
//
// Uso: conTransaccion(async (conexion) => { ... }); la conexión recibe
// begin/commit/rollback gestionados y se libera siempre. Los modelos
// reciben esa conexión como último parámetro opcional; sin ella usan el
// pool compartido (consultas sueltas).
//
// Los errores NO se traducen aquí: viajan tal cual al manejador central,
// que jamás expone detalle interno (FR-002, Principio V).

import { pool } from '../config/db.js';

export async function conTransaccion(operacion) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await operacion(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    try {
      await conexion.rollback();
    } catch {
      // El rollback puede fallar si la conexión cayó; el error original
      // es el que importa y ya se propagará.
    }
    throw error;
  } finally {
    conexion.release();
  }
}
