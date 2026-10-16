-- =====================================================================
-- Migración 001: estructura inicial del Sprint 1
-- Sistema de Gestión para Gimnasio
-- Reglas: motor InnoDB, codificación utf8mb4, claves primarias y
-- foráneas, eliminación física prohibida a nivel de aplicación.
-- Data model: specs/001-sprint1-auth-clientes/data-model.md
-- =====================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol ENUM('administrador','recepcionista','entrenador','cliente') NOT NULL,
  estado ENUM('activo','deshabilitado') NOT NULL DEFAULT 'activo',
  intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clientes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre_completo VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NULL,
  correo VARCHAR(150) NULL,
  notas TEXT NULL,
  usuario_id INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_clientes_nombre (nombre_completo),
  KEY idx_clientes_telefono (telefono),
  KEY idx_clientes_correo (correo),
  CONSTRAINT fk_clientes_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura inicial (funcionalidad en sprint posterior) -------

CREATE TABLE IF NOT EXISTS tipos_membresia (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  duracion_dias INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS membresias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  tipo_membresia_id INT UNSIGNED NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado ENUM('activa','vencida','suspendida','cancelada') NOT NULL
    DEFAULT 'activa',
  PRIMARY KEY (id),
  KEY idx_membresias_cliente (cliente_id),
  CONSTRAINT fk_membresias_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id),
  CONSTRAINT fk_membresias_tipo FOREIGN KEY (tipo_membresia_id)
    REFERENCES tipos_membresia (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  membresia_id INT UNSIGNED NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metodo VARCHAR(30) NULL,
  PRIMARY KEY (id),
  KEY idx_pagos_cliente (cliente_id),
  CONSTRAINT fk_pagos_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id),
  CONSTRAINT fk_pagos_membresia FOREIGN KEY (membresia_id)
    REFERENCES membresias (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
