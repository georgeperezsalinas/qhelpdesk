#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "No existe $ENV_FILE. Crea el archivo desde .env.example y completa los datos."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DB_NAME="${QHELPDESK_DB_NAME:-helpdesk}"
DB_USER="${QHELPDESK_DB_USER:-helpdesk}"
DB_PASSWORD="${QHELPDESK_DB_PASSWORD:-}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-siscont_db}"
POSTGRES_ADMIN_USER="${POSTGRES_ADMIN_USER:-postgres}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-$ROOT_DIR}"

if [ -z "$DB_PASSWORD" ]; then
  echo "Falta QHELPDESK_DB_PASSWORD en $ENV_FILE."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "No se encontro docker compose ni docker-compose."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -Fxq "$POSTGRES_CONTAINER"; then
  echo "No se encontro el contenedor PostgreSQL en ejecucion: $POSTGRES_CONTAINER"
  echo "Ajusta POSTGRES_CONTAINER en $ENV_FILE."
  exit 1
fi

echo "Creando rol/base si no existen..."
docker exec \
  "$POSTGRES_CONTAINER" \
  psql -v ON_ERROR_STOP=1 \
    -v db_user="$DB_USER" \
    -v db_password="$DB_PASSWORD" \
    -U "$POSTGRES_ADMIN_USER" \
    -d postgres <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user')\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_password')\gexec
SQL

docker exec \
  "$POSTGRES_CONTAINER" \
  psql -v ON_ERROR_STOP=1 \
    -v db_name="$DB_NAME" \
    -v db_user="$DB_USER" \
    -U "$POSTGRES_ADMIN_USER" \
    -d postgres <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = :'db_name'
)\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'db_name', :'db_user')\gexec
SQL

docker exec \
  "$POSTGRES_CONTAINER" \
  psql -v ON_ERROR_STOP=1 \
    -v db_name="$DB_NAME" \
    -v db_user="$DB_USER" \
    -U "$POSTGRES_ADMIN_USER" \
    -d "$DB_NAME" <<'SQL'
GRANT ALL PRIVILEGES ON DATABASE :"db_name" TO :"db_user";
GRANT ALL ON SCHEMA public TO :"db_user";
ALTER SCHEMA public OWNER TO :"db_user";
SQL

echo "Construyendo imagen del API..."
(
  cd "$COMPOSE_PROJECT_DIR"
  "${COMPOSE[@]}" build api
)

echo "Aplicando migraciones Alembic..."
(
  cd "$COMPOSE_PROJECT_DIR"
  "${COMPOSE[@]}" run --rm api alembic upgrade head
)

echo "Creando usuarios iniciales..."
(
  cd "$COMPOSE_PROJECT_DIR"
  "${COMPOSE[@]}" run --rm api python -m app.core.init_db
)

echo "Base de datos lista: $DB_NAME"
