from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Enum, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoServidor(str, enum.Enum):
    fisico      = "fisico"
    virtual     = "virtual"
    nube        = "nube"

class EstadoServicio(str, enum.Enum):
    operativo   = "operativo"
    degradado   = "degradado"
    fuera       = "fuera"
    mantenimiento = "mantenimiento"

class Servidor(Base):
    __tablename__ = "servidores"

    id              = Column(Integer, primary_key=True, index=True)
    nombre          = Column(String(200), nullable=False)
    hostname        = Column(String(200), unique=True)
    ip_gestion      = Column(String(20))
    tipo            = Column(Enum(TipoServidor))
    sistema_operativo = Column(String(100))
    version_so      = Column(String(50))
    cpu_nucleos     = Column(Integer)
    ram_gb          = Column(Integer)
    disco_total_tb  = Column(Float)
    sede_id         = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    rack            = Column(String(50))
    estado          = Column(Enum(EstadoServicio), default=EstadoServicio.operativo)
    responsable_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    servicios       = Column(Text)      # "Web, BD, Correo" – lista separada por comas
    observaciones   = Column(Text)
    creado_en       = Column(DateTime, default=datetime.utcnow)
    actualizado_en  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bases_datos     = relationship("BaseDatos", back_populates="servidor")


class BaseDatos(Base):
    __tablename__ = "bases_datos"

    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(200), nullable=False)
    motor       = Column(String(50))        # PostgreSQL, SQL Server, Oracle, MySQL
    version     = Column(String(50))
    servidor_id = Column(Integer, ForeignKey("servidores.id"))
    puerto      = Column(Integer)
    sistema_info = Column(String(200))      # sistema de información al que pertenece
    tamanio_gb  = Column(Float)
    activa      = Column(Boolean, default=True)
    responsable_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    observaciones = Column(Text)
    creado_en   = Column(DateTime, default=datetime.utcnow)

    servidor    = relationship("Servidor", back_populates="bases_datos")


class DispositivoRed(Base):
    __tablename__ = "dispositivos_red"

    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(200))
    tipo        = Column(String(50))    # switch, router, firewall, access_point, vpn
    marca       = Column(String(100))
    modelo      = Column(String(200))
    serie       = Column(String(200))
    ip_gestion  = Column(String(20))
    sede_id     = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    ubicacion   = Column(String(200))
    estado      = Column(Enum(EstadoServicio), default=EstadoServicio.operativo)
    firmware    = Column(String(50))
    fecha_compra = Column(DateTime, nullable=True)
    garantia_hasta = Column(DateTime, nullable=True)
    observaciones = Column(Text)
    creado_en   = Column(DateTime, default=datetime.utcnow)
