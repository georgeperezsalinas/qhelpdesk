from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.models.mantenimiento import TipoMantenimiento, EstadoOrden, OrigenOrden

class UsuarioBasico(BaseModel):
    id: int
    nombre: str
    apellido: str
    username: str
    class Config:
        from_attributes = True

class EquipoBasico(BaseModel):
    id: int
    codigo_inventario: str
    marca: str
    modelo: str
    tipo: str
    sede_id: Optional[int] = None
    class Config:
        from_attributes = True

class ChecklistItem(BaseModel):
    id: Optional[int] = None
    tarea: str
    completado: bool = False
    observacion: Optional[str] = None
    class Config:
        from_attributes = True

class OrdenCreate(BaseModel):
    tipo: TipoMantenimiento
    equipo_id: int
    tecnico_id: Optional[int] = None
    fecha_programada: date
    descripcion: str
    cronograma_id: Optional[int] = None
    checklist: Optional[List[str]] = None   # lista de tareas

class OrdenUpdate(BaseModel):
    estado: Optional[EstadoOrden] = None
    tecnico_id: Optional[int] = None
    fecha_programada: Optional[date] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    trabajos_realizados: Optional[str] = None
    repuestos_usados: Optional[str] = None
    costo: Optional[float] = None
    proxima_fecha: Optional[date] = None
    requiere_baja: Optional[bool] = None

class OrdenRead(BaseModel):
    id: int
    numero: str
    tipo: TipoMantenimiento
    origen: OrigenOrden
    estado: EstadoOrden
    equipo_id: int
    equipo: Optional[EquipoBasico] = None
    tecnico_id: Optional[int] = None
    tecnico: Optional[UsuarioBasico] = None
    ticket_origen_id: Optional[int] = None
    cronograma_id: Optional[int] = None
    fecha_programada: date
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    duracion_minutos: Optional[int] = None
    costo: Optional[float] = None
    descripcion: str
    trabajos_realizados: Optional[str] = None
    repuestos_usados: Optional[str] = None
    proxima_fecha: Optional[date] = None
    requiere_baja: bool = False
    creado_en: datetime
    checklist: List[ChecklistItem] = []
    class Config:
        from_attributes = True

class CronogramaRead(BaseModel):
    id: int
    nombre: str
    tipo_equipo: Optional[str] = None
    frecuencia_dias: Optional[int] = None
    descripcion_tareas: Optional[str] = None
    activo: bool
    class Config:
        from_attributes = True

class DashboardMantenimiento(BaseModel):
    total: int
    programados: int
    en_proceso: int
    completados_mes: int
    postergados: int
    preventivos: int
    correctivos: int
    proximos_7_dias: int
    vencidos: int
