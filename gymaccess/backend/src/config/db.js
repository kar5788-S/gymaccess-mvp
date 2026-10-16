// Pool de conexiones a MySQL local (research.md R-10).
// TODAS las consultas deben usar parámetros (?), nunca interpolación
// de valores (FR-013, constitución Principio V).

import mysql from 'mysql2/promise';

const opciones = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NOMBRE || 'gym_system',
  user: process.env.DB_USUARIO || 'root',
  password: process.env.DB_CONTRASENA || '',
  waitForConnections: true,
  connectionLimit: 10,
};

export const pool = mysql.createPool(opciones);

export async function consultar(sql, params = []) {
  const [filas] = await pool.query(sql, params);
  return filas;
}

export async function ejecutar(sql, params = []) {
  const [resultado] = await pool.execute(sql, params);
  return resultado;
}

// T006 [Sprint 3] Variantes que reciben una conexión de transacción
// (utils/transaccion.js). Sin conexión usan el pool compartido, igual
// que las funciones de arriba. Parámetros siempre: jamás interpolación.
export async function consultarCon(conexion, sql, params = []) {
  if (!conexion) return consultar(sql, params);
  const [filas] = await conexion.query(sql, params);
  return filas;
}

export async function ejecutarCon(conexion, sql, params = []) {
  if (!conexion) return ejecutar(sql, params);
  const [resultado] = await conexion.execute(sql, params);
  return resultado;
}
