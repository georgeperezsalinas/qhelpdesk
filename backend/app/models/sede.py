from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Sede(Base):
    __tablename__ = "sedes"

    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(200), nullable=False)
    codigo      = Column(String(20), unique=True, nullable=False)   # "LIMA-CENTRAL", "AQP-01"
    direccion   = Column(String(300))
    distrito    = Column(String(100))
    provincia   = Column(String(100))
    region      = Column(String(100))
    telefono    = Column(String(30))
    es_central  = Column(Boolean, default=False)
    activa      = Column(Boolean, default=True)
    observaciones = Column(Text)

    # Relaciones
    usuarios    = relationship("Usuario",   back_populates="sede")
    equipos     = relationship("Equipo",    back_populates="sede")
    tickets     = relationship("Ticket",    back_populates="sede")
