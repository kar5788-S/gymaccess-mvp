// T026 [US3] Modelo de rutinas y sus ejercicios: consultas parametrizadas
// (FR-021) y sin borrado físico de rutinas (FR-010). La edición reemplaza
// los ejercicios dentro de la transacción (R-30): es una operación interna
// sobre el plan, la rutina misma nunca se elimina.

import { consultar, ejecutar, consultarCon, ejecutarCon } from '../config/db.js';

const SELECT_CON_NOMBRES = `
  SELECT r.id, r.cliente_id, r.entrenador_id, r.nombre, r.estado,
         c.nombre_completo AS cliente, e.nombre AS entrenador
    FROM rutinas r
    JOIN clientes c ON c.id = r.cliente_id
    JOIN entrenadores e ON e.id = r.entrenador_id`;

export async function crear(
  { cliente_id, entrenador_id, nombre, estado = 'activa' },
  conexion = null
) {
  const resultado = await ejecutarCon(
    conexion,
    `INSERT INTO rutinas (cliente_id, entrenador_id, nombre, estado)
     VALUES (?, ?, ?, ?)`,
    [cliente_id, entrenador_id, nombre, estado]
  );
  return resultado.insertId;
}

export async function listar({ cliente_id, entrenador_id, estado, cliente_ids } = {}) {
  const condiciones = [];
  const params = [];
  if (cliente_id !== undefined) {
    condiciones.push('r.cliente_id = ?');
    params.push(cliente_id);
  }
  if (entrenador_id !== undefined) {
    condiciones.push('r.entrenador_id = ?');
    params.push(entrenador_id);
  }
  if (estado !== undefined) {
    condiciones.push('r.estado = ?');
    params.push(estado);
  }
  if (cliente_ids !== undefined) {
    if (cliente_ids.length === 0) return []; // carga vacía: sin rutinas
    condiciones.push(`r.cliente_id IN (${cliente_ids.map(() => '?').join(', ')})`);
    params.push(...cliente_ids);
  }
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  return consultar(
    `${SELECT_CON_NOMBRES}
     ${where}
      ORDER BY r.id DESC`,
    params
  );
}

export async function findById(id) {
  const filas = await consultar(
    `${SELECT_CON_NOMBRES}
      WHERE r.id = ?
      LIMIT 1`,
    [id]
  );
  return filas[0] ?? null;
}

export async function findEjerciciosPorRutina(rutinaId) {
  return consultar(
    `SELECT id, nombre, series, repeticiones, instrucciones, orden
       FROM ejercicios_rutina
      WHERE rutina_id = ?
      ORDER BY orden`,
    [rutinaId]
  );
}

export async function contarEjercicios(rutinaId) {
  const filas = await consultar(
    `SELECT COUNT(*) AS total FROM ejercicios_rutina WHERE rutina_id = ?`,
    [rutinaId]
  );
  return filas[0].total;
}

export async function actualizar(id, campos, conexion = null) {
  const permitidos = ['nombre', 'estado'];
  const entradas = Object.entries(campos).filter(([c]) => permitidos.includes(c));
  if (entradas.length === 0) return false;
  const columnas = entradas.map(([c]) => `${c} = ?`);
  const valores = entradas.map(([, v]) => v);
  const resultado = await ejecutarCon(
    conexion,
    `UPDATE rutinas SET ${columnas.join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return resultado.affectedRows > 0;
}

// Reemplazo atómico de la lista de ejercicios dentro de la transacción
// (R-30): se borran y reinsertan sus filas con `orden` consecutivo.
export async function reemplazarEjercicios(rutinaId, ejercicios, conexion = null) {
  await ejecutarCon(conexion, `DELETE FROM ejercicios_rutina WHERE rutina_id = ?`, [
    rutinaId,
  ]);
  let insertados = 0;
  for (const [indice, ejercicio] of ejercicios.entries()) {
    await ejecutarCon(
      conexion,
      `INSERT INTO ejercicios_rutina
         (rutina_id, nombre, series, repeticiones, instrucciones, orden)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        rutinaId,
        ejercicio.nombre,
        ejercicio.series ?? null,
        ejercicio.repeticiones ?? null,
        ejercicio.instrucciones ?? null,
        indice + 1,
      ]
    );
    insertados += 1;
  }
  return insertados;
}

// Archiva las rutinas activas del cliente (todas, o todas salvo `exceptoId`).
export async function archivarActivasDeCliente(clienteId, exceptoId = null, conexion = null) {
  const params = exceptoId === null ? [clienteId] : [clienteId, exceptoId];
  const excluyeExcepto = exceptoId === null ? '' : ' AND id <> ?';
  const resultado = await ejecutarCon(
    conexion,
    `UPDATE rutinas SET estado = 'archivada'
      WHERE cliente_id = ? AND estado = 'activa'${excluyeExcepto}`,
    params
  );
  return resultado.affectedRows;
}

export async function cambiarEstado(id, nuevoEstado, conexion = null) {
  const resultado = await ejecutarCon(
    conexion,
    `UPDATE rutinas SET estado = ? WHERE id = ?`,
    [nuevoEstado, id]
  );
  return resultado.affectedRows > 0;
}
