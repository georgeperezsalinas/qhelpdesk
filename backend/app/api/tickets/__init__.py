import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.ticket import Ticket, EstadoTicket, PrioridadTicket, CategoriaTicket
from app.models.usuario import Usuario, RolUsuario
from app.schemas.ticket import (
    TicketCreate, TicketUpdate, TicketRead, TicketResumen,
    ComentarioCreate, ComentarioRead, NPSRequest, DashboardResumen
)
from app.services.ticket_service import TicketService
from app.services.notificacion_service import NotificacionService
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/dashboard", response_model=DashboardResumen)
def dashboard(db: Session = Depends(get_db),
              current_user: Usuario = Depends(get_current_user)):
    return TicketService(db).dashboard(current_user)


@router.get("/sla-compliance")
def sla_compliance(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """
    Métricas de cumplimiento SLA para tickets resueltos/cerrados en los últimos `dias` días.
    """
    desde = datetime.utcnow() - timedelta(days=dias)

    base = db.query(Ticket).filter(
        Ticket.estado.in_([EstadoTicket.resuelto, EstadoTicket.cerrado]),
        Ticket.resuelto_en >= desde,
        Ticket.sla_cumplido.isnot(None),
    )

    tickets = base.options(joinedload(Ticket.tecnico)).all()
    total = len(tickets)
    cumplidos = sum(1 for t in tickets if t.sla_cumplido)
    rate_global = round(cumplidos / total * 100, 1) if total else None

    tiempos = [t.tiempo_resolucion_h for t in tickets if t.tiempo_resolucion_h is not None]
    tiempo_promedio_h = round(sum(tiempos) / len(tiempos), 2) if tiempos else None

    # Por prioridad
    por_prioridad = []
    for prio in PrioridadTicket:
        grupo = [t for t in tickets if t.prioridad == prio]
        if not grupo:
            continue
        n_cumplidos = sum(1 for t in grupo if t.sla_cumplido)
        por_prioridad.append({
            "prioridad": prio.value,
            "total": len(grupo),
            "cumplidos": n_cumplidos,
            "rate": round(n_cumplidos / len(grupo) * 100, 1),
        })

    # Por técnico (top 10)
    por_tecnico_map: dict = {}
    for t in tickets:
        if not t.tecnico_id:
            continue
        nombre = f"{t.tecnico.nombre} {t.tecnico.apellido}" if t.tecnico else f"ID {t.tecnico_id}"
        entry = por_tecnico_map.setdefault(
            t.tecnico_id,
            {"tecnico_id": t.tecnico_id, "nombre": nombre, "total": 0, "cumplidos": 0},
        )
        entry["total"] += 1
        if t.sla_cumplido:
            entry["cumplidos"] += 1

    por_tecnico = []
    for entry in por_tecnico_map.values():
        entry["rate"] = round(entry["cumplidos"] / entry["total"] * 100, 1) if entry["total"] else 0
        por_tecnico.append(entry)
    por_tecnico.sort(key=lambda x: x["total"], reverse=True)
    por_tecnico = por_tecnico[:10]

    # Tendencia diaria (últimos min(dias, 30) días)
    n_dias_trend = min(dias, 30)
    tendencia = []
    for i in range(n_dias_trend - 1, -1, -1):
        dia_inicio = (datetime.utcnow() - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        dia_fin    = dia_inicio + timedelta(days=1)
        del_dia    = [t for t in tickets if dia_inicio <= t.resuelto_en < dia_fin]
        n_cumpl    = sum(1 for t in del_dia if t.sla_cumplido)
        tendencia.append({
            "fecha":     dia_inicio.strftime("%Y-%m-%d"),
            "total":     len(del_dia),
            "cumplidos": n_cumpl,
            "rate":      round(n_cumpl / len(del_dia) * 100, 1) if del_dia else None,
        })

    return {
        "periodo_dias":       dias,
        "total_resueltos":    total,
        "cumplidos":          cumplidos,
        "rate":               rate_global,
        "tiempo_promedio_h":  tiempo_promedio_h,
        "por_prioridad":      por_prioridad,
        "por_tecnico":        por_tecnico,
        "tendencia":          tendencia,
    }

@router.get("/metricas-tecnico")
def metricas_tecnico(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Métricas de desempeño por técnico en el período indicado."""
    desde = datetime.utcnow() - timedelta(days=dias)

    tickets = (
        db.query(Ticket)
        .options(joinedload(Ticket.tecnico))
        .filter(Ticket.creado_en >= desde, Ticket.tecnico_id.isnot(None))
        .all()
    )

    mapa: dict = {}
    for t in tickets:
        k = t.tecnico_id
        if k not in mapa:
            nombre = f"{t.tecnico.nombre} {t.tecnico.apellido}" if t.tecnico else f"ID {k}"
            mapa[k] = {
                "tecnico_id":   k,
                "nombre":       nombre,
                "asignados":    0,
                "resueltos":    0,
                "cumplidos_sla": 0,
                "tiempos_h":    [],
                "nps":          [],
            }
        e = mapa[k]
        e["asignados"] += 1
        if t.estado in [EstadoTicket.resuelto, EstadoTicket.cerrado]:
            e["resueltos"] += 1
            if t.sla_cumplido is True:
                e["cumplidos_sla"] += 1
            if t.tiempo_resolucion_h is not None:
                e["tiempos_h"].append(t.tiempo_resolucion_h)
        if t.nps_puntuacion is not None:
            e["nps"].append(t.nps_puntuacion)

    resultado = []
    for e in sorted(mapa.values(), key=lambda x: x["resueltos"], reverse=True):
        resultado.append({
            "tecnico_id":      e["tecnico_id"],
            "nombre":          e["nombre"],
            "asignados":       e["asignados"],
            "resueltos":       e["resueltos"],
            "sla_rate":        round(e["cumplidos_sla"] / e["resueltos"] * 100, 1) if e["resueltos"] else None,
            "tiempo_prom_h":   round(sum(e["tiempos_h"]) / len(e["tiempos_h"]), 2) if e["tiempos_h"] else None,
            "nps_prom":        round(sum(e["nps"]) / len(e["nps"]), 1) if e["nps"] else None,
        })
    return resultado


@router.get("/tendencia-semanal")
def tendencia_semanal(
    semanas: int = Query(8, ge=2, le=26),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Volumen de tickets por semana y distribución por categoría."""
    desde = datetime.utcnow() - timedelta(weeks=semanas)

    tickets = db.query(Ticket).filter(Ticket.creado_en >= desde).all()

    semanas_data = []
    for i in range(semanas - 1, -1, -1):
        inicio = (datetime.utcnow() - timedelta(weeks=i)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        # retroceder al lunes de esa semana
        inicio = inicio - timedelta(days=inicio.weekday())
        fin = inicio + timedelta(days=7)
        del_periodo = [t for t in tickets if inicio <= t.creado_en < fin]
        resueltos_p = [t for t in del_periodo if t.estado in [EstadoTicket.resuelto, EstadoTicket.cerrado]]
        semanas_data.append({
            "semana":    inicio.strftime("%d/%m"),
            "creados":   len(del_periodo),
            "resueltos": len(resueltos_p),
        })

    # Distribución por categoría del período completo
    cat_map: dict = {}
    for t in tickets:
        cat = t.categoria.value if t.categoria else "otro"
        cat_map[cat] = cat_map.get(cat, 0) + 1
    por_categoria = [
        {"categoria": k, "total": v}
        for k, v in sorted(cat_map.items(), key=lambda x: x[1], reverse=True)
    ]

    return {"semanas": semanas_data, "por_categoria": por_categoria}


@router.get("/", response_model=List[TicketResumen])
def listar_tickets(
    estado:      Optional[EstadoTicket]    = None,
    prioridad:   Optional[PrioridadTicket] = None,
    categoria:   Optional[CategoriaTicket] = None,
    tecnico_id:  Optional[int]             = None,
    sede_id:     Optional[int]             = None,
    sin_asignar: bool                      = False,
    busqueda:    Optional[str]             = Query(None, max_length=100),
    fecha_desde: Optional[datetime]        = None,
    fecha_hasta: Optional[datetime]        = None,
    skip:        int                       = Query(0, ge=0),
    limit:       int                       = Query(200, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return TicketService(db).listar(
        estado=estado, prioridad=prioridad, categoria=categoria,
        tecnico_id=tecnico_id, sede_id=sede_id, sin_asignar=sin_asignar,
        busqueda=busqueda, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
        skip=skip, limit=limit, usuario=current_user,
    )

@router.post("/", response_model=TicketRead, status_code=201)
def crear_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    svc = TicketService(db)
    ticket = svc.crear(data, current_user)
    try:
        NotificacionService(db).ticket_creado(
            ticket.numero, ticket.titulo,
            ticket.solicitante_id, ticket.tecnico_id
        )
    except Exception as exc:
        logger.warning("WS notif ticket_creado %s: %s", ticket.numero, exc)
    # Email al técnico asignado
    if ticket.tecnico_id and ticket.tecnico and ticket.tecnico.email:
        email_service.ticket_asignado(
            tecnico_email=ticket.tecnico.email,
            tecnico_nombre=f"{ticket.tecnico.nombre} {ticket.tecnico.apellido}",
            numero=ticket.numero,
            titulo=ticket.titulo,
            prioridad=ticket.prioridad.value,
            solicitante=f"{ticket.solicitante.nombre} {ticket.solicitante.apellido}",
        )
    return ticket

@router.get("/{ticket_id}", response_model=TicketRead)
def obtener_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ticket = TicketService(db).obtener(ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket no encontrado")
    return ticket

@router.patch("/{ticket_id}", response_model=TicketRead)
def actualizar_ticket(
    ticket_id: int,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    svc = TicketService(db)
    ticket = svc.actualizar(ticket_id, data, current_user)
    if data.estado == EstadoTicket.resuelto:
        try:
            NotificacionService(db).ticket_resuelto(
                ticket.numero, ticket.solicitante_id
            )
        except Exception as exc:
            logger.warning("WS notif ticket_resuelto %s: %s", ticket.numero, exc)
        # Email al solicitante
        if ticket.solicitante and ticket.solicitante.email:
            email_service.ticket_resuelto(
                solicitante_email=ticket.solicitante.email,
                solicitante_nombre=ticket.solicitante.nombre,
                numero=ticket.numero,
                titulo=ticket.titulo,
            )
    return ticket

@router.get("/{ticket_id}/comentarios", response_model=List[ComentarioRead])
def listar_comentarios(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return TicketService(db).listar_comentarios(ticket_id)

@router.post("/{ticket_id}/comentarios", response_model=ComentarioRead, status_code=201)
def agregar_comentario(
    ticket_id: int,
    data: ComentarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    svc   = TicketService(db)
    coment = svc.agregar_comentario(ticket_id, data, current_user)
    # Solo notificar al solicitante cuando el técnico hace un comentario público
    if not data.es_interno:
        ticket = svc.obtener(ticket_id)
        if ticket and current_user.id != ticket.solicitante_id:
            try:
                from app.models.notificacion import TipoNotificacion
                NotificacionService(db).notificar_usuario(
                    ticket.solicitante_id,
                    TipoNotificacion.ticket_actualizado,
                    f"Nuevo comentario en {ticket.numero}",
                    data.contenido[:120],
                    url="/portal/mis-tickets",
                )
            except Exception as exc:
                logger.warning("WS notif comentario %s: %s", ticket_id, exc)
            # Email al solicitante
            if ticket.solicitante and ticket.solicitante.email:
                email_service.ticket_comentario(
                    solicitante_email=ticket.solicitante.email,
                    solicitante_nombre=f"{ticket.solicitante.nombre} {ticket.solicitante.apellido}",
                    numero=ticket.numero,
                    titulo=ticket.titulo,
                    comentario=data.contenido,
                    autor_nombre=f"{current_user.nombre} {current_user.apellido}",
                )
    return coment

@router.post("/{ticket_id}/nps", response_model=TicketRead)
def calificar_ticket(
    ticket_id: int,
    data: NPSRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return TicketService(db).registrar_nps(ticket_id, data, current_user)

@router.post("/{ticket_id}/tomar", response_model=TicketRead)
def tomar_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(
        RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda
    )),
):
    data = TicketUpdate(tecnico_id=current_user.id, estado=EstadoTicket.en_progreso)
    return TicketService(db).actualizar(ticket_id, data, current_user)

@router.post("/{ticket_id}/escalar", response_model=TicketRead)
def escalar_ticket(
    ticket_id: int,
    tecnico_nivel2_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(
        RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda
    )),
):
    data = TicketUpdate(estado=EstadoTicket.escalado,
                        tecnico_nivel2_id=tecnico_nivel2_id)
    return TicketService(db).actualizar(ticket_id, data, current_user)

@router.post("/{ticket_id}/cerrar", response_model=TicketRead)
def cerrar_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    data = TicketUpdate(estado=EstadoTicket.cerrado)
    return TicketService(db).actualizar(ticket_id, data, current_user)
