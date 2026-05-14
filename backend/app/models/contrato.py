from sqlalchemy import Column, Integer, String, Float, Date, Boolean, Enum, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoContrato(str, enum.Enum):
    mantenimiento   = "mantenimiento"
    soporte         = "soporte"
    licencia        = "licencia"
    servicio        = "servicio"
    alquiler        = "alquiler"
    otro            = "otro"

class EstadoContrato(str, enum.Enum):
    vigente     = "vigente"
    por_vencer  = "por_vencer"
    vencido     = "vencido"
    rescindido  = "rescindido"

class Contrato(Base):
    __tablename__ = "contratos"

    id              = Column(Integer, primary_key=True, index=True)
    numero          = Column(String(100), unique=True, nullable=False)
    tipo            = Column(Enum(TipoContrato))
    objeto          = Column(Text)
    proveedor_id    = Column(Integer, ForeignKey("proveedores.id"), nullable=False)
    estado          = Column(Enum(EstadoContrato), default=EstadoContrato.vigente)
    fecha_inicio    = Column(Date)
    fecha_fin       = Column(Date)
    monto           = Column(Float)
    moneda          = Column(String(5), default="PEN")
    alerta_30       = Column(Boolean, default=False)
    alerta_15       = Column(Boolean, default=False)
    alerta_7        = Column(Boolean, default=False)
    archivo_url     = Column(String(500))
    observaciones   = Column(Text)
    creado_en       = Column(DateTime, default=datetime.utcnow)

    proveedor       = relationship("Proveedor", back_populates="contratos")
