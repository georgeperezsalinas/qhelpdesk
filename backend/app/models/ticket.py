from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class PrioridadTicket(str, enum.Enum):
    critica = "critica"   # SLA 4h  – Alta Dirección siempre
    alta    = "alta"      # SLA 8h
    media   = "media"     # SLA 24h
    baja    = "baja"      # SLA 72h

class EstadoTicket(str, enum.Enum):
    abierto       = "abierto"
    asignado      = "asignado"
    en_progreso   = "en_progreso"
    pendiente     = "pendiente"       # esperando respuesta del usuario
    escalado      = "escalado"        # escalado a nivel 2
    resuelto      = "resuelto"
    cerrado       = "cerrado"
    cancelado     = "cancelado"

class CategoriaTicket(str, enum.Enum):
    hardware        = "hardware"
    software        = "software"
    red             = "red"
    acceso          = "acceso"
    vpn             = "vpn"
    correo          = "correo"
    impresora       = "impresora"
    telefonia       = "telefonia"
    servidor        = "servidor"
    seguridad       = "seguridad"
    mantenimiento   = "mantenimiento"
    otro            = "otro"

class CanalEntrada(str, enum.Enum):
    portal  = "portal"
    correo  = "correo"
    whatsapp = "whatsapp"
    llamada = "llamada"
    sistema = "sistema"    # generado automáticamente (monitoreo, mantenimiento)

class Ticket(Base):
    __tablename__ = "tickets"

    id                  = Column(Integer, primary_key=True, index=True)
    numero              = Column(String(20), unique=True, nullable=False, index=True)  # TK-2024-00001
    titulo              = Column(String(300), nullable=False)
    descripcion         = Column(Text)
    prioridad           = Column(Enum(PrioridadTicket), nullable=False, default=PrioridadTicket.media)
    estado              = Column(Enum(EstadoTicket), nullable=False, default=EstadoTicket.abierto)
    categoria           = Column(Enum(CategoriaTicket))
    canal_entrada       = Column(Enum(CanalEntrada), default=CanalEntrada.portal)
    sede_id             = Column(Integer, ForeignKey("sedes.id"), nullable=True)

    # Personas involucradas
    solicitante_id      = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tecnico_id          = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    tecnico_nivel2_id   = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    # Activo relacionado
    equipo_id           = Column(Integer, ForeignKey("equipos.id"), nullable=True)

    # Tiempos y SLA
    creado_en           = Column(DateTime, default=datetime.utcnow, nullable=False)
    actualizado_en      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    asignado_en         = Column(DateTime, nullable=True)
    resuelto_en         = Column(DateTime, nullable=True)
    cerrado_en          = Column(DateTime, nullable=True)
    sla_limite          = Column(DateTime, nullable=True)
    sla_cumplido        = Column(Boolean, nullable=True)
    tiempo_resolucion_h = Column(Float, nullable=True)         # horas reales

    # Resolución
    solucion            = Column(Text, nullable=True)
    articulo_kb_id      = Column(Integer, ForeignKey("articulos_kb.id"), nullable=True)

    # Encuesta de satisfacción
    nps_enviado         = Column(Boolean, default=False)
    nps_puntuacion      = Column(Integer, nullable=True)       # 1-10
    nps_comentario      = Column(Text, nullable=True)

    # Metadatos correo (si ingresó por email)
    email_message_id    = Column(String(300), nullable=True)
    email_asunto        = Column(String(300), nullable=True)

    # Relaciones
    sede                = relationship("Sede",    back_populates="tickets")
    solicitante         = relationship("Usuario", back_populates="tickets_solicitados", foreign_keys=[solicitante_id])
    tecnico             = relationship("Usuario", back_populates="tickets_asignados",   foreign_keys=[tecnico_id])
    tecnico_n2          = relationship("Usuario", foreign_keys=[tecnico_nivel2_id])
    equipo              = relationship("Equipo",  back_populates="tickets")
    comentarios         = relationship("ComentarioTicket", back_populates="ticket", cascade="all, delete-orphan")
    adjuntos            = relationship("AdjuntoTicket",    back_populates="ticket", cascade="all, delete-orphan")
    historial           = relationship("HistorialTicket",  back_populates="ticket", cascade="all, delete-orphan")
    articulo_kb         = relationship("ArticuloKB", foreign_keys=[articulo_kb_id])


class ComentarioTicket(Base):
    __tablename__ = "comentarios_ticket"

    id          = Column(Integer, primary_key=True, index=True)
    ticket_id   = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    autor_id    = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    contenido   = Column(Text, nullable=False)
    es_interno  = Column(Boolean, default=False)   # notas internas del técnico
    creado_en   = Column(DateTime, default=datetime.utcnow)

    ticket      = relationship("Ticket",  back_populates="comentarios")
    autor       = relationship("Usuario", back_populates="comentarios")


class AdjuntoTicket(Base):
    __tablename__ = "adjuntos_ticket"

    id          = Column(Integer, primary_key=True, index=True)
    ticket_id   = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    nombre      = Column(String(300))
    ruta        = Column(String(500))
    tipo_mime   = Column(String(100))
    tamanio_kb  = Column(Integer)
    subido_en   = Column(DateTime, default=datetime.utcnow)

    ticket      = relationship("Ticket", back_populates="adjuntos")


class HistorialTicket(Base):
    __tablename__ = "historial_ticket"

    id              = Column(Integer, primary_key=True, index=True)
    ticket_id       = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    usuario_id      = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    campo           = Column(String(100))      # "estado", "prioridad", "tecnico_id"
    valor_anterior  = Column(String(300))
    valor_nuevo     = Column(String(300))
    creado_en       = Column(DateTime, default=datetime.utcnow)

    ticket          = relationship("Ticket",  back_populates="historial")
