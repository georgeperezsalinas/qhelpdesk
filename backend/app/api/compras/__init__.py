from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.compra import EstadoSolicitud, TipoSolicitud
from app.models.usuario import Usuario, RolUsuario
from app.schemas.compra import (
    SolicitudCreate, SolicitudUpdate, SolicitudRead, DashboardCompras
)
from app.services.compra_service import CompraService

router = APIRouter()
ROLES_TI = [RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda]

@router.get("/dashboard", response_model=DashboardCompras)
def dashboard(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return CompraService(db).dashboard()

@router.get("/", response_model=List[SolicitudRead])
def listar(
    estado:        Optional[EstadoSolicitud] = None,
    tipo:          Optional[TipoSolicitud]   = None,
    solicitante_id:Optional[int]             = None,
    skip:          int = Query(0, ge=0),
    limit:         int = Query(200, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return CompraService(db).listar(estado, tipo, solicitante_id, skip, limit, current_user)

@router.post("/", response_model=SolicitudRead, status_code=201)
def crear(
    data: SolicitudCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return CompraService(db).crear(data, current_user)

@router.get("/{sid}", response_model=SolicitudRead)
def obtener(
    sid: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    s = CompraService(db).obtener(sid)
    if not s:
        raise HTTPException(404, "Solicitud no encontrada")
    return s

@router.patch("/{sid}", response_model=SolicitudRead)
def actualizar(
    sid: int,
    data: SolicitudUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return CompraService(db).actualizar(sid, data, current_user)

@router.post("/{sid}/enviar", response_model=SolicitudRead)
def enviar(
    sid: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return CompraService(db).enviar(sid, current_user)

@router.post("/{sid}/aprobar", response_model=SolicitudRead)
def aprobar(
    sid: int,
    valor_aprobado: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(RolUsuario.jefe)),
):
    data = SolicitudUpdate(
        estado=EstadoSolicitud.aprobada,
        valor_aprobado=valor_aprobado,
    )
    return CompraService(db).actualizar(sid, data, current_user)

@router.post("/{sid}/rechazar", response_model=SolicitudRead)
def rechazar(
    sid: int,
    motivo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(RolUsuario.jefe)),
):
    data = SolicitudUpdate(
        estado=EstadoSolicitud.rechazada,
        motivo_rechazo=motivo,
    )
    return CompraService(db).actualizar(sid, data, current_user)
