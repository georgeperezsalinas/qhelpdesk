from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, time
from app.models.backup import EstadoBackup, TipoBackup

class UsuarioBasico(BaseModel):
    id: int
    nombre: str
    apellido: str
    class Config:
        from_attributes = True

class PoliticaCreate(BaseModel):
    nombre: str
    servidor: str
    ruta_origen: str
    ruta_destino: str
    tipo: TipoBackup
    frecuencia: str
    hora_ejecucion: Optional[time] = None
    retencion_dias: int = 30
    responsable_id: Optional[int] = None
    observaciones: Optional[str] = None

class PoliticaUpdate(BaseModel):
    nombre: Optional[str] = None
    ruta_destino: Optional[str] = None
    frecuencia: Optional[str] = None
    hora_ejecucion: Optional[time] = None
    retencion_dias: Optional[int] = None
    activa: Optional[bool] = None
    responsable_id: Optional[int] = None
    observaciones: Optional[str] = None

class PoliticaRead(BaseModel):
    id: int
    nombre: str
    servidor: str
    ruta_origen: str
    ruta_destino: str
    tipo: TipoBackup
    frecuencia: str
    hora_ejecucion: Optional[time] = None
    retencion_dias: int
    activa: bool
    responsable_id: Optional[int] = None
    responsable: Optional[UsuarioBasico] = None
    observaciones: Optional[str] = None
    # Calculados
    total_ejecuciones: Optional[int] = None
    exitosas: Optional[int] = None
    fallidas: Optional[int] = None
    ultima_ejecucion: Optional[datetime] = None
    ultimo_estado: Optional[str] = None
    class Config:
        from_attributes = True

class EjecucionRead(BaseModel):
    id: int
    politica_id: int
    estado: EstadoBackup
    inicio: datetime
    fin: Optional[datetime] = None
    tamanio_gb: Optional[float] = None
    archivos_total: Optional[int] = None
    ruta_archivo: Optional[str] = None
    hash_md5: Optional[str] = None
    verificado: bool
    fecha_verificacion: Optional[datetime] = None
    verificado_por: Optional[UsuarioBasico] = None
    resultado_verificacion: Optional[str] = None
    alertado: bool
    log: Optional[str] = None
    duracion_minutos: Optional[int] = None
    class Config:
        from_attributes = True

class VerificacionRequest(BaseModel):
    resultado: str
    exitosa: bool

class DashboardBackup(BaseModel):
    total_politicas: int
    politicas_activas: int
    ejecuciones_hoy: int
    exitosas_hoy: int
    fallidas_hoy: int
    fallidas_semana: int
    sin_verificar: int
    tamanio_total_gb: float
    tasa_exito_7d: float
