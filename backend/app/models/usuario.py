from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class RolUsuario(str, enum.Enum):
    jefe             = "jefe"
    especialista     = "especialista"
    mesa_ayuda       = "mesa_ayuda"
    alta_direccion   = "alta_direccion"
    usuario_final    = "usuario_final"
    usuario_externo  = "usuario_externo"

class TurnoTecnico(str, enum.Enum):
    manana  = "manana"
    tarde   = "tarde"
    noche   = "noche"

class Usuario(Base):
    __tablename__ = "usuarios"

    id                  = Column(Integer, primary_key=True, index=True)
    username            = Column(String(100), unique=True, nullable=False, index=True)
    email               = Column(String(200), unique=True, nullable=False, index=True)
    nombre              = Column(String(150), nullable=False)
    apellido            = Column(String(150), nullable=False)
    hashed_password     = Column(String(300))
    rol                 = Column(Enum(RolUsuario), nullable=False, default=RolUsuario.usuario_final)
    cargo               = Column(String(200))
    area                = Column(String(200))
    sede_id             = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    telefono            = Column(String(30))
    celular             = Column(String(30))
    activo              = Column(Boolean, default=True)
    ldap_dn             = Column(String(500))                   # para AD/LDAP
    foto_url            = Column(String(500))
    turno               = Column(Enum(TurnoTecnico), nullable=True)
    skills              = Column(Text)                          # "redes,servidores,impresoras"
    carga_maxima        = Column(Integer, default=10)           # tickets simultáneos
    creado_en           = Column(DateTime, default=datetime.utcnow)
    ultimo_acceso       = Column(DateTime, nullable=True)

    # Relaciones
    sede                = relationship("Sede",    back_populates="usuarios")
    tickets_solicitados = relationship("Ticket",  back_populates="solicitante",  foreign_keys="Ticket.solicitante_id")
    tickets_asignados   = relationship("Ticket",  back_populates="tecnico",      foreign_keys="Ticket.tecnico_id")
    comentarios         = relationship("ComentarioTicket", back_populates="autor")
    ordenes_mantenimiento = relationship("OrdenMantenimiento", back_populates="tecnico", foreign_keys="OrdenMantenimiento.tecnico_id")
    solicitudes_compra  = relationship("SolicitudCompra", back_populates="solicitante", foreign_keys="SolicitudCompra.solicitante_id")
    notificaciones      = relationship("Notificacion", back_populates="usuario")
