from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.configuracion import ConfiguracionApp
from app.models.usuario import Usuario, RolUsuario

router = APIRouter()

DEFAULTS = {
    "app_name": "QHelpDesk",
    "logo_url": None,
    "color_primario": "#1d4ed8",
    "descripcion": "Sistema de Mesa de Ayuda",
}


def _ensure_defaults(db: Session):
    for clave, valor in DEFAULTS.items():
        existe = db.query(ConfiguracionApp).filter(ConfiguracionApp.clave == clave).first()
        if not existe:
            db.add(ConfiguracionApp(clave=clave, valor=valor))
    db.commit()


@router.get("/")
def obtener_configuracion(db: Session = Depends(get_db)):
    _ensure_defaults(db)
    configs = db.query(ConfiguracionApp).all()
    return {c.clave: c.valor for c in configs}


@router.put("/")
def actualizar_configuracion(
    data: Dict[str, Optional[str]],
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(RolUsuario.jefe)),
):
    for clave, valor in data.items():
        config = db.query(ConfiguracionApp).filter(ConfiguracionApp.clave == clave).first()
        if config:
            config.valor = valor
        else:
            db.add(ConfiguracionApp(clave=clave, valor=valor))
    db.commit()
    return {"ok": True}
