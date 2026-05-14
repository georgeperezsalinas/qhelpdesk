from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
import io

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.usuario import Usuario, RolUsuario
from app.reports.excel_reports import (
    reporte_tickets, reporte_inventario,
    reporte_mantenimiento, reporte_compras, reporte_gerencial,
)
from app.reports.pdf_reports import pdf_dashboard_gerencial

router = APIRouter()
ROLES_REPORTE = [RolUsuario.jefe, RolUsuario.especialista]

def excel_response(data: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

def pdf_response(data: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ── EXCEL ─────────────────────────────────────────────────────────────────────
@router.get("/tickets/excel")
def excel_tickets(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_REPORTE)),
):
    data = reporte_tickets(db, fecha_desde, fecha_hasta)
    fn   = f"reporte_tickets_{date.today().strftime('%Y%m%d')}.xlsx"
    return excel_response(data, fn)

@router.get("/inventario/excel")
def excel_inventario(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_REPORTE)),
):
    data = reporte_inventario(db)
    fn   = f"reporte_inventario_{date.today().strftime('%Y%m%d')}.xlsx"
    return excel_response(data, fn)

@router.get("/mantenimiento/excel")
def excel_mantenimiento(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_REPORTE)),
):
    data = reporte_mantenimiento(db, fecha_desde, fecha_hasta)
    fn   = f"reporte_mantenimiento_{date.today().strftime('%Y%m%d')}.xlsx"
    return excel_response(data, fn)

@router.get("/compras/excel")
def excel_compras(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_REPORTE)),
):
    data = reporte_compras(db, fecha_desde, fecha_hasta)
    fn   = f"reporte_compras_{date.today().strftime('%Y%m%d')}.xlsx"
    return excel_response(data, fn)

@router.get("/gerencial/excel")
def excel_gerencial(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_REPORTE)),
):
    data = reporte_gerencial(db, fecha_desde, fecha_hasta)
    fn   = f"informe_gerencial_{date.today().strftime('%Y%m%d')}.xlsx"
    return excel_response(data, fn)

# ── PDF ───────────────────────────────────────────────────────────────────────
@router.get("/gerencial/pdf")
def pdf_gerencial(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*ROLES_REPORTE)),
):
    data = pdf_dashboard_gerencial(db, fecha_desde, fecha_hasta)
    fn   = f"informe_gerencial_{date.today().strftime('%Y%m%d')}.pdf"
    return pdf_response(data, fn)
