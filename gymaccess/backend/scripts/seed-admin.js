// Seed de la cuenta administradora desde variables de entorno (R-11).
// Uso (desde backend/): npm run db:seed-admin
// Crea la cuenta solo si el correo no existe; nunca pisa cambios.

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';

const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
const email = process.env.ADMIN_EMAIL || 'admin@gimnasio.test';
const contrasena = process.env.ADMIN_CONTRASENA || 'Admin1234';

async function main() {
  const [existentes] = await pool.execute(
    'SELECT id FROM usuarios WHERE email = ?',
    [email]
  );

  if (existentes.length > 0) {
    console.log(`Ya existe la cuenta administradora: ${email}`);
    return;
  }

  const hash = await bcrypt.hash(contrasena, 10);
  await pool.execute(
    'INSERT INTO usuarios (nombre, email, contrasena_hash, rol, estado) VALUES (?, ?, ?, ?, ?)',
    [nombre, email, hash, 'administrador', 'activo']
  );
  console.log(`Cuenta administradora creada: ${email}`);
}

main()
  .catch((error) => {
    console.error('No se pudo aplicar el seed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
