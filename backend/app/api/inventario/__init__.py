from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.inventario import TipoEquipo, EstadoEquipo
from app.models.usuario import Usuario, RolUsuario
from app.schemas.inventario import (
    EquipoCreate, EquipoUpdate, EquipoRead,
    LicenciaCreate, LicenciaUpdate, LicenciaRead,
    AsignacionRequest, DashboardInventario,
)
from app.services.inventario_service import InventarioService

router = APIRouter()

ROLES_TI = [RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda]

# ── DASHBOARD ─────────────────────────────────────────────────────────────────
@router.get("/dashboard", response_model=DashboardInventario)
def dashboard(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return InventarioService(db).dashboard()

# ── EQUIPOS ───────────────────────────────────────────────────────────────────
@router.get("/equipos", response_model=List[EquipoRead])
def listar_equipos(
    tipo:      Optional[TipoEquipo]   = None,
    estado:    Optional[EstadoEquipo] = None,
    sede_id:   Optional[int]          = None,
    usuario_id: Optional[int]         = None,
    busqueda:  Optional[str]          = Query(None, max_length=100),
    skip:      int                    = Query(0, ge=0),
    limit:     int                    = Query(200, le=500),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = InventarioService(db)
    equipos = svc.listar_equipos(tipo, estado, sede_id, usuario_id, busqueda, skip, limit)
    return [svc.enriquecer_equipo(e) for e in equipos]

@router.get("/equipos/{equipo_id}", response_model=EquipoRead)
def obtener_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = InventarioService(db)
    equipo = svc.obtener_equipo(equipo_id)
    if not equipo:
        raise HTTPException(404, "Equipo no encontrado")
    return svc.enriquecer_equipo(equipo)

@router.post("/equipos", response_model=EquipoRead, status_code=201)
def crear_equipo(
    data: EquipoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InventarioService(db)
    return svc.enriquecer_equipo(svc.crear_equipo(data))

@router.patch("/equipos/{equipo_id}", response_model=EquipoRead)
def actualizar_equipo(
    equipo_id: int,
    data: EquipoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InventarioService(db)
    return svc.enriquecer_equipo(svc.actualizar_equipo(equipo_id, data))

@router.post("/equipos/{equipo_id}/asignar", response_model=EquipoRead)
def asignar_equipo(
    equipo_id: int,
    data: AsignacionRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = InventarioService(db)
    return svc.enriquecer_equipo(svc.asignar_equipo(equipo_id, data, current_user))

@router.post("/equipos/{equipo_id}/baja")
def dar_de_baja(
    equipo_id: int,
    motivo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InventarioService(db)
    svc.dar_de_baja(equipo_id, motivo, current_user)
    return {"message": "Equipo dado de baja correctamente"}

@router.get("/equipos/{equipo_id}/historial")
def historial_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    return InventarioService(db).historial_equipo(equipo_id)

# ── LICENCIAS ─────────────────────────────────────────────────────────────────
@router.get("/licencias", response_model=List[LicenciaRead])
def listar_licencias(
    activa:     Optional[bool] = None,
    por_vencer: bool           = False,
    skip:       int            = Query(0, ge=0),
    limit:      int            = Query(200, le=500),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    svc = InventarioService(db)
    lics = svc.listar_licencias(activa, por_vencer, skip, limit)
    return [svc.enriquecer_licencia(l) for l in lics]

@router.post("/licencias", response_model=LicenciaRead, status_code=201)
def crear_licencia(
    data: LicenciaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InventarioService(db)
    return svc.enriquecer_licencia(svc.crear_licencia(data))

@router.patch("/licencias/{licencia_id}", response_model=LicenciaRead)
def actualizar_licencia(
    licencia_id: int,
    data: LicenciaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista)),
):
    svc = InventarioService(db)
    return svc.enriquecer_licencia(svc.actualizar_licencia(licencia_id, data))
