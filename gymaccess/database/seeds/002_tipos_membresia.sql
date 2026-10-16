-- =====================================================================
-- Seed 002: tipos de membresía de ejemplo para el Sprint 2
-- Sistema de Gestión para Gimnasio
-- Idempotente: solo inserta los planes que aún no existen por nombre.
-- Data model: specs/002-sprint2-membresias-pagos-acceso-facial/data-model.md
-- =====================================================================

INSERT INTO tipos_membresia (nombre, descripcion, duracion_dias, precio, estado)
SELECT 'Mensual', 'Acceso al gimnasio por 30 días', 30, 150.00, 'activo'
WHERE NOT EXISTS (SELECT 1 FROM tipos_membresia WHERE nombre = 'Mensual');

INSERT INTO tipos_membresia (nombre, descripcion, duracion_dias, precio, estado)
SELECT 'Trimestral', 'Acceso al gimnasio por 90 días', 90, 400.00, 'activo'
WHERE NOT EXISTS (SELECT 1 FROM tipos_membresia WHERE nombre = 'Trimestral');

INSERT INTO tipos_membresia (nombre, descripcion, duracion_dias, precio, estado)
SELECT 'Anual', 'Acceso al gimnasio por 365 días', 365, 1400.00, 'activo'
WHERE NOT EXISTS (SELECT 1 FROM tipos_membresia WHERE nombre = 'Anual');
