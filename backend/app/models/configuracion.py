from sqlalchemy import Column, Integer, String, Text, DateTime, text
from datetime import datetime
from app.core.database import Base


class ConfiguracionApp(Base):
    __tablename__ = "configuracion_app"

    id             = Column(Integer, primary_key=True, index=True)
    clave          = Column(String(100), unique=True, nullable=False, index=True)
    valor          = Column(Text, nullable=True)
    actualizado_en = Column(DateTime, default=datetime.utcnow,
                            onupdate=datetime.utcnow, server_default=text("now()"))
