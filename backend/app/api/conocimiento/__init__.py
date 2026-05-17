from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.conocimiento import ArticuloKB, EstadoArticulo
from app.models.usuario import Usuario, RolUsuario

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ArticuloResumen(BaseModel):
    id: int
    titulo: str
    categoria: Optional[str]
    tags: Optional[str]
    vistas: int
    util_si: int
    util_no: int
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class ArticuloDetalle(ArticuloResumen):
    contenido: str
    autor_nombre: Optional[str] = None

    @classmethod
    def from_orm_ext(cls, a: ArticuloKB):
        obj = cls.model_validate(a)
        if a.autor:
            obj.autor_nombre = f"{a.autor.nombre} {a.autor.apellido}"
        return obj


class ArticuloCreate(BaseModel):
    titulo: str
    contenido: str
    categoria: Optional[str] = None
    tags: Optional[str] = None
    estado: EstadoArticulo = EstadoArticulo.borrador


class ArticuloUpdate(BaseModel):
    titulo: Optional[str] = None
    contenido: Optional[str] = None
    categoria: Optional[str] = None
    tags: Optional[str] = None
    estado: Optional[EstadoArticulo] = None


# ── Endpoints públicos (usuario autenticado) ──────────────────────────────────

@router.get("/", response_model=List[ArticuloResumen])
def listar_articulos(
    busqueda:  Optional[str] = Query(None, max_length=100),
    categoria: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Artículos publicados, con búsqueda por texto y filtro por categoría."""
    q = db.query(ArticuloKB).filter(ArticuloKB.estado == EstadoArticulo.publicado)

    if categoria:
        q = q.filter(ArticuloKB.categoria == categoria)

    if busqueda:
        like = f"%{busqueda}%"
        q = q.filter(or_(
            ArticuloKB.titulo.ilike(like),
            ArticuloKB.contenido.ilike(like),
            ArticuloKB.tags.ilike(like),
        ))

    return q.order_by(ArticuloKB.vistas.desc()).offset(skip).limit(limit).all()


@router.get("/categorias")
def listar_categorias(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Devuelve las categorías que tienen artículos publicados."""
    rows = (
        db.query(ArticuloKB.categoria)
        .filter(
            ArticuloKB.estado == EstadoArticulo.publicado,
            ArticuloKB.categoria != None,
        )
        .distinct()
        .all()
    )
    return sorted([r[0] for r in rows if r[0]])


@router.get("/{articulo_id}", response_model=ArticuloDetalle)
def obtener_articulo(
    articulo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    a = db.query(ArticuloKB).filter(
        ArticuloKB.id == articulo_id,
        ArticuloKB.estado == EstadoArticulo.publicado,
    ).first()
    if not a:
        raise HTTPException(404, "Artículo no encontrado")
    a.vistas += 1
    db.commit()
    db.refresh(a)
    return ArticuloDetalle.from_orm_ext(a)


@router.post("/{articulo_id}/util")
def marcar_util(
    articulo_id: int,
    util: bool = True,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """El usuario indica si el artículo le fue útil."""
    a = db.query(ArticuloKB).filter(ArticuloKB.id == articulo_id).first()
    if not a:
        raise HTTPException(404, "Artículo no encontrado")
    if util:
        a.util_si += 1
    else:
        a.util_no += 1
    db.commit()
    return {"util_si": a.util_si, "util_no": a.util_no}


# ── Gestión (solo personal interno) ──────────────────────────────────────────

_ROLES_GESTION = [RolUsuario.jefe, RolUsuario.especialista, RolUsuario.mesa_ayuda]


@router.post("/", response_model=ArticuloResumen, status_code=201)
def crear_articulo(
    data: ArticuloCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(*_ROLES_GESTION)),
):
    a = ArticuloKB(**data.model_dump(), autor_id=current_user.id)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.patch("/{articulo_id}", response_model=ArticuloResumen)
def actualizar_articulo(
    articulo_id: int,
    data: ArticuloUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*_ROLES_GESTION)),
):
    a = db.query(ArticuloKB).filter(ArticuloKB.id == articulo_id).first()
    if not a:
        raise HTTPException(404, "Artículo no encontrado")
    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(a, campo, valor)
    a.actualizado_en = datetime.utcnow()
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{articulo_id}", status_code=204)
def eliminar_articulo(
    articulo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles(*_ROLES_GESTION)),
):
    a = db.query(ArticuloKB).filter(ArticuloKB.id == articulo_id).first()
    if not a:
        raise HTTPException(404, "Artículo no encontrado")
    db.delete(a)
    db.commit()


@router.get("/admin/todos", response_model=List[ArticuloDetalle])
def listar_todos_admin(
    busqueda:  Optional[str] = Query(None, max_length=100),
    categoria: Optional[str] = None,
    estado:    Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(*_ROLES_GESTION)),
):
    """Lista todos los artículos (todos los estados) para el panel admin."""
    q = db.query(ArticuloKB)

    if estado:
        q = q.filter(ArticuloKB.estado == estado)
    if categoria:
        q = q.filter(ArticuloKB.categoria == categoria)
    if busqueda:
        like = f"%{busqueda}%"
        q = q.filter(or_(
            ArticuloKB.titulo.ilike(like),
            ArticuloKB.contenido.ilike(like),
            ArticuloKB.tags.ilike(like),
        ))

    articulos = q.order_by(ArticuloKB.actualizado_en.desc()).offset(skip).limit(limit).all()
    return [ArticuloDetalle.from_orm_ext(a) for a in articulos]
