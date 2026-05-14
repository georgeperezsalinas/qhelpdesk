# Inicializacion directa por SQL

Estos archivos permiten crear la base de datos sin ejecutar Alembic desde la app.

Orden recomendado:

```bash
docker cp infra/sql/00_create_database.sql siscont_db:/tmp/00_create_database.sql
docker exec -it siscont_db psql -U postgres -d postgres -f /tmp/00_create_database.sql

docker cp infra/sql/01_schema.sql siscont_db:/tmp/01_schema.sql
docker exec -it siscont_db psql -U helpdesk -d helpdesk -f /tmp/01_schema.sql

docker cp infra/sql/02_seed_initial_users.sql siscont_db:/tmp/02_seed_initial_users.sql
docker exec -it siscont_db psql -U helpdesk -d helpdesk -f /tmp/02_seed_initial_users.sql
```

Antes de ejecutar `00_create_database.sql`, cambia:

- `app_db_name`
- `app_db_user`
- `app_db_password`

`01_schema.sql` fue generado desde Alembic:

```bash
cd backend
DATABASE_URL=postgresql://helpdesk:helpdesk@localhost:5432/helpdesk .venv/bin/alembic upgrade head --sql > ../infra/sql/01_schema.sql
```

Si cambian los modelos o migraciones, vuelve a regenerar `01_schema.sql`.
