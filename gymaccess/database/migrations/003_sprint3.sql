-- =====================================================================
-- Migración 003: Sprint 3 — entrenadores, asignaciones, rutinas,
-- objetivos, progresos y vista del dashboard
-- Sistema de Gestión para Gimnasio
-- Reglas: motor InnoDB, codificación utf8mb4, claves primarias y
-- foráneas, consultas desde la aplicación siempre parametrizadas y
-- sin operaciones de borrado (FR-010, FR-025).
-- Sin ALTER sobre tablas existentes ni seeds nuevos (research R-36).
-- Data model: specs/003-entrenadores-rutinas-dashboard/data-model.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tablas nuevas del Sprint 3
-- ---------------------------------------------------------------------

-- Perfil profesional del personal de coaching (R-28). El usuario debe
-- existir con rol 'entrenador' y estado 'activo' (FR-001/FR-002); la
-- baja pasa el perfil a 'inactivo' sin borrar nada (FR-025).
CREATE TABLE IF NOT EXISTS entrenadores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(30) NULL,
  especialidad VARCHAR(120) NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_entrenadores_usuario (usuario_id),
  KEY idx_entrenadores_estado (estado),
  CONSTRAINT fk_entrenadores_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Responsabilidad de seguimiento entre un entrenador y un cliente con
-- historial de vigencias (R-29; clarify Q2): un solo registro 'activa'
-- por cliente; el cierre es manual o automático al reasignar.
CREATE TABLE IF NOT EXISTS asignaciones_entrenador (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  entrenador_id INT UNSIGNED NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NULL,
  estado ENUM('activa','cerrada') NOT NULL DEFAULT 'activa',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_asignaciones_cliente (cliente_id),
  KEY idx_asignaciones_entrenador (entrenador_id),
  KEY idx_asignaciones_estado (estado),
  CONSTRAINT fk_asignaciones_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_asignaciones_entrenador FOREIGN KEY (entrenador_id)
    REFERENCES entrenadores (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plan de entrenamiento de un cliente firmado por un entrenador (R-31);
-- una sola rutina 'activa' por cliente (clarify Q3). Sin DELETE: las
-- rutinas se archivan (FR-010).
CREATE TABLE IF NOT EXISTS rutinas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  entrenador_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  estado ENUM('activa','archivada') NOT NULL DEFAULT 'activa',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rutinas_cliente (cliente_id),
  KEY idx_rutinas_entrenador (entrenador_id),
  KEY idx_rutinas_estado (estado),
  CONSTRAINT fk_rutinas_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_rutinas_entrenador FOREIGN KEY (entrenador_id)
    REFERENCES entrenadores (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Componentes de una rutina, una fila por ejercicio (R-30). La edición
-- de la rutina reemplaza sus filas dentro de la transacción; la rutina
-- misma nunca se elimina.
CREATE TABLE IF NOT EXISTS ejercicios_rutina (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rutina_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  series INT NULL,
  repeticiones INT NULL,
  instrucciones TEXT NULL,
  orden INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_ejercicios_rutina (rutina_id),
  CONSTRAINT fk_ejercicios_rutina FOREIGN KEY (rutina_id)
    REFERENCES rutinas (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Meta definida para un cliente (R-32). Marcarla como cumplida no
-- altera ni elimina sus progresos (FR-013); sin DELETE.
CREATE TABLE IF NOT EXISTS objetivos_entrenamiento (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  meta VARCHAR(255) NULL,
  fecha_limite DATE NULL,
  estado ENUM('en curso','cumplido') NOT NULL DEFAULT 'en curso',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_objetivos_cliente (cliente_id),
  KEY idx_objetivos_estado (estado),
  CONSTRAINT fk_objetivos_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro fechado de un avance del cliente (R-32); historial
-- 'append-only': se puede modificar, nunca borrar (FR-012, FR-025).
-- La FK SET NULL conserva el progreso si el objetivo se retira.
CREATE TABLE IF NOT EXISTS progresos_clientes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  objetivo_id INT UNSIGNED NULL,
  fecha DATE NOT NULL,
  peso DECIMAL(5,2) NULL,
  medidas VARCHAR(255) NULL,
  marca VARCHAR(255) NULL,
  comentario VARCHAR(255) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_progresos_cliente (cliente_id),
  KEY idx_progresos_objetivo (objetivo_id),
  KEY idx_progresos_fecha (fecha),
  CONSTRAINT fk_progresos_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_progresos_objetivo FOREIGN KEY (objetivo_id)
    REFERENCES objetivos_entrenamiento (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Vista de indicadores globales (R-33)
-- ---------------------------------------------------------------------

-- Vista de solo lectura con los indicadores del momento. Los indicadores
-- con periodo (ingresos, accesos y progresos recientes) se calculan con
-- consultas parametrizadas en dashboard.model; el frontend nunca la
-- consulta directamente (FR-018/FR-019, Principio II).
CREATE OR REPLACE VIEW estadisticas_dashboard AS
SELECT
  (SELECT COUNT(*) FROM clientes) AS clientes_total,
  (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') AS clientes_activos,
  (SELECT COUNT(*) FROM membresias WHERE estado = 'activa')
    AS membresias_activas,
  (SELECT COUNT(*) FROM membresias WHERE estado = 'vencida')
    AS membresias_vencidas,
  (SELECT COUNT(*) FROM entrenadores WHERE estado = 'activo')
    AS entrenadores_activos,
  (SELECT COUNT(DISTINCT cliente_id) FROM asignaciones_entrenador
    WHERE estado = 'activa') AS clientes_con_entrenador,
  (SELECT COUNT(*) FROM rutinas WHERE estado = 'activa')
    AS rutinas_activas,
  (SELECT COUNT(*) FROM objetivos_entrenamiento WHERE estado = 'en curso')
    AS objetivos_en_curso,
  (SELECT COUNT(*) FROM objetivos_entrenamiento WHERE estado = 'cumplido')
    AS objetivos_cumplidos;
