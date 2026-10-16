-- =====================================================================
-- Migración 002: Sprint 2 — reconocimiento facial, control de acceso
-- y auditoría
-- Sistema de Gestión para Gimnasio
-- Reglas: motor InnoDB, codificación utf8mb4, claves primarias y
-- foráneas, consultas desde la aplicación siempre parametrizadas.
-- Data model: specs/002-sprint2-membresias-pagos-acceso-facial/data-model.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cambios en tablas existentes
-- ---------------------------------------------------------------------

-- Clientes: estado para expresar la baja sin borrar la ficha (FR-003,
-- FR-022). La baja/inactivación elimina la información facial asociada
-- (ver `rostros` más abajo); la ficha del cliente nunca se borra.
ALTER TABLE clientes
  ADD COLUMN estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo';

-- Tipos de membresía: descripción y estado (FR-001, FR-002; permite
-- inactivar sin borrar, ya que no existe DELETE de catálogos).
ALTER TABLE tipos_membresia
  ADD COLUMN descripcion VARCHAR(255) NULL AFTER nombre,
  ADD COLUMN estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo';

-- Membresías: precio congelado al momento de asignar (FR-002, FR-009).
-- El backfill evita que las membresías existentes queden en 0.
ALTER TABLE membresias
  ADD COLUMN precio DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE membresias m
  JOIN tipos_membresia t ON t.id = m.tipo_membresia_id
   SET m.precio = t.precio
 WHERE m.precio = 0;

-- Pagos: todo pago se relaciona con una membresía (FR-007) y el método
-- es obligatorio; en este sprint el único valor admitido es 'efectivo'
-- (research R-18, decisión de /speckit.clarify 2026-10-14).
-- En este proyecto las tablas están vacías al aplicar la migración.
UPDATE pagos SET metodo = 'efectivo' WHERE metodo IS NULL OR metodo = '';

ALTER TABLE pagos
  MODIFY membresia_id INT UNSIGNED NOT NULL,
  MODIFY metodo VARCHAR(30) NOT NULL DEFAULT 'efectivo';

-- ---------------------------------------------------------------------
-- 2. Tablas nuevas del Sprint 2
-- ---------------------------------------------------------------------

-- Información facial: una fila por cliente, descriptor de 128 float32
-- serializado en little-endian (512 bytes exactos). Nunca se expone en
-- respuestas de la API (FR-017) y se elimina si el cliente se da de baja
-- (FR-022).
CREATE TABLE IF NOT EXISTS rostros (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  descriptor_facial VARBINARY(512) NOT NULL,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  PRIMARY KEY (id),
  UNIQUE KEY uq_rostros_cliente (cliente_id),
  CONSTRAINT fk_rostros_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Intentos de acceso: autorizados y rechazados; cliente_id NULL cuando
-- el rostro no pudo identificarse. Sin operaciones de borrado (FR-015).
CREATE TABLE IF NOT EXISTS accesos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NULL,
  fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
  hora TIME NOT NULL DEFAULT (CURRENT_TIME),
  resultado ENUM('autorizado','rechazado') NOT NULL,
  motivo_rechazo VARCHAR(100) NULL,
  PRIMARY KEY (id),
  KEY idx_accesos_fecha (fecha),
  KEY idx_accesos_cliente (cliente_id),
  KEY idx_accesos_resultado (resultado),
  CONSTRAINT fk_accesos_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auditoría de acciones críticas (FR-020); descripcion TEXT sin datos
-- biométricos ni sensibles (research R-22).
CREATE TABLE IF NOT EXISTS auditoria (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NULL,
  accion VARCHAR(50) NOT NULL,
  modulo VARCHAR(30) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resultado VARCHAR(20) NOT NULL,
  descripcion TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_auditoria_fecha (fecha),
  KEY idx_auditoria_usuario (usuario_id),
  KEY idx_auditoria_modulo (modulo),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
