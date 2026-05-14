from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.ticket import (
    PrioridadTicket, EstadoTicket, CategoriaTicket, CanalEntrada
)

# ── Schemas anidados simples ──────────────────────────────────────────────────
class UsuarioBasico(BaseModel):
    id: int
    nombre: str
    apellido: str
    username: str
    rol: str
    class Config:
        from_attributes = True

class SedeBasica(BaseModel):
    id: int
    nombre: str
    codigo: str
    class Config:
        from_attributes = True

class EquipoBasico(BaseModel):
    id: int
    codigo_inventario: str
    marca: str
    modelo: str
    class Config:
        from_attributes = True

class ArticuloBasico(BaseModel):
    id: int
    titulo: str
    class Config:
        from_attributes = True

# ── Ticket ────────────────────────────────────────────────────────────────────
class TicketCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    prioridad: PrioridadTicket = PrioridadTicket.media
    categoria: Optional[CategoriaTicket] = None
    canal_entrada: CanalEntrada = CanalEntrada.portal
    sede_id: Optional[int] = None
    equipo_id: Optional[int] = None
    tecnico_id: Optional[int] = None

    @field_validator("titulo")
    @classmethod
    def titulo_no_vacio(cls, v):
        if not v or not v.strip():
            raise ValueError("El título no puede estar vacío")
        return v.strip()

class TicketUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    prioridad: Optional[PrioridadTicket] = None
    estado: Optional[EstadoTicket] = None
    categoria: Optional[CategoriaTicket] = None
    tecnico_id: Optional[int] = None
    tecnico_nivel2_id: Optional[int] = None
    equipo_id: Optional[int] = None
    solucion: Optional[str] = None
    articulo_kb_id: Optional[int] = None

class TicketRead(BaseModel):
    id: int
    numero: str
    titulo: str
    descripcion: Optional[str]
    prioridad: PrioridadTicket
    estado: EstadoTicket
    categoria: Optional[CategoriaTicket]
    canal_entrada: Optional[CanalEntrada]
    sede_id: Optional[int]
    sede: Optional[SedeBasica]
    solicitante_id: int
    solicitante: Optional[UsuarioBasico]
    tecnico_id: Optional[int]
    tecnico: Optional[UsuarioBasico]
    tecnico_nivel2_id: Optional[int]
    equipo_id: Optional[int]
    equipo: Optional[EquipoBasico]
    creado_en: datetime
    actualizado_en: Optional[datetime]
    asignado_en: Optional[datetime]
    resuelto_en: Optional[datetime]
    cerrado_en: Optional[datetime]
    sla_limite: Optional[datetime]
    sla_cumplido: Optional[bool]
    tiempo_resolucion_h: Optional[float]
    solucion: Optional[str]
    articulo_kb_id: Optional[int]
    nps_enviado: bool
    nps_puntuacion: Optional[int]
    nps_comentario: Optional[str]
    class Config:
        from_attributes = True

class TicketResumen(BaseModel):
    """Vista compacta para el grid"""
    id: int
    numero: str
    titulo: str
    prioridad: PrioridadTicket
    estado: EstadoTicket
    categoria: Optional[CategoriaTicket]
    canal_entrada: Optional[CanalEntrada]
    solicitante: Optional[UsuarioBasico]
    tecnico: Optional[UsuarioBasico]
    sede: Optional[SedeBasica]
    creado_en: datetime
    sla_limite: Optional[datetime]
    sla_cumplido: Optional[bool]
    tiempo_resolucion_h: Optional[float]
    nps_puntuacion: Optional[int]
    class Config:
        from_attributes = True

# ── Comentario ────────────────────────────────────────────────────────────────
class ComentarioCreate(BaseModel):
    contenido: str
    es_interno: bool = False

class ComentarioRead(BaseModel):
    id: int
    ticket_id: int
    autor: Optional[UsuarioBasico]
    contenido: str
    es_interno: bool
    creado_en: datetime
    class Config:
        from_attributes = True

# ── NPS ───────────────────────────────────────────────────────────────────────
class NPSRequest(BaseModel):
    puntuacion: int
    comentario: Optional[str] = None

    @field_validator("puntuacion")
    @classmethod
    def rango_valido(cls, v):
        if not 1 <= v <= 10:
            raise ValueError("La puntuación debe estar entre 1 y 10")
        return v

# ── Dashboard ─────────────────────────────────────────────────────────────────
class DashboardResumen(BaseModel):
    total: int
    abiertos: int
    en_progreso: int
    pendientes: int
    escalados: int
    resueltos_hoy: int
    vencidos_sla: int
    por_vencer_sla: int   # vencen en las próximas 2 horas
    sin_asignar: int
    nps_promedio: Optional[float]
