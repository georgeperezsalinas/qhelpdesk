from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.mantenimiento import TipoMantenimiento, EstadoOrden
from app.models.usuario import Usuario, RolUsuario
from app.schemas.mantenimiento import (
    OrdenCreate, OrdenUpdate, OrdenRead,
    CronogramaRead, DashboardMantenimiento,
)
from app.services.mantenimiento_service import MantenimientoService

router = APIRouter()
ROLES_TI = [RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda]

@router.get("/dashboard", response_model=DashboardMantenimiento)
def dashboard(db: Session = Depends(get_db), _: Usuario = Depends(require_roles(*ROLES_TI))):
    return MantenimientoService(db).dashboard()

@router.get("/", response_model=List[OrdenRead])
def listar_ordenes(
    tipo:          Optional[TipoMantenimiento] = None,
    estado:        Optional[EstadoOrden]       = None,
    tecnico_id:    Optional[int]               = None,
    equipo_id:     Optional[int]               = None,
    fecha_desde:   Optional[date]              = None,
    fecha_hasta:   Optional[date]              = None,
    proximos_dias: Optional[int]               = None,
    skip:          int                         = Query(0, ge=0),
    limit:         int                         = Query(200, le=500),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return MantenimientoService(db).listar(
        tipo=tipo, estado=estado, tecnico_id=tecnico_id, equipo_id=equipo_id,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
        proximos_dias=proximos_dias, skip=skip, limit=limit,
    )

@router.post("/", response_model=OrdenRead, status_code=201)
def crear_orden(
    data: OrdenCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return MantenimientoService(db).crear(data, current_user)

@router.get("/cronogramas", response_model=List[CronogramaRead])
def listar_cronogramas(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return MantenimientoService(db).listar_cronogramas()

@router.get("/{orden_id}", response_model=OrdenRead)
def obtener_orden(
    orden_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    orden = MantenimientoService(db).obtener(orden_id)
    if not orden:
        raise HTTPException(404, "Orden no encontrada")
    return orden

@router.patch("/{orden_id}", response_model=OrdenRead)
def actualizar_orden(
    orden_id: int,
    data: OrdenUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return MantenimientoService(db).actualizar(orden_id, data)

@router.patch("/{orden_id}/checklist/{item_id}")
def actualizar_checklist(
    orden_id: int,
    item_id: int,
    completado: bool,
    observacion: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return MantenimientoService(db).actualizar_checklist(orden_id, item_id, completado, observacion)

@router.post("/generar-preventivos")
def generar_preventivos(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    generados = MantenimientoService(db).generar_preventivos_automaticos()
    return {"message": f"Se generaron {generados} órdenes de mantenimiento preventivo"}
