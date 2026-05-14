from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Text, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class EstadoSolicitud(str, enum.Enum):
    borrador        = "borrador"
    enviada         = "enviada"
    aprobada        = "aprobada"
    rechazada       = "rechazada"
    en_cotizacion   = "en_cotizacion"
    en_proceso      = "en_proceso"
    recibida        = "recibida"
    cancelada       = "cancelada"

class TipoSolicitud(str, enum.Enum):
    equipo_nuevo    = "equipo_nuevo"
    repuesto        = "repuesto"
    licencia        = "licencia"
    servicio        = "servicio"
    renovacion      = "renovacion"
    otro            = "otro"

class SolicitudCompra(Base):
    __tablename__ = "solicitudes_compra"

    id                  = Column(Integer, primary_key=True, index=True)
    numero              = Column(String(20), unique=True, nullable=False)
    tipo                = Column(Enum(TipoSolicitud))
    estado              = Column(Enum(EstadoSolicitud), default=EstadoSolicitud.borrador)
    descripcion         = Column(Text, nullable=False)
    justificacion       = Column(Text)
    especificaciones    = Column(Text)

    solicitante_id      = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    aprobador_id        = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    proveedor_id        = Column(Integer, ForeignKey("proveedores.id"), nullable=True)

    valor_estimado      = Column(Float)
    valor_aprobado      = Column(Float, nullable=True)
    valor_final         = Column(Float, nullable=True)
    moneda              = Column(String(5), default="PEN")
    presupuesto_codigo  = Column(String(100))    # código de partida presupuestal
    orden_compra_numero = Column(String(100), nullable=True)

    fecha_necesidad     = Column(Date, nullable=True)
    fecha_aprobacion    = Column(DateTime, nullable=True)
    fecha_recepcion     = Column(DateTime, nullable=True)

    motivo_rechazo      = Column(Text, nullable=True)
    observaciones       = Column(Text, nullable=True)

    creado_en           = Column(DateTime, default=datetime.utcnow)
    actualizado_en      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    solicitante         = relationship("Usuario",   back_populates="solicitudes_compra", foreign_keys=[solicitante_id])
    aprobador           = relationship("Usuario",   foreign_keys=[aprobador_id])
    proveedor           = relationship("Proveedor", back_populates="solicitudes")
    items               = relationship("ItemSolicitud", back_populates="solicitud", cascade="all, delete-orphan")


class ItemSolicitud(Base):
    __tablename__ = "items_solicitud"

    id              = Column(Integer, primary_key=True, index=True)
    solicitud_id    = Column(Integer, ForeignKey("solicitudes_compra.id"), nullable=False)
    descripcion     = Column(String(300), nullable=False)
    cantidad        = Column(Integer, default=1)
    unidad          = Column(String(50))
    precio_unitario = Column(Float)
    subtotal        = Column(Float)

    solicitud       = relationship("SolicitudCompra", back_populates="items")
