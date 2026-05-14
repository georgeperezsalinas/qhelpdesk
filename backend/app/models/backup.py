from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Boolean, Text, ForeignKey, Time
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class EstadoBackup(str, enum.Enum):
    exitoso     = "exitoso"
    fallido     = "fallido"
    parcial     = "parcial"
    corriendo   = "corriendo"
    cancelado   = "cancelado"

class TipoBackup(str, enum.Enum):
    full            = "full"
    incremental     = "incremental"
    diferencial     = "diferencial"

class PoliticaBackup(Base):
    """Define qué se respalda, cuándo y dónde"""
    __tablename__ = "politicas_backup"

    id              = Column(Integer, primary_key=True, index=True)
    nombre          = Column(String(200), nullable=False)
    servidor        = Column(String(200))
    ruta_origen     = Column(String(300))
    ruta_destino    = Column(String(300))
    tipo            = Column(Enum(TipoBackup))
    frecuencia      = Column(String(50))    # "diario", "semanal", "mensual"
    hora_ejecucion  = Column(Time)
    retencion_dias  = Column(Integer, default=30)
    activa          = Column(Boolean, default=True)
    responsable_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    observaciones   = Column(Text)
    creado_en       = Column(DateTime, default=datetime.utcnow)

    ejecuciones     = relationship("EjecucionBackup", back_populates="politica")


class EjecucionBackup(Base):
    """Registro de cada ejecución de backup"""
    __tablename__ = "ejecuciones_backup"

    id              = Column(Integer, primary_key=True, index=True)
    politica_id     = Column(Integer, ForeignKey("politicas_backup.id"), nullable=False)
    estado          = Column(Enum(EstadoBackup))
    inicio          = Column(DateTime, nullable=False)
    fin             = Column(DateTime, nullable=True)
    tamanio_gb      = Column(Float, nullable=True)
    archivos_total  = Column(Integer, nullable=True)
    ruta_archivo    = Column(String(500))
    hash_md5        = Column(String(64), nullable=True)    # para verificar integridad

    # Verificación de restauración
    verificado          = Column(Boolean, default=False)
    fecha_verificacion  = Column(DateTime, nullable=True)
    verificado_por_id   = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    resultado_verificacion = Column(Text, nullable=True)

    alertado        = Column(Boolean, default=False)
    log             = Column(Text, nullable=True)

    politica        = relationship("PoliticaBackup", back_populates="ejecuciones")
