from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.usuario import RolUsuario, TurnoTecnico

class UsuarioCreate(BaseModel):
    username: str
    email: EmailStr
    nombre: str
    apellido: str
    password: str
    rol: RolUsuario = RolUsuario.usuario_final
    cargo: Optional[str] = None
    area: Optional[str] = None
    sede_id: Optional[int] = None
    telefono: Optional[str] = None
    celular: Optional[str] = None
    skills: Optional[str] = None
    turno: Optional[TurnoTecnico] = None
    carga_maxima: int = 10
    foto_url: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    cargo: Optional[str] = None
    area: Optional[str] = None
    sede_id: Optional[int] = None
    telefono: Optional[str] = None
    celular: Optional[str] = None
    skills: Optional[str] = None
    turno: Optional[TurnoTecnico] = None
    carga_maxima: Optional[int] = None
    activo: Optional[bool] = None
    foto_url: Optional[str] = None

class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nuevo: str
    password_confirmar: str

    @field_validator("password_confirmar")
    @classmethod
    def passwords_match(cls, v, info):
        if "password_nuevo" in info.data and v != info.data["password_nuevo"]:
            raise ValueError("Las contraseñas no coinciden")
        return v

class SedeBasica(BaseModel):
    id: int
    nombre: str
    codigo: str
    class Config:
        from_attributes = True

class UsuarioRead(BaseModel):
    id: int
    username: str
    email: str
    nombre: str
    apellido: str
    rol: RolUsuario
    cargo: Optional[str]
    area: Optional[str]
    sede_id: Optional[int]
    sede: Optional[SedeBasica]
    telefono: Optional[str]
    celular: Optional[str]
    activo: bool
    skills: Optional[str]
    turno: Optional[TurnoTecnico]
    carga_maxima: int = 10
    foto_url: Optional[str] = None
    creado_en: Optional[datetime] = None
    ultimo_acceso: Optional[datetime]
    class Config:
        from_attributes = True

class UsuarioResumen(BaseModel):
    """Vista compacta para listas y selects"""
    id: int
    username: str
    nombre: str
    apellido: str
    email: Optional[str] = None
    rol: RolUsuario
    area: Optional[str]
    sede_id: Optional[int]
    activo: bool
    foto_url: Optional[str] = None
    ultimo_acceso: Optional[datetime] = None
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int          # segundos
    usuario: UsuarioRead

class RefreshTokenRequest(BaseModel):
    refresh_token: str
