from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
from fastapi import HTTPException

from app.models.compra import SolicitudCompra, ItemSolicitud, EstadoSolicitud, TipoSolicitud
from app.models.usuario import Usuario, RolUsuario
from app.schemas.compra import SolicitudCreate, SolicitudUpdate, DashboardCompras

class CompraService:
    def __init__(self, db: Session):
        self.db = db

    def _gen_numero(self) -> str:
        anio  = datetime.utcnow().year
        count = self.db.query(func.count(SolicitudCompra.id)).scalar() + 1
        return f"SC-{anio}-{count:04d}"

    def _query(self):
        return self.db.query(SolicitudCompra).options(
            joinedload(SolicitudCompra.solicitante),
            joinedload(SolicitudCompra.aprobador),
            joinedload(SolicitudCompra.proveedor),
            joinedload(SolicitudCompra.items),
        )

    # ── CREAR ─────────────────────────────────────────────────────────────────
    def crear(self, data: SolicitudCreate, solicitante: Usuario) -> SolicitudCompra:
        s = SolicitudCompra(
            numero=self._gen_numero(),
            tipo=data.tipo,
            estado=EstadoSolicitud.borrador,
            descripcion=data.descripcion,
            justificacion=data.justificacion,
            especificaciones=data.especificaciones,
            solicitante_id=solicitante.id,
            proveedor_id=data.proveedor_id,
            valor_estimado=data.valor_estimado,
            presupuesto_codigo=data.presupuesto_codigo,
            fecha_necesidad=data.fecha_necesidad,
        )
        self.db.add(s)
        self.db.flush()

        for item in (data.items or []):
            subtotal = (item.cantidad * item.precio_unitario) if item.precio_unitario else None
            self.db.add(ItemSolicitud(
                solicitud_id=s.id,
                descripcion=item.descripcion,
                cantidad=item.cantidad,
                unidad=item.unidad,
                precio_unitario=item.precio_unitario,
                subtotal=subtotal,
            ))

        self.db.commit()
        return self._query().filter(SolicitudCompra.id == s.id).first()

    # ── LISTAR ────────────────────────────────────────────────────────────────
    def listar(
        self,
        estado: Optional[EstadoSolicitud] = None,
        tipo: Optional[TipoSolicitud] = None,
        solicitante_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 200,
        usuario: Optional[Usuario] = None,
    ) -> List[SolicitudCompra]:
        q = self._query()
        # Usuarios normales solo ven sus solicitudes
        if usuario and usuario.rol not in [RolUsuario.jefe, RolUsuario.especialista]:
            q = q.filter(SolicitudCompra.solicitante_id == usuario.id)
        if estado:         q = q.filter(SolicitudCompra.estado == estado)
        if tipo:           q = q.filter(SolicitudCompra.tipo == tipo)
        if solicitante_id: q = q.filter(SolicitudCompra.solicitante_id == solicitante_id)
        return q.order_by(SolicitudCompra.creado_en.desc()).offset(skip).limit(limit).all()

    def obtener(self, sid: int) -> Optional[SolicitudCompra]:
        return self._query().filter(SolicitudCompra.id == sid).first()

    # ── ACTUALIZAR ────────────────────────────────────────────────────────────
    def actualizar(self, sid: int, data: SolicitudUpdate, usuario: Usuario) -> SolicitudCompra:
        s = self.db.query(SolicitudCompra).filter(SolicitudCompra.id == sid).first()
        if not s:
            raise HTTPException(404, "Solicitud no encontrada")

        cambios = data.model_dump(exclude_none=True)
        for k, v in cambios.items():
            setattr(s, k, v)

        # Timestamps automáticos
        if data.estado == EstadoSolicitud.aprobada and not s.fecha_aprobacion:
            s.aprobador_id    = usuario.id
            s.fecha_aprobacion = datetime.utcnow()
        if data.estado == EstadoSolicitud.recibida and not s.fecha_recepcion:
            s.fecha_recepcion = datetime.utcnow()

        s.actualizado_en = datetime.utcnow()
        self.db.commit()
        return self._query().filter(SolicitudCompra.id == sid).first()

    # ── ENVIAR (borrador → enviada) ────────────────────────────────────────────
    def enviar(self, sid: int, usuario: Usuario) -> SolicitudCompra:
        s = self.db.query(SolicitudCompra).filter(SolicitudCompra.id == sid).first()
        if not s:
            raise HTTPException(404, "Solicitud no encontrada")
        if s.solicitante_id != usuario.id and usuario.rol != RolUsuario.jefe:
            raise HTTPException(403, "Sin permisos")
        if s.estado != EstadoSolicitud.borrador:
            raise HTTPException(400, "Solo se pueden enviar solicitudes en borrador")
        s.estado = EstadoSolicitud.enviada
        s.actualizado_en = datetime.utcnow()
        self.db.commit()
        return self._query().filter(SolicitudCompra.id == sid).first()

    # ── DASHBOARD ─────────────────────────────────────────────────────────────
    def dashboard(self) -> DashboardCompras:
        total     = self.db.query(func.count(SolicitudCompra.id)).scalar()
        borradores= self.db.query(func.count(SolicitudCompra.id)).filter(SolicitudCompra.estado == EstadoSolicitud.borrador).scalar()
        enviadas  = self.db.query(func.count(SolicitudCompra.id)).filter(SolicitudCompra.estado == EstadoSolicitud.enviada).scalar()
        aprobadas = self.db.query(func.count(SolicitudCompra.id)).filter(SolicitudCompra.estado == EstadoSolicitud.aprobada).scalar()
        en_proceso= self.db.query(func.count(SolicitudCompra.id)).filter(SolicitudCompra.estado == EstadoSolicitud.en_proceso).scalar()
        recibidas = self.db.query(func.count(SolicitudCompra.id)).filter(SolicitudCompra.estado == EstadoSolicitud.recibida).scalar()
        rechazadas= self.db.query(func.count(SolicitudCompra.id)).filter(SolicitudCompra.estado == EstadoSolicitud.rechazada).scalar()

        val_aprobado = self.db.query(func.sum(SolicitudCompra.valor_aprobado)).filter(
            SolicitudCompra.estado.in_([EstadoSolicitud.aprobada, EstadoSolicitud.en_proceso, EstadoSolicitud.recibida])
        ).scalar() or 0

        val_recibido = self.db.query(func.sum(SolicitudCompra.valor_final)).filter(
            SolicitudCompra.estado == EstadoSolicitud.recibida
        ).scalar() or 0

        # Por tipo
        tipos = self.db.query(
            SolicitudCompra.tipo, func.count(SolicitudCompra.id)
        ).group_by(SolicitudCompra.tipo).all()
        por_tipo = {t.value: c for t, c in tipos}

        return DashboardCompras(
            total=total, borradores=borradores, enviadas=enviadas,
            aprobadas=aprobadas, en_proceso=en_proceso,
            recibidas=recibidas, rechazadas=rechazadas,
            valor_total_aprobado=round(val_aprobado, 2),
            valor_total_recibido=round(val_recibido, 2),
            por_tipo=por_tipo,
        )
