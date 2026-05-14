#!/bin/bash
# Script de backup de base de datos PostgreSQL
FECHA=$(date +%Y%m%d_%H%M%S)
DESTINO="/backups/db"
mkdir -p $DESTINO

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > "$DESTINO/helpdesk_$FECHA.sql.gz"

# Mantener solo los últimos 30 días
find $DESTINO -name "*.sql.gz" -mtime +30 -delete
echo "Backup completado: helpdesk_$FECHA.sql.gz"
