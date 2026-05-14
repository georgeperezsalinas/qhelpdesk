from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoNotificacion(str, enum.Enum):
    ticket_nuevo        = "ticket_nuevo"
    ticket_asignado     = "ticket_asignado"
    ticket_actualizado  = "ticket_actualizado"
    ticket_resuelto     = "ticket_resuelto"
    sla_por_vencer      = "sla_por_vencer"
    sla_vencido         = "sla_vencido"
    licencia_por_vencer = "licencia_por_vencer"
    mantenimiento_prog  = "mantenimiento_prog"
    backup_fallido      = "backup_fallido"
    contrato_por_vencer = "contrato_por_vencer"
    sistema             = "sistema"

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id          = Column(Integer, primary_key=True, index=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo        = Column(Enum(TipoNotificacion))
    titulo      = Column(String(300))
    mensaje     = Column(Text)
    url         = Column(String(300))     # enlace al recurso relacionado
    leida       = Column(Boolean, default=False)
    creado_en   = Column(DateTime, default=datetime.utcnow)

    usuario     = relationship("Usuario", back_populates="notificaciones")
