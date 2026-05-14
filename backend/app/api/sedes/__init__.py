from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.sede import Sede
from app.models.usuario import Usuario
from pydantic import BaseModel

router = APIRouter()

class SedeRead(BaseModel):
    id: int
    nombre: str
    codigo: str
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    region: Optional[str] = None
    es_central: bool
    activa: bool
    class Config:
        from_attributes = True

@router.get("/", response_model=List[SedeRead])
def listar_sedes(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return db.query(Sede).filter(Sede.activa == True).order_by(Sede.nombre).all()
