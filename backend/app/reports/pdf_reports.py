"""
pdf_reports.py – Generador de PDFs ERP con ReportLab
"""
import io
from datetime import datetime, date, timedelta
from typing import Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.ticket import Ticket, EstadoTicket, PrioridadTicket
from app.models.inventario import Equipo, EstadoEquipo
from app.models.usuario import Usuario, RolUsuario
from app.models.backup import EjecucionBackup, EstadoBackup
from app.models.mantenimiento import OrdenMantenimiento, TipoMantenimiento

# ── PALETA ─────────────────────────────────────────────────────────────────────
C_PRIMARY  = colors.HexColor("#1B3A6B")
C_ACCENT   = colors.HexColor("#2F7FD1")
C_LIGHT    = colors.HexColor("#EBF3FB")
C_GRAY     = colors.HexColor("#F5F6FA")
C_WHITE    = colors.white
C_SUCCESS  = colors.HexColor("#1E7E34")
C_WARNING  = colors.HexColor("#856404")
C_DANGER   = colors.HexColor("#721C24")
C_TEXT     = colors.HexColor("#2C2C2C")

def _styles():
    base = getSampleStyleSheet()
    return {
        "title":    ParagraphStyle("title",    fontSize=20, textColor=C_WHITE,
                                   fontName="Helvetica-Bold", alignment=TA_LEFT, leading=24),
        "subtitle": ParagraphStyle("subtitle", fontSize=11, textColor=C_WHITE,
                                   fontName="Helvetica", alignment=TA_LEFT),
        "section":  ParagraphStyle("section",  fontSize=12, textColor=C_PRIMARY,
                                   fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4),
        "body":     ParagraphStyle("body",     fontSize=9,  textColor=C_TEXT,
                                   fontName="Helvetica", leading=13),
        "small":    ParagraphStyle("small",    fontSize=8,  textColor=colors.HexColor("#595959"),
                                   fontName="Helvetica"),
        "kpi_lbl":  ParagraphStyle("kpi_lbl",  fontSize=9,  textColor=colors.HexColor("#595959"),
                                   fontName="Helvetica", alignment=TA_CENTER),
        "kpi_val":  ParagraphStyle("kpi_val",  fontSize=18, textColor=C_PRIMARY,
                                   fontName="Helvetica-Bold", alignment=TA_CENTER),
        "footer":   ParagraphStyle("footer",   fontSize=7,  textColor=colors.HexColor("#999"),
                                   fontName="Helvetica", alignment=TA_CENTER),
    }

