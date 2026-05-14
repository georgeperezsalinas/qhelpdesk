from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, Float, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoLinea(str, enum.Enum):
    fija        = "fija"
    celular     = "celular"
    voip        = "voip"
    fax         = "fax"

class LineaTelefonica(Base):
    __tablename__ = "lineas_telefonicas"

    id                  = Column(Integer, primary_key=True, index=True)
    numero              = Column(String(30), unique=True, nullable=False)
    tipo                = Column(Enum(TipoLinea))
    operador            = Column(String(100))
    plan                = Column(String(200))
    costo_mensual       = Column(Float)
    asignado_a_id       = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    sede_id             = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    es_directivo        = Column(Boolean, default=False)
    fecha_asignacion    = Column(Date, nullable=True)
    fecha_vencimiento   = Column(Date, nullable=True)
    activa              = Column(Boolean, default=True)

    # Datos del equipo celular
    imei                = Column(String(50), nullable=True)
    equipo_celular      = Column(String(200), nullable=True)
    equipo_id           = Column(Integer, ForeignKey("equipos.id"), nullable=True)

    observaciones       = Column(Text)
    creado_en           = Column(DateTime, default=datetime.utcnow)

    asignado_a          = relationship("Usuario", foreign_keys=[asignado_a_id])
    sede                = relationship("Sede",    foreign_keys=[sede_id])
    equipo              = relationship("Equipo",  foreign_keys=[equipo_id])


class CentralTelefonica(Base):
    __tablename__ = "centrales_telefonicas"

    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(200))
    marca       = Column(String(100))
    modelo      = Column(String(200))
    ip          = Column(String(20))
    sede_id     = Column(Integer, ForeignKey("sedes.id"))
    extensiones_total = Column(Integer)
    en_garantia = Column(Boolean, default=False)
    activa      = Column(Boolean, default=True)
    observaciones = Column(Text)
    creado_en   = Column(DateTime, default=datetime.utcnow)
