from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.models.compra import EstadoSolicitud, TipoSolicitud

class UsuarioBasico(BaseModel):
    id: int
    nombre: str
    apellido: str
    username: str
    class Config:
        from_attributes = True

class ProveedorBasico(BaseModel):
    id: int
    razon_social: str
    ruc: str
    class Config:
        from_attributes = True

class ItemCreate(BaseModel):
    descripcion: str
    cantidad: int = 1
    unidad: Optional[str] = None
    precio_unitario: Optional[float] = None

class ItemRead(BaseModel):
    id: int
    descripcion: str
    cantidad: int
    unidad: Optional[str] = None
    precio_unitario: Optional[float] = None
    subtotal: Optional[float] = None
    class Config:
        from_attributes = True

class SolicitudCreate(BaseModel):
    tipo: TipoSolicitud
    descripcion: str
    justificacion: Optional[str] = None
    especificaciones: Optional[str] = None
    proveedor_id: Optional[int] = None
    valor_estimado: Optional[float] = None
    presupuesto_codigo: Optional[str] = None
    fecha_necesidad: Optional[date] = None
    items: Optional[List[ItemCreate]] = []

class SolicitudUpdate(BaseModel):
    estado: Optional[EstadoSolicitud] = None
    proveedor_id: Optional[int] = None
    valor_aprobado: Optional[float] = None
    valor_final: Optional[float] = None
    orden_compra_numero: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    observaciones: Optional[str] = None
    fecha_necesidad: Optional[date] = None

class SolicitudRead(BaseModel):
    id: int
    numero: str
    tipo: TipoSolicitud
    estado: EstadoSolicitud
    descripcion: str
    justificacion: Optional[str] = None
    especificaciones: Optional[str] = None
    solicitante_id: int
    solicitante: Optional[UsuarioBasico] = None
    aprobador_id: Optional[int] = None
    aprobador: Optional[UsuarioBasico] = None
    proveedor_id: Optional[int] = None
    proveedor: Optional[ProveedorBasico] = None
    valor_estimado: Optional[float] = None
    valor_aprobado: Optional[float] = None
    valor_final: Optional[float] = None
    moneda: str = "PEN"
    presupuesto_codigo: Optional[str] = None
    orden_compra_numero: Optional[str] = None
    fecha_necesidad: Optional[date] = None
    fecha_aprobacion: Optional[datetime] = None
    fecha_recepcion: Optional[datetime] = None
    motivo_rechazo: Optional[str] = None
    observaciones: Optional[str] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    items: List[ItemRead] = []
    class Config:
        from_attributes = True

class DashboardCompras(BaseModel):
    total: int
    borradores: int
    enviadas: int
    aprobadas: int
    en_proceso: int
    recibidas: int
    rechazadas: int
    valor_total_aprobado: float
    valor_total_recibido: float
    por_tipo: dict
