from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
from datetime import datetime
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.usuario import Usuario, RolUsuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/usuarios/login")

# ── Obtener usuario actual ────────────────────────────────────────────────────
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: int = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.activo == True).first()
    if not user:
        raise credentials_exception

    # Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    return user

# ── Dependencias por rol ──────────────────────────────────────────────────────
def get_current_active_user(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if not current_user.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user

def require_roles(*roles: RolUsuario):
    """Uso: Depends(require_roles(RolUsuario.jefe, RolUsuario.especialista))"""
    def checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Roles permitidos: {[r.value for r in roles]}"
            )
        return current_user
    return checker

# ── Shortcuts de roles más usados ─────────────────────────────────────────────
def solo_jefe(u: Usuario = Depends(get_current_user)) -> Usuario:
    return require_roles(RolUsuario.jefe)(u)

def jefe_o_especialista(u: Usuario = Depends(get_current_user)) -> Usuario:
    return require_roles(RolUsuario.jefe, RolUsuario.especialista)(u)

def equipo_tecnico(u: Usuario = Depends(get_current_user)) -> Usuario:
    """Jefe + especialista + mesa de ayuda"""
    return require_roles(
        RolUsuario.jefe,
        RolUsuario.especialista,
        RolUsuario.mesa_ayuda
    )(u)

def no_es_externo(u: Usuario = Depends(get_current_user)) -> Usuario:
    """Cualquier rol excepto usuario_externo"""
    if u.rol == RolUsuario.usuario_externo:
        raise HTTPException(status_code=403, detail="Acceso no permitido para usuarios externos")
    return u
