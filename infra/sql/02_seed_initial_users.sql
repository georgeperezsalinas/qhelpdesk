-- Ejecutar conectado a la base helpdesk:
-- psql -U helpdesk -d helpdesk -f infra/sql/02_seed_initial_users.sql
--
-- Las contrasenas ya estan hasheadas con bcrypt y corresponden a:
-- admin/Admin2024*, tecnico1/Tecnico2024*, mesa1/Mesa2024*, usuario1/Usuario2024*

INSERT INTO usuarios (
  username,
  email,
  nombre,
  apellido,
  hashed_password,
  rol,
  area,
  activo
) VALUES
  (
    'admin',
    'admin@entidad.gob.pe',
    'Administrador',
    'Sistema',
    '$2b$12$SM7hSym2NS6ckQTd9QkXrepL6fGOV/38BEch3SoB9EhTeyBGZPPaW',
    'jefe',
    'Oficina de Sistemas',
    true
  ),
  (
    'tecnico1',
    'tecnico1@entidad.gob.pe',
    'Tecnico',
    'Uno',
    '$2b$12$1jTL77aHUTLROZDTYAwd3uUUMH87wRYDWDRw9.BfT4SLjqD0fez5O',
    'especialista',
    'Oficina de Sistemas',
    true
  ),
  (
    'mesa1',
    'mesa1@entidad.gob.pe',
    'Mesa',
    'Ayuda',
    '$2b$12$NEx/aLOLdsuz1xx5IIbzf.lOZkfBO0sV7u.9t5Y0h2MApm1ZcCbt6',
    'mesa_ayuda',
    'Oficina de Sistemas',
    true
  ),
  (
    'usuario1',
    'usuario1@entidad.gob.pe',
    'Usuario',
    'Final',
    '$2b$12$yM5RNKeLl2bhbal1vZH9nedQQPUKC7uReC5NgEwRNfEO5SyqIl976',
    'usuario_final',
    'Administracion',
    true
  )
ON CONFLICT (username) DO NOTHING;
