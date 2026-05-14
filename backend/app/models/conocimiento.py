from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class EstadoArticulo(str, enum.Enum):
    borrador    = "borrador"
    publicado   = "publicado"
    archivado   = "archivado"

class ArticuloKB(Base):
    """Base de conocimiento – soluciones reutilizables"""
    __tablename__ = "articulos_kb"

    id              = Column(Integer, primary_key=True, index=True)
    titulo          = Column(String(300), nullable=False)
    contenido       = Column(Text, nullable=False)
    categoria       = Column(String(100))
    tags            = Column(String(300))   # "vpn,acceso,windows" separado por comas
    estado          = Column(Enum(EstadoArticulo), default=EstadoArticulo.borrador)
    autor_id        = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    vistas          = Column(Integer, default=0)
    util_si         = Column(Integer, default=0)
    util_no         = Column(Integer, default=0)
    creado_en       = Column(DateTime, default=datetime.utcnow)
    actualizado_en  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    autor           = relationship("Usuario", foreign_keys=[autor_id])
