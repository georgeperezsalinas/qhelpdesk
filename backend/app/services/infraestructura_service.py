from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
from fastapi import HTTPException

from app.models.infraestructura import Servidor, BaseDatos, DispositivoRed, EstadoServicio
from app.models.sede import Sede
from app.models.usuario import Usuario
from app.schemas.infraestructura import (
    ServidorCreate, ServidorUpdate, DispositivoCreate,
    DispositivoUpdate, DashboardInfraestructura
)

class InfraestructuraService:
    def __init__(self, db: Session):
        self.db = db

    def _query_servidores(self):
        return self.db.query(Servidor).options(
            joinedload(Servidor.bases_datos),
        )

    def _enriquecer_servidor(self, s: Servidor) -> dict:
        data = {c.key: getattr(s, c.key) for c in s.__mapper__.columns}
        data["bases_datos"] = s.bases_datos or []
        data["sede"] = self.db.query(Sede).filter(Sede.id == s.sede_id).first() if s.sede_id else None
        data["responsable"] = self.db.query(Usuario).filter(Usuario.id == s.responsable_id).first() if s.responsable_id else None
        return data

    def _enriquecer_dispositivo(self, d: DispositivoRed) -> dict:
        data = {c.key: getattr(d, c.key) for c in d.__mapper__.columns}
        data["sede"] = self.db.query(Sede).filter(Sede.id == d.sede_id).first() if d.sede_id else None
        return data

    # ── SERVIDORES ────────────────────────────────────────────────────────────
    def listar_servidores(
        self,
        estado: Optional[EstadoServicio] = None,
        sede_id: Optional[int] = None,
    ) -> List[Servidor]:
        q = self._query_servidores()
        if estado:  q = q.filter(Servidor.estado == estado)
        if sede_id: q = q.filter(Servidor.sede_id == sede_id)
        return q.order_by(Servidor.nombre).all()

    def obtener_servidor(self, sid: int) -> Optional[Servidor]:
        return self._query_servidores().filter(Servidor.id == sid).first()

    def crear_servidor(self, data: ServidorCreate) -> Servidor:
        s = Servidor(**data.model_dump())
        self.db.add(s)
        self.db.commit()
        return self._query_servidores().filter(Servidor.id == s.id).first()

    def actualizar_servidor(self, sid: int, data: ServidorUpdate) -> Servidor:
        s = self.db.query(Servidor).filter(Servidor.id == sid).first()
        if not s:
            raise HTTPException(404, "Servidor no encontrado")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(s, k, v)
        s.actualizado_en = datetime.utcnow()
        self.db.commit()
        return self._query_servidores().filter(Servidor.id == sid).first()

    # ── DISPOSITIVOS DE RED ───────────────────────────────────────────────────
    def listar_dispositivos(
        self,
        tipo: Optional[str] = None,
        estado: Optional[EstadoServicio] = None,
        sede_id: Optional[int] = None,
    ) -> List[DispositivoRed]:
        q = self.db.query(DispositivoRed)
        if tipo:    q = q.filter(DispositivoRed.tipo == tipo)
        if estado:  q = q.filter(DispositivoRed.estado == estado)
        if sede_id: q = q.filter(DispositivoRed.sede_id == sede_id)
        return q.order_by(DispositivoRed.nombre).all()

    def crear_dispositivo(self, data: DispositivoCreate) -> DispositivoRed:
        d = DispositivoRed(**data.model_dump())
        self.db.add(d)
        self.db.commit()
        self.db.refresh(d)
        return d

    def actualizar_dispositivo(self, did: int, data: DispositivoUpdate) -> DispositivoRed:
        d = self.db.query(DispositivoRed).filter(DispositivoRed.id == did).first()
        if not d:
            raise HTTPException(404, "Dispositivo no encontrado")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(d, k, v)
        self.db.commit()
        self.db.refresh(d)
        return d

    # ── BASES DE DATOS ────────────────────────────────────────────────────────
    def listar_bases_datos(self, servidor_id: Optional[int] = None) -> List[BaseDatos]:
        q = self.db.query(BaseDatos)
        if servidor_id:
            q = q.filter(BaseDatos.servidor_id == servidor_id)
        return q.order_by(BaseDatos.nombre).all()

    # ── DASHBOARD ─────────────────────────────────────────────────────────────
    def dashboard(self) -> DashboardInfraestructura:
        total_srv   = self.db.query(func.count(Servidor.id)).scalar()
        oper_srv    = self.db.query(func.count(Servidor.id)).filter(Servidor.estado == EstadoServicio.operativo).scalar()
        degr_srv    = self.db.query(func.count(Servidor.id)).filter(Servidor.estado == EstadoServicio.degradado).scalar()
        fuera_srv   = self.db.query(func.count(Servidor.id)).filter(Servidor.estado == EstadoServicio.fuera).scalar()

        total_disp  = self.db.query(func.count(DispositivoRed.id)).scalar()
        oper_disp   = self.db.query(func.count(DispositivoRed.id)).filter(DispositivoRed.estado == EstadoServicio.operativo).scalar()
        prob_disp   = self.db.query(func.count(DispositivoRed.id)).filter(
            DispositivoRed.estado.in_([EstadoServicio.degradado, EstadoServicio.fuera])
        ).scalar()

        total_bd    = self.db.query(func.count(BaseDatos.id)).scalar()
        activas_bd  = self.db.query(func.count(BaseDatos.id)).filter(BaseDatos.activa == True).scalar()

        return DashboardInfraestructura(
            total_servidores=total_srv, servidores_operativos=oper_srv,
            servidores_degradados=degr_srv, servidores_fuera=fuera_srv,
            total_dispositivos=total_disp, dispositivos_operativos=oper_disp,
            dispositivos_con_problema=prob_disp,
            total_bases_datos=total_bd, bases_datos_activas=activas_bd,
        )
