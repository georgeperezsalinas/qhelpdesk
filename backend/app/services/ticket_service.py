from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.models.ticket import (
    Ticket, ComentarioTicket, HistorialTicket,
    EstadoTicket, PrioridadTicket, CanalEntrada
)
from app.models.usuario import Usuario, RolUsuario
from app.schemas.ticket import (
    TicketCreate, TicketUpdate, ComentarioCreate, NPSRequest, DashboardResumen
)

# SLA en horas por prioridad
SLA_HORAS = {
    PrioridadTicket.critica: 4,
    PrioridadTicket.alta:    8,
    PrioridadTicket.media:   24,
    PrioridadTicket.baja:    72,
}

class TicketService:
    def __init__(self, db: Session):
        self.db = db

    # ── Número correlativo ────────────────────────────────────────────────────
    def _gen_numero(self) -> str:
        anio  = datetime.utcnow().year
        count = self.db.query(func.count(Ticket.id)).scalar() + 1
        return f"TK-{anio}-{count:05d}"

    # ── Registrar historial de cambios ────────────────────────────────────────
    def _historial(self, ticket: Ticket, campo: str, anterior, nuevo, usuario_id: int):
        if str(anterior) != str(nuevo):
            h = HistorialTicket(
                ticket_id=ticket.id, usuario_id=usuario_id,
                campo=campo,
                valor_anterior=str(anterior) if anterior is not None else None,
                valor_nuevo=str(nuevo) if nuevo is not None else None,
            )
            self.db.add(h)

    # ── Asignación automática por skill y carga ───────────────────────────────
    def _auto_asignar(self, categoria: Optional[str], sede_id: Optional[int]) -> Optional[int]:
        skill_map = {
            "red":          "redes",
            "vpn":          "vpn",
            "servidor":     "servidores",
            "correo":       "correo",
            "seguridad":    "seguridad",
            "hardware":     "hardware",
            "impresora":    "impresoras",
            "software":     "software",
            "acceso":       "accesos",
            "telefonia":    "telefonia",
        }
        skill_needed = skill_map.get(categoria) if categoria else None

        q = self.db.query(Usuario).filter(
            Usuario.rol.in_([RolUsuario.mesa_ayuda, RolUsuario.especialista]),
            Usuario.activo == True,
        )
        if sede_id:
            q = q.filter(Usuario.sede_id == sede_id)

        tecnicos = q.all()
        if not tecnicos:
            return None

        # Filtrar por skill si aplica
        if skill_needed:
            con_skill = [t for t in tecnicos if t.skills and skill_needed in t.skills]
            if con_skill:
                tecnicos = con_skill

        # Elegir el de menor carga actual
        def carga_actual(tecnico):
            return self.db.query(func.count(Ticket.id)).filter(
                Ticket.tecnico_id == tecnico.id,
                Ticket.estado.in_([
                    EstadoTicket.asignado, EstadoTicket.en_progreso, EstadoTicket.pendiente
                ])
            ).scalar()

        tecnicos_carga = [(t, carga_actual(t)) for t in tecnicos]
        tecnicos_disponibles = [(t, c) for t, c in tecnicos_carga if c < t.carga_maxima]

        if not tecnicos_disponibles:
            tecnicos_disponibles = tecnicos_carga  # asignar igual aunque esté lleno

        mejor = min(tecnicos_disponibles, key=lambda x: x[1])
        return mejor[0].id

    # ── CREAR TICKET ──────────────────────────────────────────────────────────
    def crear(self, data: TicketCreate, solicitante: Usuario) -> Ticket:
        prioridad = data.prioridad

        # Alta Dirección siempre crítica
        if solicitante.rol == RolUsuario.alta_direccion:
            prioridad = PrioridadTicket.critica

        # Sede del ticket = sede del solicitante si no se especificó
        sede_id = data.sede_id or solicitante.sede_id

        sla = datetime.utcnow() + timedelta(hours=SLA_HORAS[prioridad])

        # Asignación automática si no se especificó técnico
        tecnico_id = data.tecnico_id
        if not tecnico_id:
            tecnico_id = self._auto_asignar(
                data.categoria.value if data.categoria else None,
                sede_id
            )

        ticket = Ticket(
            numero=self._gen_numero(),
            titulo=data.titulo,
            descripcion=data.descripcion,
            prioridad=prioridad,
            estado=EstadoTicket.asignado if tecnico_id else EstadoTicket.abierto,
            categoria=data.categoria,
            canal_entrada=data.canal_entrada,
            sede_id=sede_id,
            solicitante_id=solicitante.id,
            tecnico_id=tecnico_id,
            equipo_id=data.equipo_id,
            sla_limite=sla,
            asignado_en=datetime.utcnow() if tecnico_id else None,
        )
        self.db.add(ticket)
        self.db.flush()

        # Historial inicial
        self.db.add(HistorialTicket(
            ticket_id=ticket.id, usuario_id=solicitante.id,
            campo="estado", valor_anterior=None, valor_nuevo=ticket.estado.value
        ))

        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    # ── LISTAR con filtros ────────────────────────────────────────────────────
    def listar(
        self,
        estado: Optional[EstadoTicket],
        prioridad: Optional[PrioridadTicket],
        categoria=None,
        tecnico_id: Optional[int] = None,
        sede_id: Optional[int] = None,
        sin_asignar: bool = False,
        fecha_desde=None,
        fecha_hasta=None,
        busqueda: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        usuario: Usuario = None,
    ) -> List[Ticket]:
        q = self.db.query(Ticket)

        # Filtros por rol
        if usuario and usuario.rol == RolUsuario.usuario_final:
            q = q.filter(Ticket.solicitante_id == usuario.id)
        elif usuario and usuario.rol == RolUsuario.usuario_externo:
            q = q.filter(or_(
                Ticket.solicitante_id == usuario.id,
                Ticket.sede_id == usuario.sede_id,
            ))
        elif usuario and usuario.rol == RolUsuario.mesa_ayuda:
            q = q.filter(Ticket.tecnico_id == usuario.id)

        # Filtros opcionales
        if estado:      q = q.filter(Ticket.estado == estado)
        if prioridad:   q = q.filter(Ticket.prioridad == prioridad)
        if categoria:   q = q.filter(Ticket.categoria == categoria)
        if tecnico_id:  q = q.filter(Ticket.tecnico_id == tecnico_id)
        if sede_id:     q = q.filter(Ticket.sede_id == sede_id)
        if sin_asignar: q = q.filter(Ticket.tecnico_id == None)
        if fecha_desde: q = q.filter(Ticket.creado_en >= fecha_desde)
        if fecha_hasta: q = q.filter(Ticket.creado_en <= fecha_hasta)
        if busqueda:
            like = f"%{busqueda}%"
            q = q.filter(or_(
                Ticket.titulo.ilike(like),
                Ticket.numero.ilike(like),
                Ticket.descripcion.ilike(like),
            ))

        return q.order_by(
            Ticket.prioridad.desc(),
            Ticket.creado_en.desc()
        ).offset(skip).limit(limit).all()

    # ── OBTENER uno ───────────────────────────────────────────────────────────
    def obtener(self, ticket_id: int) -> Optional[Ticket]:
        return self.db.query(Ticket).filter(Ticket.id == ticket_id).first()

    # ── ACTUALIZAR ────────────────────────────────────────────────────────────
    def actualizar(self, ticket_id: int, data: TicketUpdate, usuario: Usuario) -> Ticket:
        ticket = self.obtener(ticket_id)
        if not ticket:
            raise HTTPException(404, "Ticket no encontrado")

        cambios = data.model_dump(exclude_none=True)
        for campo, valor in cambios.items():
            anterior = getattr(ticket, campo)
            setattr(ticket, campo, valor)
            self._historial(ticket, campo, anterior, valor, usuario.id)

        # Lógica de estados
        if data.estado == EstadoTicket.en_progreso and not ticket.asignado_en:
            ticket.asignado_en = datetime.utcnow()

        if data.estado == EstadoTicket.resuelto and not ticket.resuelto_en:
            ticket.resuelto_en = datetime.utcnow()
            ticket.sla_cumplido = datetime.utcnow() <= ticket.sla_limite
            if ticket.asignado_en:
                delta = ticket.resuelto_en - ticket.creado_en
                ticket.tiempo_resolucion_h = round(delta.total_seconds() / 3600, 2)

        if data.estado == EstadoTicket.cerrado and not ticket.cerrado_en:
            ticket.cerrado_en = datetime.utcnow()

        if data.estado == EstadoTicket.escalado:
            ticket.tecnico_nivel2_id = data.tecnico_nivel2_id or ticket.tecnico_nivel2_id

        ticket.actualizado_en = datetime.utcnow()
        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    # ── COMENTARIOS ───────────────────────────────────────────────────────────
    def agregar_comentario(
        self, ticket_id: int, data: ComentarioCreate, autor: Usuario
    ) -> ComentarioTicket:
        ticket = self.obtener(ticket_id)
        if not ticket:
            raise HTTPException(404, "Ticket no encontrado")
        comentario = ComentarioTicket(
            ticket_id=ticket_id,
            autor_id=autor.id,
            contenido=data.contenido,
            es_interno=data.es_interno,
        )
        self.db.add(comentario)
        ticket.actualizado_en = datetime.utcnow()
        self.db.commit()
        self.db.refresh(comentario)
        return comentario

    def listar_comentarios(self, ticket_id: int) -> List[ComentarioTicket]:
        return self.db.query(ComentarioTicket).filter(
            ComentarioTicket.ticket_id == ticket_id
        ).order_by(ComentarioTicket.creado_en.asc()).all()

    # ── NPS ───────────────────────────────────────────────────────────────────
    def registrar_nps(self, ticket_id: int, data: NPSRequest, usuario: Usuario) -> Ticket:
        ticket = self.obtener(ticket_id)
        if not ticket:
            raise HTTPException(404, "Ticket no encontrado")
        if ticket.solicitante_id != usuario.id:
            raise HTTPException(403, "Solo el solicitante puede calificar")
        if ticket.estado not in [EstadoTicket.resuelto, EstadoTicket.cerrado]:
            raise HTTPException(400, "Solo se puede calificar un ticket resuelto")
        ticket.nps_puntuacion = data.puntuacion
        ticket.nps_comentario = data.comentario
        ticket.nps_enviado    = True
        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    # ── DASHBOARD ─────────────────────────────────────────────────────────────
    def dashboard(self, usuario: Optional[Usuario] = None) -> DashboardResumen:
        ahora = datetime.utcnow()
        q = self.db.query(Ticket)

        def cnt(filters):
            return q.filter(*filters).count()

        abiertos    = cnt([Ticket.estado == EstadoTicket.abierto])
        en_progreso = cnt([Ticket.estado == EstadoTicket.en_progreso])
        pendientes  = cnt([Ticket.estado == EstadoTicket.pendiente])
        escalados   = cnt([Ticket.estado == EstadoTicket.escalado])
        sin_asignar = cnt([Ticket.tecnico_id == None,
                           Ticket.estado.notin_([EstadoTicket.cerrado, EstadoTicket.cancelado])])
        vencidos    = cnt([
            Ticket.sla_limite < ahora,
            Ticket.estado.notin_([EstadoTicket.resuelto, EstadoTicket.cerrado, EstadoTicket.cancelado])
        ])
        por_vencer  = cnt([
            Ticket.sla_limite >= ahora,
            Ticket.sla_limite <= ahora + timedelta(hours=2),
            Ticket.estado.notin_([EstadoTicket.resuelto, EstadoTicket.cerrado, EstadoTicket.cancelado])
        ])
        hoy_inicio  = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
        resueltos_hoy = cnt([
            Ticket.estado == EstadoTicket.resuelto,
            Ticket.resuelto_en >= hoy_inicio,
        ])
        total = q.count()

        nps_result = self.db.query(func.avg(Ticket.nps_puntuacion)).filter(
            Ticket.nps_puntuacion != None
        ).scalar()
        nps_promedio = round(float(nps_result), 1) if nps_result else None

        return DashboardResumen(
            total=total, abiertos=abiertos, en_progreso=en_progreso,
            pendientes=pendientes, escalados=escalados,
            resueltos_hoy=resueltos_hoy, vencidos_sla=vencidos,
            por_vencer_sla=por_vencer, sin_asignar=sin_asignar,
            nps_promedio=nps_promedio,
        )
