import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Optional
from datetime import datetime

limiter = Limiter(key_func=get_remote_address)

from app.core.database import get_db
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    get_password_hash, decode_refresh_token
)
from app.core.deps import get_current_user, require_roles
from app.core.config import settings
from app.models.usuario import Usuario, RolUsuario
from app.schemas.usuario import (
    UsuarioCreate, UsuarioUpdate, UsuarioRead, UsuarioResumen,
    TokenResponse, RefreshTokenRequest, CambiarPasswordRequest
)

router = APIRouter()

# ── LOGIN ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(Usuario).filter(
        Usuario.username == form.username,
        Usuario.activo == True
    ).first()

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token_data = {"sub": str(user.id), "rol": user.rol, "sede_id": user.sede_id}
    access_token  = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user.ultimo_acceso = datetime.utcnow()
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        usuario=user
    )

# ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
def refresh_token(
    request: Request,
    body: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    try:
        payload = decode_refresh_token(body.refresh_token)
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.activo == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    token_data = {"sub": str(user.id), "rol": user.rol, "sede_id": user.sede_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        usuario=user
    )

# ── PERFIL DEL USUARIO ACTUAL ─────────────────────────────────────────────────
@router.get("/me", response_model=UsuarioRead)
def mi_perfil(current_user: Usuario = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UsuarioRead)
def actualizar_mi_perfil(
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # Campos que el usuario puede editar de sí mismo
    campos_permitidos = {"nombre", "apellido", "telefono", "celular", "foto_url"}
    for campo, valor in data.model_dump(exclude_none=True).items():
        if campo in campos_permitidos:
            setattr(current_user, campo, valor)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/cambiar-password")
def cambiar_password(
    data: CambiarPasswordRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if not verify_password(data.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    current_user.hashed_password = get_password_hash(data.password_nuevo)
    db.commit()
    return {"message": "Contraseña actualizada correctamente"}

# ── CRUD DE USUARIOS (solo jefe) ──────────────────────────────────────────────
@router.get("/", response_model=List[UsuarioResumen])
def listar_usuarios(
    rol: Optional[RolUsuario] = None,
    sede_id: Optional[int] = None,
    activo: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista))
):
    q = db.query(Usuario).filter(Usuario.activo == activo)
    if rol:
        q = q.filter(Usuario.rol == rol)
    if sede_id:
        q = q.filter(Usuario.sede_id == sede_id)
    return q.order_by(Usuario.apellido).offset(skip).limit(limit).all()

@router.get("/tecnicos", response_model=List[UsuarioResumen])
def listar_tecnicos(
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(
        RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda
    ))
):
    """Lista técnicos disponibles para asignación de tickets"""
    roles_tecnicos = [RolUsuario.especialista, RolUsuario.mesa_ayuda]
    q = db.query(Usuario).filter(
        Usuario.rol.in_(roles_tecnicos),
        Usuario.activo == True
    )
    if sede_id:
        q = q.filter(Usuario.sede_id == sede_id)
    return q.order_by(Usuario.nombre).all()

@router.get("/{usuario_id}", response_model=UsuarioRead)
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista))
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@router.post("/", response_model=UsuarioRead, status_code=201)
def crear_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe))
):
    if db.query(Usuario).filter(Usuario.username == data.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    user = Usuario(
        **data.model_dump(exclude={"password"}),
        hashed_password=get_password_hash(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{usuario_id}", response_model=UsuarioRead)
def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe))
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(user, campo, valor)
    db.commit()
    db.refresh(user)
    return user

@router.post("/{usuario_id}/resetear-password")
def resetear_password(
    usuario_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe))
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    nueva = secrets.token_urlsafe(10) + "!1"
    user.hashed_password = get_password_hash(nueva)
    db.commit()
    return {"message": f"Contraseña reseteada. Nueva contraseña temporal: {nueva}"}

@router.delete("/{usuario_id}")
def desactivar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(RolUsuario.jefe))
):
    if usuario_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.activo = False
    db.commit()
    return {"message": f"Usuario {user.username} desactivado"}
