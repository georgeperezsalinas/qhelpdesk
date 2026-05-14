from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.infraestructura import EstadoServicio
from app.models.usuario import Usuario, RolUsuario
from app.schemas.infraestructura import (
    ServidorCreate, ServidorUpdate, ServidorRead,
    DispositivoCreate, DispositivoUpdate, DispositivoRead,
    BaseDatosRead, DashboardInfraestructura,
)
from app.services.infraestructura_service import InfraestructuraService

router = APIRouter()
ROLES_TI = [RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda]

@router.get("/dashboard", response_model=DashboardInfraestructura)
def dashboard(db: Session = Depends(get_db),
              _: Usuario = Depends(require_roles(*ROLES_TI))):
    return InfraestructuraService(db).dashboard()

# ── SERVIDORES ────────────────────────────────────────────────────────────────
@router.get("/servidores", response_model=List[ServidorRead])
def listar_servidores(
    estado:  Optional[EstadoServicio] = None,
    sede_id: Optional[int]            = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = InfraestructuraService(db)
    return [svc._enriquecer_servidor(s) for s in svc.listar_servidores(estado, sede_id)]

@router.post("/servidores", response_model=ServidorRead, status_code=201)
def crear_servidor(
    data: ServidorCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InfraestructuraService(db)
    return svc._enriquecer_servidor(svc.crear_servidor(data))

@router.patch("/servidores/{sid}", response_model=ServidorRead)
def actualizar_servidor(
    sid: int, data: ServidorUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InfraestructuraService(db)
    return svc._enriquecer_servidor(svc.actualizar_servidor(sid, data))

# ── DISPOSITIVOS DE RED ───────────────────────────────────────────────────────
@router.get("/dispositivos", response_model=List[DispositivoRead])
def listar_dispositivos(
    tipo:    Optional[str]            = None,
    estado:  Optional[EstadoServicio] = None,
    sede_id: Optional[int]            = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = InfraestructuraService(db)
    return [svc._enriquecer_dispositivo(d)
            for d in svc.listar_dispositivos(tipo, estado, sede_id)]

@router.post("/dispositivos", response_model=DispositivoRead, status_code=201)
def crear_dispositivo(
    data: DispositivoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InfraestructuraService(db)
    d = svc.crear_dispositivo(data)
    return svc._enriquecer_dispositivo(d)

@router.patch("/dispositivos/{did}", response_model=DispositivoRead)
def actualizar_dispositivo(
    did: int, data: DispositivoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InfraestructuraService(db)
    d = svc.actualizar_dispositivo(did, data)
    return svc._enriquecer_dispositivo(d)

# ── BASES DE DATOS ────────────────────────────────────────────────────────────
@router.get("/bases-datos", response_model=List[BaseDatosRead])
def listar_bases_datos(
    servidor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return InfraestructuraService(db).listar_bases_datos(servidor_id)
