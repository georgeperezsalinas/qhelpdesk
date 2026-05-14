from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.telefonia import TipoLinea
from app.models.usuario import Usuario, RolUsuario
from app.schemas.telefonia import LineaCreate, LineaUpdate, LineaRead, DashboardTelefonia
from app.services.telefonia_service import TelefoniaService

router = APIRouter()
ROLES_TI = [RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda]

@router.get("/dashboard", response_model=DashboardTelefonia)
def dashboard(db: Session = Depends(get_db),
              _: Usuario = Depends(require_roles(*ROLES_TI))):
    return TelefoniaService(db).dashboard()

@router.get("/", response_model=List[LineaRead])
def listar(
    tipo:         Optional[TipoLinea] = None,
    activa:       Optional[bool]      = None,
    sede_id:      Optional[int]       = None,
    es_directivo: Optional[bool]      = None,
    skip:         int = Query(0, ge=0),
    limit:        int = Query(200, le=500),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = TelefoniaService(db)
    return [svc._enriquecer(l) for l in svc.listar(tipo, activa, sede_id, es_directivo, skip, limit)]

@router.post("/", response_model=LineaRead, status_code=201)
def crear(
    data: LineaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = TelefoniaService(db)
    return svc._enriquecer(svc.crear(data))

@router.patch("/{lid}", response_model=LineaRead)
def actualizar(
    lid: int, data: LineaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = TelefoniaService(db)
    return svc._enriquecer(svc.actualizar(lid, data))
