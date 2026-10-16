// T015 [US1] Modelo de usuarios: consultas parametrizadas (FR-013).
// El hash de contraseña jamás se selecciona en listados (FR-012).

import { consultar, ejecutar } from '../config/db.js';

const COLUMNAS_LISTA =
  'id, nombre, email, rol, estado, intentos_fallidos, bloqueado_hasta, creado_en, actualizado_en';

export async function findByEmail(email) {
  const filas = await consultar(
    `SELECT id, nombre, email, contrasena_hash, rol, estado,
            intentos_fallidos, bloqueado_hasta
       FROM usuarios WHERE email = ?`,
    [email]
  );
  return filas[0] ?? null;
}

export async function findById(id) {
  const filas = await consultar(
    `SELECT ${COLUMNAS_LISTA} FROM usuarios WHERE id = ?`,
    [id]
  );
  return filas[0] ?? null;
}

export async function listar() {
  return consultar(`SELECT ${COLUMNAS_LISTA} FROM usuarios ORDER BY id`);
}

export async function crear({ nombre, email, contrasena_hash, rol }) {
  const resultado = await ejecutar(
    `INSERT INTO usuarios (nombre, email, contrasena_hash, rol)
     VALUES (?, ?, ?, ?)`,
    [nombre, email, contrasena_hash, rol]
  );
  return resultado.insertId;
}

export async function actualizar(id, campos) {
  const permitidos = ['nombre', 'email', 'rol', 'estado', 'contrasena_hash'];
  const entradas = Object.entries(campos).filter(([c]) =>
    permitidos.includes(c)
  );
  if (entradas.length === 0) return false;

  const columnas = entradas.map(([c]) => `${c} = ?`);
  const valores = entradas.map(([, v]) => v);
  const resultado = await ejecutar(
    `UPDATE usuarios SET ${columnas.join(', ')} WHERE id = ?`,
    [...valores, id]
  );
  return resultado.affectedRows > 0;
}

// Bloqueo temporal por intentos fallidos (FR-002, R-07).
export async function actualizarIntentos(id, intentos, bloqueadoHasta) {
  const resultado = await ejecutar(
    `UPDATE usuarios
        SET intentos_fallidos = ?, bloqueado_hasta = ?
      WHERE id = ?`,
    [intentos, bloqueadoHasta, id]
  );
  return resultado.affectedRows > 0;
}

export async function limpiarBloqueo(id) {
  const resultado = await ejecutar(
    `UPDATE usuarios
        SET intentos_fallidos = 0, bloqueado_hasta = NULL
      WHERE id = ?`,
    [id]
  );
  return resultado.affectedRows > 0;
}
