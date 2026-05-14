from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.tickets         import router as tickets_router
from app.api.inventario      import router as inventario_router
from app.api.usuarios        import router as usuarios_router
from app.api.mantenimiento   import router as mantenimiento_router
from app.api.backup          import router as backup_router
from app.api.compras         import router as compras_router
from app.api.infraestructura import router as infra_router
from app.api.telefonia       import router as telefonia_router
from app.api.sedes           import router as sedes_router
from app.api.notificaciones  import router as notif_router
from app.api.reportes        import router as reportes_router

app = FastAPI(
    title="QHELP DESK ERP – GOV TECH PRO",
    version="1.0.0",
    description="Sistema de Mesa de Ayuda para entidades públicas",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets_router,      prefix="/api/v1/tickets",          tags=["Tickets"])
app.include_router(inventario_router,   prefix="/api/v1/inventario",       tags=["Inventario TI"])
app.include_router(usuarios_router,     prefix="/api/v1/usuarios",         tags=["Usuarios"])
app.include_router(mantenimiento_router,prefix="/api/v1/mantenimiento",    tags=["Mantenimiento"])
app.include_router(backup_router,       prefix="/api/v1/backup",           tags=["Backup"])
app.include_router(compras_router,      prefix="/api/v1/compras",          tags=["Compras TI"])
app.include_router(infra_router,        prefix="/api/v1/infraestructura",  tags=["Infraestructura"])
app.include_router(telefonia_router,    prefix="/api/v1/telefonia",        tags=["Telefonía"])
app.include_router(sedes_router,        prefix="/api/v1/sedes",            tags=["Sedes"])
app.include_router(notif_router,        prefix="/api/v1/notificaciones",   tags=["Notificaciones"])
app.include_router(reportes_router,     prefix="/api/v1/reportes",         tags=["Reportes"])

@app.get("/health")
def health():
    return {"status": "ok", "version": settings.VERSION}
