from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.telefonia import LineaTelefonica, TipoLinea
from app.models.usuario import Usuario, RolUsuario
from app.models.sede import Sede
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


@router.get("/analisis-costos")
def analisis_costos(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_TI)),
):
    """Análisis detallado de costos y uso de líneas telefónicas."""
    hoy = date.today()
    prox_60 = hoy + timedelta(days=60)

    lineas = db.query(LineaTelefonica).filter(LineaTelefonica.activa == True).all()

    # Por operador
    op_map: dict = {}
    for l in lineas:
        op = l.operador or "Sin operador"
        e = op_map.setdefault(op, {"operador": op, "cantidad": 0, "costo_total": 0.0})
        e["cantidad"] += 1
        e["costo_total"] += l.costo_mensual or 0
    por_operador = sorted(op_map.values(), key=lambda x: x["costo_total"], reverse=True)
    for e in por_operador:
        e["costo_total"] = round(e["costo_total"], 2)

    # Por tipo
    tipo_map: dict = {}
    for l in lineas:
        tp = l.tipo.value if l.tipo else "otro"
        e = tipo_map.setdefault(tp, {"tipo": tp, "cantidad": 0, "costo_total": 0.0})
        e["cantidad"] += 1
        e["costo_total"] += l.costo_mensual or 0
    por_tipo = sorted(tipo_map.values(), key=lambda x: x["cantidad"], reverse=True)
    for e in por_tipo:
        e["costo_total"] = round(e["costo_total"], 2)

    # Por sede
    sedes_q = (
        db.query(Sede.nombre, func.count(LineaTelefonica.id), func.sum(LineaTelefonica.costo_mensual))
        .join(LineaTelefonica, LineaTelefonica.sede_id == Sede.id)
        .filter(LineaTelefonica.activa == True)
        .group_by(Sede.nombre)
        .all()
    )
    por_sede = [
        {"sede": nombre, "cantidad": cnt, "costo_total": round(float(costo or 0), 2)}
        for nombre, cnt, costo in sedes_q
    ]

    # Próximas a vencer (60 días)
    proximas = [
        l for l in lineas
        if l.fecha_vencimiento and hoy <= l.fecha_vencimiento <= prox_60
    ]
    proximas.sort(key=lambda l: l.fecha_vencimiento)
    proximas_vencer = [
        {
            "id": l.id,
            "numero": l.numero,
            "operador": l.operador,
            "dias": (l.fecha_vencimiento - hoy).days,
            "fecha_vencimiento": l.fecha_vencimiento.isoformat(),
            "costo_mensual": l.costo_mensual,
        }
        for l in proximas
    ]

    # Sin asignar
    sin_asignar = sum(1 for l in lineas if not l.asignado_a_id)

    # Top 10 más costosas
    top_costosas = sorted(
        [l for l in lineas if l.costo_mensual],
        key=lambda l: l.costo_mensual, reverse=True
    )[:10]

    return {
        "por_operador":     por_operador,
        "por_tipo":         por_tipo,
        "por_sede":         por_sede,
        "proximas_vencer":  proximas_vencer,
        "sin_asignar":      sin_asignar,
        "top_costosas":     [
            {
                "numero":       l.numero,
                "operador":     l.operador or "—",
                "plan":         l.plan or "—",
                "costo_mensual": l.costo_mensual,
            }
            for l in top_costosas
        ],
    }
