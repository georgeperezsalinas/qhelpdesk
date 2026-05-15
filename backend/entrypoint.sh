#!/bin/sh
set -e

echo "[entrypoint] Esperando base de datos..."
python - <<'EOF'
import time, sys
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
for i in range(30):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[entrypoint] Base de datos lista.")
        sys.exit(0)
    except Exception as e:
        print(f"[entrypoint] Intento {i+1}/30: {e}")
        time.sleep(2)

print("[entrypoint] ERROR: La base de datos no respondió en 60s.")
sys.exit(1)
EOF

echo "[entrypoint] Ejecutando migraciones..."
alembic upgrade head

echo "[entrypoint] Creando usuarios iniciales..."
python -m app.core.init_db

echo "[entrypoint] Iniciando API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
