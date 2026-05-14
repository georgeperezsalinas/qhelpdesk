from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.models.backup import PoliticaBackup, EjecucionBackup, EstadoBackup
from app.models.usuario import Usuario
from app.schemas.backup import (
    PoliticaCreate, PoliticaUpdate, VerificacionRequest, DashboardBackup
)

class BackupService:
    def __init__(self, db: Session):
        self.db = db

    def _query_politicas(self):
        return self.db.query(PoliticaBackup).options(
            joinedload(PoliticaBackup.ejecuciones),
        )

    def _enriquecer_politica(self, p: PoliticaBackup) -> dict:
        data = {c.key: getattr(p, c.key) for c in p.__mapper__.columns}
        ejecuciones = p.ejecuciones or []
        data["total_ejecuciones"] = len(ejecuciones)
        data["exitosas"] = sum(1 for e in ejecuciones if e.estado == EstadoBackup.exitoso)
        data["fallidas"] = sum(1 for e in ejecuciones if e.estado == EstadoBackup.fallido)
        ultima = max(ejecuciones, key=lambda e: e.inicio, default=None) if ejecuciones else None
        data["ultima_ejecucion"] = ultima.inicio if ultima else None
        data["ultimo_estado"]    = ultima.estado.value if ultima else None
        resp = self.db.query(Usuario).filter(Usuario.id == p.responsable_id).first() if p.responsable_id else None
        data["responsable"] = resp
        return data

    # ── POLÍTICAS ─────────────────────────────────────────────────────────────
    def listar_politicas(self, activa: Optional[bool] = None) -> List[PoliticaBackup]:
        q = self._query_politicas()
        if activa is not None:
            q = q.filter(PoliticaBackup.activa == activa)
        return q.order_by(PoliticaBackup.nombre).all()

    def obtener_politica(self, pid: int) -> Optional[PoliticaBackup]:
        return self._query_politicas().filter(PoliticaBackup.id == pid).first()

    def crear_politica(self, data: PoliticaCreate) -> PoliticaBackup:
        p = PoliticaBackup(**data.model_dump())
        self.db.add(p)
        self.db.commit()
        self.db.refresh(p)
        return p

    def actualizar_politica(self, pid: int, data: PoliticaUpdate) -> PoliticaBackup:
        p = self.db.query(PoliticaBackup).filter(PoliticaBackup.id == pid).first()
        if not p:
            raise HTTPException(404, "Política no encontrada")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(p, k, v)
        self.db.commit()
        return self._query_politicas().filter(PoliticaBackup.id == pid).first()

    # ── EJECUCIONES ───────────────────────────────────────────────────────────
    def listar_ejecuciones(
        self,
        politica_id: Optional[int] = None,
        estado: Optional[EstadoBackup] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[EjecucionBackup]:
        # Sin joinedload de verificado_por — lo cargamos manualmente en enriquecer
        q = self.db.query(EjecucionBackup)
        if politica_id: q = q.filter(EjecucionBackup.politica_id == politica_id)
        if estado:      q = q.filter(EjecucionBackup.estado == estado)
        return q.order_by(EjecucionBackup.inicio.desc()).offset(skip).limit(limit).all()

    def _enriquecer_ejecucion(self, e: EjecucionBackup) -> dict:
        data = {c.key: getattr(e, c.key) for c in e.__mapper__.columns}
        # Cargar verificado_por manualmente desde la FK
        if e.verificado_por_id:
            u = self.db.query(Usuario).filter(Usuario.id == e.verificado_por_id).first()
            data["verificado_por"] = u
        else:
            data["verificado_por"] = None
        # Calcular duración
        if e.inicio and e.fin:
            data["duracion_minutos"] = int((e.fin - e.inicio).total_seconds() / 60)
        else:
            data["duracion_minutos"] = None
        return data

    def verificar_backup(
        self, ej_id: int, data: VerificacionRequest, usuario: Usuario
    ) -> EjecucionBackup:
        ej = self.db.query(EjecucionBackup).filter(EjecucionBackup.id == ej_id).first()
        if not ej:
            raise HTTPException(404, "Ejecución no encontrada")
        ej.verificado             = True
        ej.fecha_verificacion     = datetime.utcnow()
        ej.verificado_por_id      = usuario.id
        ej.resultado_verificacion = data.resultado
        if not data.exitosa:
            ej.estado = EstadoBackup.fallido
        self.db.commit()
        self.db.refresh(ej)
        return ej

    # ── DASHBOARD ─────────────────────────────────────────────────────────────
    def dashboard(self) -> DashboardBackup:
        ahora       = datetime.utcnow()
        hoy_inicio  = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
        hace_7_dias = ahora - timedelta(days=7)

        total_pol   = self.db.query(func.count(PoliticaBackup.id)).scalar()
        activas     = self.db.query(func.count(PoliticaBackup.id)).filter(PoliticaBackup.activa == True).scalar()
        ej_hoy      = self.db.query(func.count(EjecucionBackup.id)).filter(EjecucionBackup.inicio >= hoy_inicio).scalar()
        exit_hoy    = self.db.query(func.count(EjecucionBackup.id)).filter(EjecucionBackup.inicio >= hoy_inicio, EjecucionBackup.estado == EstadoBackup.exitoso).scalar()
        fall_hoy    = self.db.query(func.count(EjecucionBackup.id)).filter(EjecucionBackup.inicio >= hoy_inicio, EjecucionBackup.estado == EstadoBackup.fallido).scalar()
        fall_semana = self.db.query(func.count(EjecucionBackup.id)).filter(EjecucionBackup.inicio >= hace_7_dias, EjecucionBackup.estado == EstadoBackup.fallido).scalar()
        sin_verif   = self.db.query(func.count(EjecucionBackup.id)).filter(EjecucionBackup.verificado == False, EjecucionBackup.estado == EstadoBackup.exitoso).scalar()
        tamanio     = self.db.query(func.sum(EjecucionBackup.tamanio_gb)).filter(EjecucionBackup.estado == EstadoBackup.exitoso).scalar() or 0

        total_7d = self.db.query(func.count(EjecucionBackup.id)).filter(EjecucionBackup.inicio >= hace_7_dias).scalar()
        exit_7d  = self.db.query(func.count(EjecucionBackup.id)).filter(EjecucionBackup.inicio >= hace_7_dias, EjecucionBackup.estado == EstadoBackup.exitoso).scalar()
        tasa = round((exit_7d / total_7d * 100), 1) if total_7d > 0 else 100.0

        return DashboardBackup(
            total_politicas=total_pol, politicas_activas=activas,
            ejecuciones_hoy=ej_hoy, exitosas_hoy=exit_hoy,
            fallidas_hoy=fall_hoy, fallidas_semana=fall_semana,
            sin_verificar=sin_verif,
            tamanio_total_gb=round(tamanio, 2),
            tasa_exito_7d=tasa,
        )
