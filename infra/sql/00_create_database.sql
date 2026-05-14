-- Ejecutar conectado a la base administrativa postgres:
-- psql -U postgres -d postgres -f infra/sql/00_create_database.sql
--
-- Ajusta usuario, password y nombre de base antes de ejecutar.
-- CREATE DATABASE no puede ejecutarse dentro de un bloque DO, por eso este
-- archivo usa comandos psql (\gexec).

\set app_db_name 'helpdesk'
\set app_db_user 'helpdesk'
\set app_db_password 'change_this_database_password'

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_db_user', :'app_db_password')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'app_db_user'
)\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'app_db_user', :'app_db_password')\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'app_db_name', :'app_db_user')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = :'app_db_name'
)\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'app_db_name', :'app_db_user')\gexec
