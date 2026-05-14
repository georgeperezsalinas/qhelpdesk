#!/bin/bash
# setup_db.sh – Inicializa la BD completa del sistema QHELP DESK ERP
set -e

echo ""
echo "=================================================="
echo "  QHELP DESK ERP – Inicialización de Base de Datos"
echo "=================================================="
echo ""

# Verificar que el venv esté activo
if [ -z "$VIRTUAL_ENV" ]; then
  echo "⚠️  Activa el entorno virtual primero:"
  echo "     source .venv/bin/activate"
  exit 1
fi

echo "1️⃣  Generando migración..."
alembic revision --autogenerate -m "estructura_inicial_completa"

echo ""
echo "2️⃣  Aplicando migración a la base de datos..."
alembic upgrade head

echo ""
echo "3️⃣  Cargando datos iniciales..."
python -m app.core.seed_data

echo ""
echo "=================================================="
echo "  ✅  Base de datos lista para desarrollo"
echo "=================================================="
echo ""
echo "  Usuarios de prueba:"
echo "  ┌─────────────────────┬──────────────────┬─────────────────────┐"
echo "  │ Usuario             │ Contraseña       │ Rol                 │"
echo "  ├─────────────────────┼──────────────────┼─────────────────────┤"
echo "  │ director            │ Director2024*    │ Alta Dirección      │"
echo "  │ jefesistemas        │ Jefe2024*        │ Jefe de área        │"
echo "  │ esp_redes           │ Esp2024*         │ Especialista        │"
echo "  │ esp_servidores      │ Esp2024*         │ Especialista        │"
echo "  │ mesa1               │ Mesa2024*        │ Mesa de ayuda       │"
echo "  │ ufin_adm            │ User2024*        │ Usuario final       │"
echo "  │ uext_norte          │ Ext2024*         │ Usuario externo     │"
echo "  └─────────────────────┴──────────────────┴─────────────────────┘"
echo ""
