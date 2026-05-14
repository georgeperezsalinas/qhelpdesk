from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import date, datetime, timedelta
from fastapi import HTTPException

from app.models.inventario import Equipo, Licencia, MovimientoEquipo, EstadoEquipo
from app.models.usuario import Usuario
from app.schemas.inventario import (
    EquipoCreate, EquipoUpdate, LicenciaCreate, LicenciaUpdate,
    AsignacionRequest, DashboardInventario
)

class InventarioService:
    def __init__(self, db: Session):
        self.db = db

    def _calcular_depreciacion(self, equipo: Equipo) -> dict:
        if not equipo.valor_compra or not equipo.fecha_compra:
            return {}
        hoy = date.today()
        anios_uso = (hoy - equipo.fecha_compra).days / 365.25
        vida_util = equipo.vida_util_anios or 4
        valor_residual = equipo.valor_residual or 0
        dep_anual = (equipo.valor_compra - valor_residual) / vida_util
        valor_actual = max(valor_residual, equipo.valor_compra - (dep_anual * anios_uso))
        return {
            "depreciacion_anual": round(dep_anual, 2),
            "valor_actual":       round(valor_actual, 2),
            "anios_uso":          round(anios_uso, 1),
        }

    def _garantia_vigente(self, equipo: Equipo) -> Optional[bool]:
        if not equipo.garantia_hasta:
            return None
        return equipo.garantia_hasta >= date.today()

    def _query_equipos(self):
        return self.db.query(Equipo).options(
            joinedload(Equipo.usuario_asignado),
            joinedload(Equipo.sede),
            joinedload(Equipo.proveedor),
        )

    def listar_equipos(self, tipo=None, estado=None, sede_id=None,
                       usuario_id=None, busqueda=None, skip=0, limit=200):
        q = self._query_equipos()
        if tipo:       q = q.filter(Equipo.tipo == tipo)
        if estado:     q = q.filter(Equipo.estado == estado)
        if sede_id:    q = q.filter(Equipo.sede_id == sede_id)
        if usuario_id: q = q.filter(Equipo.usuario_asignado_id == usuario_id)
        if busqueda:
            from sqlalchemy import or_
            like = f"%{busqueda}%"
            q = q.filter(or_(
                Equipo.codigo_inventario.ilike(like),
                Equipo.marca.ilike(like),
                Equipo.modelo.ilike(like),
                Equipo.serie.ilike(like),
                Equipo.ip_asignada.ilike(like),
            ))
        return q.order_by(Equipo.codigo_inventario).offset(skip).limit(limit).all()

    def obtener_equipo(self, equipo_id: int):
        return self._query_equipos().filter(Equipo.id == equipo_id).first()

    def crear_equipo(self, data: EquipoCreate) -> Equipo:
        if self.db.query(Equipo).filter(
            Equipo.codigo_inventario == data.codigo_inventario
        ).first():
            raise HTTPException(400, f"Código {data.codigo_inventario} ya existe")
        equipo = Equipo(**data.model_dump())
        self.db.add(equipo)
        self.db.commit()
        return self._query_equipos().filter(Equipo.id == equipo.id).first()

    def actualizar_equipo(self, equipo_id: int, data: EquipoUpdate) -> Equipo:
        equipo = self.db.query(Equipo).filter(Equipo.id == equipo_id).first()
        if not equipo:
            raise HTTPException(404, "Equipo no encontrado")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(equipo, k, v)
        equipo.actualizado_en = datetime.utcnow()
        self.db.commit()
        return self._query_equipos().filter(Equipo.id == equipo_id).first()

    def asignar_equipo(self, equipo_id: int, data: AsignacionRequest, responsable: Usuario) -> Equipo:
        equipo = self.db.query(Equipo).filter(Equipo.id == equipo_id).first()
        if not equipo:
            raise HTTPException(404, "Equipo no encontrado")
        mov = MovimientoEquipo(
            equipo_id=equipo_id,
            tipo="asignacion" if data.usuario_id else "traslado",
            usuario_origen_id=equipo.usuario_asignado_id,
            usuario_destino_id=data.usuario_id,
            sede_origen_id=equipo.sede_id,
            sede_destino_id=data.sede_id or equipo.sede_id,
            motivo=data.motivo,
            acta_numero=data.acta_numero,
            responsable_id=responsable.id,
        )
        self.db.add(mov)
        equipo.usuario_asignado_id = data.usuario_id
        if data.sede_id:
            equipo.sede_id = data.sede_id
        if data.ubicacion_fisica:
            equipo.ubicacion_fisica = data.ubicacion_fisica
        equipo.actualizado_en = datetime.utcnow()
        self.db.commit()
        return self._query_equipos().filter(Equipo.id == equipo_id).first()

    def dar_de_baja(self, equipo_id: int, motivo: str, responsable: Usuario) -> Equipo:
        equipo = self.db.query(Equipo).filter(Equipo.id == equipo_id).first()
        if not equipo:
            raise HTTPException(404, "Equipo no encontrado")
        mov = MovimientoEquipo(
            equipo_id=equipo_id, tipo="baja",
            usuario_origen_id=equipo.usuario_asignado_id,
            sede_origen_id=equipo.sede_id,
            motivo=motivo, responsable_id=responsable.id,
        )
        self.db.add(mov)
        equipo.estado = EstadoEquipo.de_baja
        equipo.usuario_asignado_id = None
        equipo.actualizado_en = datetime.utcnow()
        self.db.commit()
        return self._query_equipos().filter(Equipo.id == equipo_id).first()

    def historial_equipo(self, equipo_id: int):
        return self.db.query(MovimientoEquipo).filter(
            MovimientoEquipo.equipo_id == equipo_id
        ).order_by(MovimientoEquipo.fecha.desc()).all()

    def enriquecer_equipo(self, equipo: Equipo) -> dict:
        data = {c.key: getattr(equipo, c.key) for c in equipo.__mapper__.columns}
        data["usuario_asignado"] = equipo.usuario_asignado
        data["sede"]             = equipo.sede
        data["proveedor"]        = equipo.proveedor
        data.update(self._calcular_depreciacion(equipo))
        data["garantia_vigente"] = self._garantia_vigente(equipo)
        return data

    def listar_licencias(self, activa=None, por_vencer=False, skip=0, limit=200):
        from sqlalchemy.orm import joinedload as jl
        q = self.db.query(Licencia).options(jl(Licencia.proveedor))
        if activa is not None:
            q = q.filter(Licencia.activa == activa)
        if por_vencer:
            limite = date.today() + timedelta(days=30)
            q = q.filter(
                Licencia.fecha_vencimiento != None,
                Licencia.fecha_vencimiento <= limite,
                Licencia.activa == True,
            )
        return q.order_by(Licencia.fecha_vencimiento.asc().nullslast()).offset(skip).limit(limit).all()

    def obtener_licencia(self, licencia_id: int):
        return self.db.query(Licencia).filter(Licencia.id == licencia_id).first()

    def crear_licencia(self, data: LicenciaCreate) -> Licencia:
        licencia = Licencia(**data.model_dump())
        self.db.add(licencia)
        self.db.commit()
        self.db.refresh(licencia)
        return licencia

    def actualizar_licencia(self, licencia_id: int, data: LicenciaUpdate) -> Licencia:
        licencia = self.obtener_licencia(licencia_id)
        if not licencia:
            raise HTTPException(404, "Licencia no encontrada")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(licencia, k, v)
        self.db.commit()
        self.db.refresh(licencia)
        return licencia

    def enriquecer_licencia(self, lic: Licencia) -> dict:
        data = {c.key: getattr(lic, c.key) for c in lic.__mapper__.columns}
        data["proveedor"]  = lic.proveedor
        data["disponibles"] = lic.cantidad_total - lic.cantidad_usada
        if lic.fecha_vencimiento:
            dias = (lic.fecha_vencimiento - date.today()).days
            data["dias_para_vencer"] = dias
            if dias < 0:      data["estado_vencimiento"] = "vencida"
            elif dias <= 7:   data["estado_vencimiento"] = "critico"
            elif dias <= 15:  data["estado_vencimiento"] = "urgente"
            elif dias <= 30:  data["estado_vencimiento"] = "alerta"
            else:             data["estado_vencimiento"] = "vigente"
        else:
            data["dias_para_vencer"]  = None
            data["estado_vencimiento"] = "sin_vencimiento"
        return data

    def dashboard(self) -> DashboardInventario:
        hoy   = date.today()
        en_30 = hoy + timedelta(days=30)
        total_eq     = self.db.query(func.count(Equipo.id)).scalar()
        activos      = self.db.query(func.count(Equipo.id)).filter(Equipo.estado == EstadoEquipo.activo).scalar()
        en_mant      = self.db.query(func.count(Equipo.id)).filter(Equipo.estado == EstadoEquipo.en_mantenimiento).scalar()
        de_baja      = self.db.query(func.count(Equipo.id)).filter(Equipo.estado == EstadoEquipo.de_baja).scalar()
        gar_x_vencer = self.db.query(func.count(Equipo.id)).filter(Equipo.garantia_hasta >= hoy, Equipo.garantia_hasta <= en_30).scalar()
        gar_vencida  = self.db.query(func.count(Equipo.id)).filter(Equipo.garantia_hasta < hoy, Equipo.estado == EstadoEquipo.activo).scalar()
        val_total    = self.db.query(func.sum(Equipo.valor_compra)).filter(Equipo.estado != EstadoEquipo.de_baja).scalar() or 0
        total_lic    = self.db.query(func.count(Licencia.id)).scalar()
        lic_x_vencer = self.db.query(func.count(Licencia.id)).filter(Licencia.fecha_vencimiento != None, Licencia.fecha_vencimiento >= hoy, Licencia.fecha_vencimiento <= en_30, Licencia.activa == True).scalar()
        lic_vencidas = self.db.query(func.count(Licencia.id)).filter(Licencia.fecha_vencimiento != None, Licencia.fecha_vencimiento < hoy, Licencia.activa == True).scalar()
        lic_disp     = self.db.query(func.count(Licencia.id)).filter(Licencia.cantidad_usada < Licencia.cantidad_total, Licencia.activa == True).scalar()
        return DashboardInventario(
            total_equipos=total_eq, activos=activos, en_mantenimiento=en_mant, de_baja=de_baja,
            garantia_por_vencer=gar_x_vencer, garantia_vencida=gar_vencida,
            valor_total_inventario=round(val_total, 2), valor_depreciado_total=round(val_total * 0.5, 2),
            total_licencias=total_lic, licencias_por_vencer=lic_x_vencer,
            licencias_vencidas=lic_vencidas, licencias_disponibles=lic_disp,
        )
