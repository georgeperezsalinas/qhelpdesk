# Sistema de Mesa de Ayuda – Oficina de Sistemas
## Sector Público

Sistema integral para la gestión de soporte técnico, inventario TI, infraestructura,
mantenimiento, backup, compras y telefonía de una entidad pública.

### Stack tecnológico
- **Backend:** Python 3.11 + FastAPI + SQLAlchemy
- **Frontend:** React 18 + Vite + Ant Design
- **Base de datos:** PostgreSQL (principal) · SQL Server / Oracle (legacy) · Redis · MongoDB
- **Infraestructura:** Docker + Nginx (on-premise o nube pública)

### Levantar en desarrollo
```bash
# Backend
cd backend 
pyenv local 3.12.12
python --version

pip install -r requirements.txt
uvicorn app.main:app --reload

#Tablas iniciales
alembic revision --autogenerate -m "tablas iniciales"
alembic upgrade head

#Usuarios

python -m app.core.init_db
----------------------------
Usuario Contraseña Rol
admin Admin2024* Jefe de área
tecnico1 Tecnico2024* Especialista
mesa1 Mesa2024* Mesa de ayuda
usuario1 Usuario2024* Usuario final

# Frontend
cd frontend && npm install && npm run dev
```

### Módulos
| Módulo | Descripción |
|--------|-------------|
| Tickets | Registro, asignación, SLA, escalado |
| Inventario TI | Equipos, licencias, depreciación |
| Usuarios y accesos | AD/LDAP, permisos, correo |
| Mantenimiento | Preventivo y correctivo |
| Backup | Jobs, verificación, restauración |
| Compras TI | Solicitudes, aprobación, renovación |
| Infraestructura | Servidores, datacenter, seguridad |
| Telefonía | Central, celulares directivos |
