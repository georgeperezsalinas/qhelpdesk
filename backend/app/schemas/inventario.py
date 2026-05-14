from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.inventario import TipoEquipo, EstadoEquipo

class UsuarioBasico(BaseModel):
    id: int
    nombre: str
    apellido: str
    username: str
    class Config:
        from_attributes = True

class SedeBasica(BaseModel):
    id: int
    nombre: str
    codigo: str
    class Config:
        from_attributes = True

class ProveedorBasico(BaseModel):
    id: int
    razon_social: str
    ruc: str
    class Config:
        from_attributes = True

class EquipoCreate(BaseModel):
    codigo_inventario: str
    codigo_patrimonial: Optional[str] = None
    tipo: TipoEquipo
    marca: str
    modelo: str
    serie: Optional[str] = None
    procesador: Optional[str] = None
    ram_gb: Optional[int] = None
    disco_gb: Optional[int] = None
    pantalla_pulgadas: Optional[float] = None
    sistema_operativo: Optional[str] = None
    office_version: Optional[str] = None
    mac_address: Optional[str] = None
    ip_asignada: Optional[str] = None
    usuario_asignado_id: Optional[int] = None
    sede_id: Optional[int] = None
    ubicacion_fisica: Optional[str] = None
    proveedor_id: Optional[int] = None
    orden_compra: Optional[str] = None
    fecha_compra: Optional[date] = None
    valor_compra: Optional[float] = None
    vida_util_anios: int = 4
    valor_residual: float = 0
    garantia_hasta: Optional[date] = None
    poliza_seguro: Optional[str] = None
    observaciones: Optional[str] = None

class EquipoUpdate(BaseModel):
    codigo_patrimonial: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie: Optional[str] = None
    procesador: Optional[str] = None
    ram_gb: Optional[int] = None
    disco_gb: Optional[int] = None
    sistema_operativo: Optional[str] = None
    office_version: Optional[str] = None
    mac_address: Optional[str] = None
    ip_asignada: Optional[str] = None
    estado: Optional[EstadoEquipo] = None
    usuario_asignado_id: Optional[int] = None
    sede_id: Optional[int] = None
    ubicacion_fisica: Optional[str] = None
    proveedor_id: Optional[int] = None
    garantia_hasta: Optional[date] = None
    observaciones: Optional[str] = None

class EquipoRead(BaseModel):
    id: int
    codigo_inventario: str
    codigo_patrimonial: Optional[str] = None
    tipo: TipoEquipo
    marca: str
    modelo: str
    serie: Optional[str] = None
    procesador: Optional[str] = None
    ram_gb: Optional[int] = None
    disco_gb: Optional[int] = None
    pantalla_pulgadas: Optional[float] = None
    sistema_operativo: Optional[str] = None
    office_version: Optional[str] = None
    mac_address: Optional[str] = None
    ip_asignada: Optional[str] = None
    estado: EstadoEquipo
    usuario_asignado_id: Optional[int] = None
    usuario_asignado: Optional[UsuarioBasico] = None
    sede_id: Optional[int] = None
    sede: Optional[SedeBasica] = None
    ubicacion_fisica: Optional[str] = None
    proveedor_id: Optional[int] = None
    proveedor: Optional[ProveedorBasico] = None
    orden_compra: Optional[str] = None
    fecha_compra: Optional[date] = None
    valor_compra: Optional[float] = None
    vida_util_anios: int = 4
    valor_residual: float = 0
    garantia_hasta: Optional[date] = None
    poliza_seguro: Optional[str] = None
    observaciones: Optional[str] = None
    creado_en: datetime
    depreciacion_anual: Optional[float] = None
    valor_actual: Optional[float] = None
    anios_uso: Optional[float] = None
    garantia_vigente: Optional[bool] = None
    class Config:
        from_attributes = True

class AsignacionRequest(BaseModel):
    usuario_id: Optional[int] = None
    sede_id: Optional[int] = None
    ubicacion_fisica: Optional[str] = None
    motivo: str
    acta_numero: Optional[str] = None

class LicenciaCreate(BaseModel):
    software: str
    version: Optional[str] = None
    fabricante: Optional[str] = None
    tipo_licencia: str
    cantidad_total: int = 1
    clave: Optional[str] = None
    proveedor_id: Optional[int] = None
    orden_compra: Optional[str] = None
    fecha_compra: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    valor: Optional[float] = None
    observaciones: Optional[str] = None

class LicenciaUpdate(BaseModel):
    version: Optional[str] = None
    cantidad_total: Optional[int] = None
    clave: Optional[str] = None
    fecha_vencimiento: Optional[date] = None
    valor: Optional[float] = None
    activa: Optional[bool] = None
    observaciones: Optional[str] = None

class LicenciaRead(BaseModel):
    id: int
    software: str
    version: Optional[str] = None
    fabricante: Optional[str] = None
    tipo_licencia: str
    cantidad_total: int
    cantidad_usada: int
    clave: Optional[str] = None
    proveedor_id: Optional[int] = None
    proveedor: Optional[ProveedorBasico] = None
    orden_compra: Optional[str] = None
    fecha_compra: Optional[date] = None
    fecha_vencimiento: Optional[date] = None
    valor: Optional[float] = None
    alerta_30: bool = False
    alerta_15: bool = False
    alerta_7: bool = False
    activa: bool
    observaciones: Optional[str] = None
    creado_en: datetime
    disponibles: Optional[int] = None
    dias_para_vencer: Optional[int] = None
    estado_vencimiento: Optional[str] = None
    class Config:
        from_attributes = True

class DashboardInventario(BaseModel):
    total_equipos: int
    activos: int
    en_mantenimiento: int
    de_baja: int
    garantia_por_vencer: int
    garantia_vencida: int
    valor_total_inventario: float
    valor_depreciado_total: float
    total_licencias: int
    licencias_por_vencer: int
    licencias_vencidas: int
    licencias_disponibles: int
