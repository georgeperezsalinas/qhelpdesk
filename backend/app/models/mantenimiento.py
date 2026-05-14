from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Enum, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoMantenimiento(str, enum.Enum):
    preventivo  = "preventivo"
    correctivo  = "correctivo"

class EstadoOrden(str, enum.Enum):
    programado  = "programado"
    en_proceso  = "en_proceso"
    completado  = "completado"
    cancelado   = "cancelado"
    postergado  = "postergado"

class OrigenOrden(str, enum.Enum):
    manual      = "manual"        # creada por técnico
    automatico  = "automatico"    # generada por el sistema según cronograma
    ticket      = "ticket"        # derivada de un ticket

class OrdenMantenimiento(Base):
    __tablename__ = "ordenes_mantenimiento"

    id                  = Column(Integer, primary_key=True, index=True)
    numero              = Column(String(20), unique=True, nullable=False)
    tipo                = Column(Enum(TipoMantenimiento), nullable=False)
    origen              = Column(Enum(OrigenOrden), default=OrigenOrden.manual)
    estado              = Column(Enum(EstadoOrden), default=EstadoOrden.programado)

    equipo_id           = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    tecnico_id          = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ticket_origen_id    = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    cronograma_id       = Column(Integer, ForeignKey("cronogramas_mantenimiento.id"), nullable=True)

    fecha_programada    = Column(Date, nullable=False)
    fecha_inicio        = Column(DateTime, nullable=True)
    fecha_fin           = Column(DateTime, nullable=True)
    duracion_minutos    = Column(Integer, nullable=True)
    costo               = Column(Float, nullable=True)

    descripcion         = Column(Text)
    trabajos_realizados = Column(Text, nullable=True)
    repuestos_usados    = Column(Text, nullable=True)
    proxima_fecha       = Column(Date, nullable=True)
    requiere_baja       = Column(Boolean, default=False)

    creado_en           = Column(DateTime, default=datetime.utcnow)
    actualizado_en      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    equipo      = relationship("Equipo",  back_populates="ordenes_mantenimiento")
    tecnico     = relationship("Usuario", back_populates="ordenes_mantenimiento", foreign_keys=[tecnico_id])
    checklist   = relationship("ChecklistMantenimiento", back_populates="orden", cascade="all, delete-orphan")


class CronogramaMantenimiento(Base):
    """Define la frecuencia de mantenimiento preventivo por tipo de equipo"""
    __tablename__ = "cronogramas_mantenimiento"

    id                  = Column(Integer, primary_key=True, index=True)
    nombre              = Column(String(200), nullable=False)
    tipo_equipo         = Column(String(50))       # aplica a este tipo de equipo
    frecuencia_dias     = Column(Integer)          # cada cuántos días
    descripcion_tareas  = Column(Text)             # qué se hace en cada mantenimiento
    activo              = Column(Boolean, default=True)
    creado_en           = Column(DateTime, default=datetime.utcnow)


class ChecklistMantenimiento(Base):
    """Checklist de tareas para cada orden de mantenimiento"""
    __tablename__ = "checklist_mantenimiento"

    id          = Column(Integer, primary_key=True, index=True)
    orden_id    = Column(Integer, ForeignKey("ordenes_mantenimiento.id"), nullable=False)
    tarea       = Column(String(300), nullable=False)
    completado  = Column(Boolean, default=False)
    observacion = Column(Text, nullable=True)

    orden       = relationship("OrdenMantenimiento", back_populates="checklist")
