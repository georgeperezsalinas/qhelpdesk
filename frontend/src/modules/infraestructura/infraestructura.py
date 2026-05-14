from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.infraestructura import TipoServidor, EstadoServicio

class SedeBasica(BaseModel):
    id: int
    nombre: str
    codigo: str
    class Config:
        from_attributes = True

class UsuarioBasico(BaseModel):
    id: int
    nombre: str
    apellido: str
    class Config:
        from_attributes = True

class BaseDatosRead(BaseModel):
    id: int
    nombre: str
    motor: Optional[str] = None
    version: Optional[str] = None
    servidor_id: int
    puerto: Optional[int] = None
    sistema_info: Optional[str] = None
    tamanio_gb: Optional[float] = None
    activa: bool
    responsable_id: Optional[int] = None
    observaciones: Optional[str] = None
    creado_en: datetime
    class Config:
        from_attributes = True

class ServidorCreate(BaseModel):
    nombre: str
    hostname: Optional[str] = None
    ip_gestion: Optional[str] = None
    tipo: TipoServidor
    sistema_operativo: Optional[str] = None
    version_so: Optional[str] = None
    cpu_nucleos: Optional[int] = None
    ram_gb: Optional[int] = None
    disco_total_tb: Optional[float] = None
    sede_id: Optional[int] = None
    rack: Optional[str] = None
    estado: EstadoServicio = EstadoServicio.operativo
    responsable_id: Optional[int] = None
    servicios: Optional[str] = None
    observaciones: Optional[str] = None

class ServidorUpdate(BaseModel):
    estado: Optional[EstadoServicio] = None
    ip_gestion: Optional[str] = None
    version_so: Optional[str] = None
    ram_gb: Optional[int] = None
    disco_total_tb: Optional[float] = None
    responsable_id: Optional[int] = None
    servicios: Optional[str] = None
    observaciones: Optional[str] = None

class ServidorRead(BaseModel):
    id: int
    nombre: str
    hostname: Optional[str] = None
    ip_gestion: Optional[str] = None
    tipo: TipoServidor
    sistema_operativo: Optional[str] = None
    version_so: Optional[str] = None
    cpu_nucleos: Optional[int] = None
    ram_gb: Optional[int] = None
    disco_total_tb: Optional[float] = None
    sede_id: Optional[int] = None
    sede: Optional[SedeBasica] = None
    rack: Optional[str] = None
    estado: EstadoServicio
    responsable_id: Optional[int] = None
    responsable: Optional[UsuarioBasico] = None
    servicios: Optional[str] = None
    observaciones: Optional[str] = None
    creado_en: datetime
    bases_datos: List[BaseDatosRead] = []
    class Config:
        from_attributes = True

class DispositivoCreate(BaseModel):
    nombre: str
    tipo: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie: Optional[str] = None
    ip_gestion: Optional[str] = None
    sede_id: Optional[int] = None
    ubicacion: Optional[str] = None
    estado: EstadoServicio = EstadoServicio.operativo
    firmware: Optional[str] = None
    observaciones: Optional[str] = None

class DispositivoUpdate(BaseModel):
    estado: Optional[EstadoServicio] = None
    ip_gestion: Optional[str] = None
    firmware: Optional[str] = None
    ubicacion: Optional[str] = None
    observaciones: Optional[str] = None

class DispositivoRead(BaseModel):
    id: int
    nombre: str
    tipo: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie: Optional[str] = None
    ip_gestion: Optional[str] = None
    sede_id: Optional[int] = None
    sede: Optional[SedeBasica] = None
    ubicacion: Optional[str] = None
    estado: EstadoServicio
    firmware: Optional[str] = None
    observaciones: Optional[str] = None
    creado_en: datetime
    class Config:
        from_attributes = True

class DashboardInfraestructura(BaseModel):
    total_servidores: int
    servidores_operativos: int
    servidores_degradados: int
    servidores_fuera: int
    total_dispositivos: int
    dispositivos_operativos: int
    dispositivos_con_problema: int
    total_bases_datos: int
    bases_datos_activas: int
