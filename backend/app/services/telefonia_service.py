from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from fastapi import HTTPException

from app.models.telefonia import LineaTelefonica, TipoLinea
from app.models.usuario import Usuario
from app.models.sede import Sede
from app.schemas.telefonia import LineaCreate, LineaUpdate, DashboardTelefonia

class TelefoniaService:
    def __init__(self, db: Session):
        self.db = db

    def _enriquecer(self, l: LineaTelefonica) -> dict:
        data = {c.key: getattr(l, c.key) for c in l.__mapper__.columns}
        data["asignado_a"] = self.db.query(Usuario).filter(
            Usuario.id == l.asignado_a_id).first() if l.asignado_a_id else None
        data["sede"] = self.db.query(Sede).filter(
            Sede.id == l.sede_id).first() if l.sede_id else None
        return data

    def listar(
        self,
        tipo: Optional[TipoLinea] = None,
        activa: Optional[bool] = None,
        sede_id: Optional[int] = None,
        es_directivo: Optional[bool] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> List[LineaTelefonica]:
        q = self.db.query(LineaTelefonica)
        if tipo:         q = q.filter(LineaTelefonica.tipo == tipo)
        if activa is not None: q = q.filter(LineaTelefonica.activa == activa)
        if sede_id:      q = q.filter(LineaTelefonica.sede_id == sede_id)
        if es_directivo is not None:
            q = q.filter(LineaTelefonica.es_directivo == es_directivo)
        return q.order_by(LineaTelefonica.numero).offset(skip).limit(limit).all()

    def obtener(self, lid: int) -> Optional[LineaTelefonica]:
        return self.db.query(LineaTelefonica).filter(LineaTelefonica.id == lid).first()

    def crear(self, data: LineaCreate) -> LineaTelefonica:
        if self.db.query(LineaTelefonica).filter(
            LineaTelefonica.numero == data.numero
        ).first():
            raise HTTPException(400, f"Número {data.numero} ya registrado")
        l = LineaTelefonica(**data.model_dump())
        self.db.add(l)
        self.db.commit()
        self.db.refresh(l)
        return l

    def actualizar(self, lid: int, data: LineaUpdate) -> LineaTelefonica:
        l = self.obtener(lid)
        if not l:
            raise HTTPException(404, "Línea no encontrada")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(l, k, v)
        self.db.commit()
        self.db.refresh(l)
        return l

    def dashboard(self) -> DashboardTelefonia:
        total   = self.db.query(func.count(LineaTelefonica.id)).scalar()
        activas = self.db.query(func.count(LineaTelefonica.id)).filter(LineaTelefonica.activa == True).scalar()
        fijas   = self.db.query(func.count(LineaTelefonica.id)).filter(LineaTelefonica.tipo == TipoLinea.fija).scalar()
        cels    = self.db.query(func.count(LineaTelefonica.id)).filter(LineaTelefonica.tipo == TipoLinea.celular).scalar()
        voip    = self.db.query(func.count(LineaTelefonica.id)).filter(LineaTelefonica.tipo == TipoLinea.voip).scalar()
        direc   = self.db.query(func.count(LineaTelefonica.id)).filter(LineaTelefonica.es_directivo == True).scalar()
        costo   = self.db.query(func.sum(LineaTelefonica.costo_mensual)).filter(LineaTelefonica.activa == True).scalar() or 0

        # Por sede
        sedes_q = self.db.query(
            Sede.nombre, func.count(LineaTelefonica.id)
        ).join(LineaTelefonica, LineaTelefonica.sede_id == Sede.id, isouter=True)\
         .group_by(Sede.nombre).all()
        por_sede = {s: c for s, c in sedes_q}

        # Por operador
        ops_q = self.db.query(
            LineaTelefonica.operador, func.count(LineaTelefonica.id)
        ).filter(LineaTelefonica.activa == True)\
         .group_by(LineaTelefonica.operador).all()
        por_operador = {op or 'Sin operador': c for op, c in ops_q}

        return DashboardTelefonia(
            total_lineas=total, lineas_activas=activas,
            fijas=fijas, celulares=cels, voip=voip,
            directivos=direc,
            costo_mensual_total=round(costo, 2),
            por_sede=por_sede,
            por_operador=por_operador,
        )
