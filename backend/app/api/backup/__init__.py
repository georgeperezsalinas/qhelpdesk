from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.backup import EstadoBackup
from app.models.usuario import Usuario, RolUsuario
from app.schemas.backup import (
    PoliticaCreate, PoliticaUpdate, PoliticaRead,
    EjecucionRead, VerificacionRequest, DashboardBackup,
)
from app.services.backup_service import BackupService

router = APIRouter()
ROLES_TI = [RolUsuario.jefe, RolUsuario.especialista]

@router.get("/dashboard", response_model=DashboardBackup)
def dashboard(db: Session = Depends(get_db),
              _: Usuario = Depends(require_roles(*ROLES_TI, RolUsuario.mesa_ayuda))):
    return BackupService(db).dashboard()

# ── POLÍTICAS ─────────────────────────────────────────────────────────────────
@router.get("/politicas", response_model=List[PoliticaRead])
def listar_politicas(
    activa: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI, RolUsuario.mesa_ayuda)),
):
    svc = BackupService(db)
    return [svc._enriquecer_politica(p) for p in svc.listar_politicas(activa)]

@router.post("/politicas", response_model=PoliticaRead, status_code=201)
def crear_politica(
    data: PoliticaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = BackupService(db)
    p = svc.crear_politica(data)
    return svc._enriquecer_politica(svc.obtener_politica(p.id))

@router.patch("/politicas/{pid}", response_model=PoliticaRead)
def actualizar_politica(
    pid: int, data: PoliticaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = BackupService(db)
    p = svc.actualizar_politica(pid, data)
    return svc._enriquecer_politica(p)

# ── EJECUCIONES ───────────────────────────────────────────────────────────────
@router.get("/ejecuciones", response_model=List[EjecucionRead])
def listar_ejecuciones(
    politica_id: Optional[int] = None,
    estado:      Optional[EstadoBackup] = None,
    skip:        int = Query(0, ge=0),
    limit:       int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI, RolUsuario.mesa_ayuda)),
):
    svc = BackupService(db)
    return [svc._enriquecer_ejecucion(e)
            for e in svc.listar_ejecuciones(politica_id, estado, skip, limit)]

@router.post("/ejecuciones/{ej_id}/verificar", response_model=EjecucionRead)
def verificar_backup(
    ej_id: int, data: VerificacionRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = BackupService(db)
    e = svc.verificar_backup(ej_id, data, current_user)
    return svc._enriquecer_ejecucion(e)
