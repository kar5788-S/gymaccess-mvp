-- =====================================================================
-- Seed 001: cuenta administradora inicial (research.md R-11)
--
-- El hash corresponde a bcrypt (cost 10) de la contraseña por defecto
-- "Admin1234", igual al valor por defecto de ADMIN_CONTRASENA en
-- .env.example. INSERT IGNORE: nunca sobrescribe una cuenta existente.
--
-- Si se usan otras credenciales, genere un hash nuevo desde backend/:
--   node -e "import('bcrypt').then(b=>b.default.hash('SuClave',10).then(console.log))"
-- y reemplace el valor, o ejecute: npm run db:seed-admin
-- =====================================================================

INSERT IGNORE INTO usuarios (nombre, email, contrasena_hash, rol, estado)
VALUES (
  'Administrador',
  'admin@gimnasio.test',
  '$2b$10$BWFsvQ3fM4ezha.g6PMun.wuI5ceeoz24A6dOrYvHr/OeS0ih0rV.',
  'administrador',
  'activo'
);
