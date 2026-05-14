from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.models.telefonia import TipoLinea

class UsuarioBasico(BaseModel):
    id: int
    nombre: str
    apellido: str
    cargo: Optional[str] = None
    class Config:
        from_attributes = True

class SedeBasica(BaseModel):
    id: int
    nombre: str
    class Config:
        from_attributes = True

class LineaCreate(BaseModel):
    numero: str
    tipo: TipoLinea
    operador: Optional[str] = None
    plan: Optional[str] = None
    costo_mensual: Optional[float] = None
    asignado_a_id: Optional[int] = None
    sede_id: Optional[int] = None
    es_directivo: bool = False
    fecha_asignacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    imei: Optional[str] = None
    equipo_celular: Optional[str] = None
    observaciones: Optional[str] = None

class LineaUpdate(BaseModel):
    operador: Optional[str] = None
    plan: Optional[str] = None
    costo_mensual: Optional[float] = None
    asignado_a_id: Optional[int] = None
    sede_id: Optional[int] = None
    es_directivo: Optional[bool] = None
    fecha_asignacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    activa: Optional[bool] = None
    imei: Optional[str] = None
    equipo_celular: Optional[str] = None
    observaciones: Optional[str] = None

class LineaRead(BaseModel):
    id: int
    numero: str
    tipo: TipoLinea
    operador: Optional[str] = None
    plan: Optional[str] = None
    costo_mensual: Optional[float] = None
    asignado_a_id: Optional[int] = None
    asignado_a: Optional[UsuarioBasico] = None
    sede_id: Optional[int] = None
    sede: Optional[SedeBasica] = None
    es_directivo: bool
    fecha_asignacion: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    activa: bool
    imei: Optional[str] = None
    equipo_celular: Optional[str] = None
    observaciones: Optional[str] = None
    creado_en: datetime
    class Config:
        from_attributes = True

class DashboardTelefonia(BaseModel):
    total_lineas: int
    lineas_activas: int
    fijas: int
    celulares: int
    voip: int
    directivos: int
    costo_mensual_total: float
    por_sede: dict
    por_operador: dict
