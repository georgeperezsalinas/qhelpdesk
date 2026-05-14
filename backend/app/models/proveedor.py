from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Proveedor(Base):
    __tablename__ = "proveedores"

    id          = Column(Integer, primary_key=True, index=True)
    razon_social = Column(String(300), nullable=False)
    ruc         = Column(String(20), unique=True, nullable=False)
    contacto    = Column(String(200))
    telefono    = Column(String(30))
    email       = Column(String(200))
    web         = Column(String(200))
    direccion   = Column(String(300))
    categoria   = Column(String(100))   # hardware, software, servicios, telecomunicaciones
    activo      = Column(Boolean, default=True)
    observaciones = Column(Text)
    creado_en   = Column(DateTime, default=datetime.utcnow)

    equipos     = relationship("Equipo",          back_populates="proveedor")
    licencias   = relationship("Licencia",        back_populates="proveedor")
    solicitudes = relationship("SolicitudCompra", back_populates="proveedor")
    contratos   = relationship("Contrato",        back_populates="proveedor")
