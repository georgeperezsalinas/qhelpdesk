import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.ticket import EstadoTicket, PrioridadTicket, CategoriaTicket
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