def _tbl_style(header_cols: int = None):
    """Estilo ERP para tablas."""
    return TableStyle([
        # Header
        ('BACKGROUND',  (0,0), (-1,0), C_PRIMARY),
        ('TEXTCOLOR',   (0,0), (-1,0), C_WHITE),
        ('FONTNAME',    (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',    (0,0), (-1,0), 8),
        ('ALIGN',       (0,0), (-1,0), 'CENTER'),
        ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
        # Body
        ('FONTNAME',    (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE',    (0,1), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_LIGHT]),
        ('GRID',        (0,0), (-1,-1), 0.3, colors.HexColor("#D9D9D9")),
        ('LINEBELOW',   (0,0), (-1,0), 1, C_ACCENT),
        ('TOPPADDING',  (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0),(-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING',(0,0), (-1,-1), 6),
    ])

def _on_page(canvas, doc, titulo: str):
    """Header y footer de cada página."""
    w, h = doc.pagesize
    # Header
    canvas.saveState()
    canvas.setFillColor(C_PRIMARY)
    canvas.rect(0, h-2.2*cm, w, 2.2*cm, fill=1, stroke=0)
    canvas.setFillColor(C_WHITE)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawString(1.5*cm, h-1.3*cm, f"QHELP DESK ERP  ·  {titulo.upper()}")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w-1.5*cm, h-1.3*cm, datetime.now().strftime("%d/%m/%Y %H:%M"))
    # Footer
    canvas.setFillColor(colors.HexColor("#CCCCCC"))
    canvas.rect(0, 0, w, 0.8*cm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(w/2, 0.3*cm,
        f"QHELP DESK ERP – Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}  ·  Página {doc.page}")
    canvas.restoreState()

def _kpi_table(kpis: list) -> Table:
    """Genera tabla de KPIs tipo cards."""
    n = len(kpis)
    data_labels = [[Paragraph(k[0], _styles()["kpi_lbl"]) for k in kpis]]
    data_values = [[Paragraph(str(k[1]), _styles()["kpi_val"]) for k in kpis]]
    tbl = Table([data_labels[0], data_values[0]], colWidths=[A4[0]/n - 2.4*cm/n]*n)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,-1), C_LIGHT),
        ('BOX',          (0,0), (-1,-1), 1, C_ACCENT),
        ('INNERGRID',    (0,0), (-1,-1), 0.5, C_ACCENT),
        ('TOPPADDING',   (0,0), (-1,-1), 8),
        ('BOTTOMPADDING',(0,0), (-1,-1), 8),
        ('ALIGN',        (0,0), (-1,-1), 'CENTER'),
    ]))
    return tbl


# ══════════════════════════════════════════════════════════════════════════════
# PDF 1: DASHBOARD GERENCIAL
# ══════════════════════════════════════════════════════════════════════════════
def pdf_dashboard_gerencial(db: Session,
                             fecha_desde: Optional[date] = None,
                             fecha_hasta: Optional[date] = None) -> bytes:
    if not fecha_desde: fecha_desde = date.today().replace(day=1)
    if not fecha_hasta: fecha_hasta = date.today()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                             leftMargin=1.5*cm, rightMargin=1.5*cm,
                             topMargin=3*cm, bottomMargin=1.5*cm)
    S   = _styles()
    elements = []
    titulo  = "Dashboard Gerencial – Oficina de Sistemas"

    # Período
    elements.append(Spacer(1, 0.3*cm))
    elements.append(Paragraph(
        f"Período: <b>{fecha_desde.strftime('%d/%m/%Y')}</b> al <b>{fecha_hasta.strftime('%d/%m/%Y')}</b>",
        S["body"]))
    elements.append(HRFlowable(width="100%", thickness=2, color=C_ACCENT, spaceAfter=8))

    # ── KPIs Tickets ──────────────────────────────────────────────────────────
    elements.append(Paragraph("1. GESTIÓN DE TICKETS", S["section"]))
    q = db.query(Ticket).filter(
        Ticket.creado_en >= datetime.combine(fecha_desde, datetime.min.time()),
    )
    total_t  = q.count()
    resuel_t = q.filter(Ticket.estado.in_([EstadoTicket.resuelto, EstadoTicket.cerrado])).count()
    venc_t   = q.filter(Ticket.sla_limite < datetime.utcnow(),
                         Ticket.estado.notin_([EstadoTicket.resuelto, EstadoTicket.cerrado])).count()
    nps_t    = db.query(func.avg(Ticket.nps_puntuacion)).filter(Ticket.nps_puntuacion!=None).scalar()
    sla_ok   = q.filter(Ticket.sla_cumplido==True).count()

    elements.append(_kpi_table([
        ("Total tickets", total_t),
        ("Resueltos", resuel_t),
        ("SLA cumplido", f"{round(sla_ok/max(resuel_t,1)*100,1)}%"),
        ("Vencidos SLA", venc_t),
        ("NPS promedio", f"{round(nps_t or 0,1)}/10"),
    ]))
    elements.append(Spacer(1, 0.4*cm))

    # Tabla por prioridad
    data = [["Prioridad", "Total", "Resueltos", "SLA Cumplido", "% SLA"]]
    for prio in [PrioridadTicket.critica, PrioridadTicket.alta,
                 PrioridadTicket.media, PrioridadTicket.baja]:
        t  = q.filter(Ticket.prioridad==prio).count()
        r  = q.filter(Ticket.prioridad==prio, Ticket.estado.in_([EstadoTicket.resuelto, EstadoTicket.cerrado])).count()
        sk = q.filter(Ticket.prioridad==prio, Ticket.sla_cumplido==True).count()
        data.append([prio.value.capitalize(), t, r, sk, f"{round(sk/max(r,1)*100,1)}%"])
    tbl = Table(data, colWidths=[4*cm, 2.5*cm, 2.5*cm, 3*cm, 3*cm])
    tbl.setStyle(_tbl_style())
    # Colorear filas
    for i, prio in enumerate([PrioridadTicket.critica, PrioridadTicket.alta], 1):
        bg = colors.HexColor("#F8D7DA") if prio==PrioridadTicket.critica else colors.HexColor("#FFF3CD")
        tbl.setStyle(TableStyle([('BACKGROUND', (0,i), (0,i), bg)]))
    elements.append(tbl)
    elements.append(Spacer(1, 0.5*cm))

    # ── KPIs Inventario ───────────────────────────────────────────────────────
    elements.append(Paragraph("2. INVENTARIO TI", S["section"]))
    total_eq  = db.query(func.count(Equipo.id)).scalar()
    act_eq    = db.query(func.count(Equipo.id)).filter(Equipo.estado==EstadoEquipo.activo).scalar()
    val_inv   = db.query(func.sum(Equipo.valor_compra)).filter(Equipo.estado!=EstadoEquipo.de_baja).scalar() or 0
    elements.append(_kpi_table([
        ("Total equipos", total_eq),
        ("Activos", act_eq),
        ("Valor inventario", f"S/ {val_inv:,.0f}"),
    ]))
    elements.append(Spacer(1, 0.5*cm))

    # ── KPIs Mantenimiento ────────────────────────────────────────────────────
    elements.append(Paragraph("3. MANTENIMIENTO", S["section"]))
    qm   = db.query(OrdenMantenimiento).filter(
        OrdenMantenimiento.fecha_programada >= fecha_desde,
        OrdenMantenimiento.fecha_programada <= fecha_hasta,
    )
    prev = qm.filter(OrdenMantenimiento.tipo==TipoMantenimiento.preventivo).count()
    corr = qm.filter(OrdenMantenimiento.tipo==TipoMantenimiento.correctivo).count()
    pct  = round(prev/max(prev+corr,1)*100,1)
    elements.append(_kpi_table([
        ("Preventivos", prev),
        ("Correctivos", corr),
        ("% Preventivo", f"{pct}%"),
        ("Meta", "≥ 60%"),
    ]))
    elements.append(Spacer(1, 0.5*cm))

    # ── KPIs Backup ───────────────────────────────────────────────────────────
    elements.append(Paragraph("4. BACKUP Y CONTINUIDAD", S["section"]))
    hace7    = datetime.utcnow() - timedelta(days=7)
    total_bk = db.query(func.count(EjecucionBackup.id)).filter(EjecucionBackup.inicio>=hace7).scalar()
    exit_bk  = db.query(func.count(EjecucionBackup.id)).filter(
        EjecucionBackup.inicio>=hace7, EjecucionBackup.estado==EstadoBackup.exitoso).scalar()
    tasa_bk  = round(exit_bk/max(total_bk,1)*100,1)
    elements.append(_kpi_table([
        ("Backups (7d)", total_bk),
        ("Exitosos", exit_bk),
        ("Tasa éxito", f"{tasa_bk}%"),
        ("Meta", "≥ 95%"),
    ]))
    elements.append(Spacer(1, 0.5*cm))

    # ── Top técnicos ──────────────────────────────────────────────────────────
    elements.append(Paragraph("5. DESEMPEÑO DEL EQUIPO TÉCNICO", S["section"]))
    tecnicos = db.query(Usuario).filter(
        Usuario.rol.in_([RolUsuario.especialista, RolUsuario.mesa_ayuda])
    ).all()
    data_tec = [["Técnico", "Asignados", "Resueltos", "SLA OK", "T. Prom (h)"]]
    for tec in tecnicos:
        asig = q.filter(Ticket.tecnico_id==tec.id).count()
        if asig == 0: continue
        res  = q.filter(Ticket.tecnico_id==tec.id,
                         Ticket.estado.in_([EstadoTicket.resuelto, EstadoTicket.cerrado])).count()
        slak = q.filter(Ticket.tecnico_id==tec.id, Ticket.sla_cumplido==True).count()
        tprom= db.query(func.avg(Ticket.tiempo_resolucion_h)).filter(
            Ticket.tecnico_id==tec.id, Ticket.tiempo_resolucion_h!=None).scalar()
        data_tec.append([
            f"{tec.nombre} {tec.apellido}", asig, res, slak,
            f"{round(tprom or 0,1)}h"
        ])
    if len(data_tec) > 1:
        tbl2 = Table(data_tec, colWidths=[6*cm, 2.5*cm, 2.5*cm, 2.5*cm, 3*cm])
        tbl2.setStyle(_tbl_style())
        elements.append(tbl2)

    elements.append(Spacer(1, 1*cm))
    elements.append(HRFlowable(width="100%", thickness=1, color=C_ACCENT))
    elements.append(Spacer(1, 0.2*cm))
    elements.append(Paragraph(
        f"Informe generado automáticamente por <b>QHELP DESK ERP v1.0</b> · "
        f"{datetime.now().strftime('%d/%m/%Y %H:%M')}",
        S["footer"]
    ))

    doc.build(elements,
              onFirstPage=lambda c,d: _on_page(c, d, titulo),
              onLaterPages=lambda c,d: _on_page(c, d, titulo))
    return buf.getvalue()
