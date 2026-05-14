from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import date, datetime, timedelta
from fastapi import HTTPException

from app.models.mantenimiento import (
    OrdenMantenimiento, CronogramaMantenimiento, ChecklistMantenimiento,
    TipoMantenimiento, EstadoOrden, OrigenOrden
)
from app.models.inventario import Equipo, EstadoEquipo
from app.models.usuario import Usuario
from app.schemas.mantenimiento import OrdenCreate, OrdenUpdate, DashboardMantenimiento

class MantenimientoService:
    def __init__(self, db: Session):
        self.db = db

    def _gen_numero(self) -> str:
        anio  = datetime.utcnow().year
        count = self.db.query(func.count(OrdenMantenimiento.id)).scalar() + 1
        return f"MNT-{anio}-{count:04d}"

    def _query_ordenes(self):
        return self.db.query(OrdenMantenimiento).options(
            joinedload(OrdenMantenimiento.equipo),
            joinedload(OrdenMantenimiento.tecnico),
            joinedload(OrdenMantenimiento.checklist),
        )

    # ── CREAR ORDEN ───────────────────────────────────────────────────────────
    def crear(self, data: OrdenCreate, creador: Usuario) -> OrdenMantenimiento:
        equipo = self.db.query(Equipo).filter(Equipo.id == data.equipo_id).first()
        if not equipo:
            raise HTTPException(404, "Equipo no encontrado")

        orden = OrdenMantenimiento(
            numero=self._gen_numero(),
            tipo=data.tipo,
            origen=OrigenOrden.manual,
            estado=EstadoOrden.programado,
            equipo_id=data.equipo_id,
            tecnico_id=data.tecnico_id,
            cronograma_id=data.cronograma_id,
            fecha_programada=data.fecha_programada,
            descripcion=data.descripcion,
        )
        self.db.add(orden)
        self.db.flush()

        # Checklist por defecto según tipo
        tareas = data.checklist or self._tareas_default(data.tipo, equipo.tipo.value if equipo.tipo else None)
        for tarea in tareas:
            self.db.add(ChecklistMantenimiento(orden_id=orden.id, tarea=tarea))

        # Actualizar estado del equipo
        if data.tipo == TipoMantenimiento.correctivo:
            equipo.estado = EstadoEquipo.en_reparacion
        else:
            equipo.estado = EstadoEquipo.en_mantenimiento

        self.db.commit()
        return self._query_ordenes().filter(OrdenMantenimiento.id == orden.id).first()

    def _tareas_default(self, tipo: TipoMantenimiento, tipo_equipo: Optional[str]) -> List[str]:
        if tipo == TipoMantenimiento.preventivo:
            base = [
                "Verificar estado físico general del equipo",
                "Limpiar polvo interior con aire comprimido",
                "Verificar y asegurar conexiones internas",
                "Actualizar drivers y sistema operativo",
                "Ejecutar antivirus y análisis de malware",
                "Verificar espacio en disco y optimizar",
                "Probar funcionamiento completo del equipo",
            ]
            if tipo_equipo == "impresora":
                return [
                    "Limpiar cabezales de impresión",
                    "Verificar nivel de tóner/tinta",
                    "Limpiar rodillos de alimentación",
                    "Hacer impresión de prueba",
                    "Verificar conexión de red/USB",
                ]
            if tipo_equipo in ["switch", "router", "firewall"]:
                return [
                    "Verificar logs del dispositivo",
                    "Actualizar firmware si disponible",
                    "Limpiar polvo de ventilación",
                    "Verificar temperatura de operación",
                    "Probar conectividad de todos los puertos",
                ]
            return base
        else:  # correctivo
            return [
                "Diagnosticar falla reportada",
                "Identificar componente/software afectado",
                "Aplicar corrección o reemplazo",
                "Verificar solución de la falla",
                "Documentar trabajos realizados",
                "Probar funcionamiento completo",
            ]

    # ── LISTAR ────────────────────────────────────────────────────────────────
    def listar(
        self,
        tipo: Optional[TipoMantenimiento] = None,
        estado: Optional[EstadoOrden] = None,
        tecnico_id: Optional[int] = None,
        equipo_id: Optional[int] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        proximos_dias: Optional[int] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> List[OrdenMantenimiento]:
        q = self._query_ordenes()
        if tipo:       q = q.filter(OrdenMantenimiento.tipo == tipo)
        if estado:     q = q.filter(OrdenMantenimiento.estado == estado)
        if tecnico_id: q = q.filter(OrdenMantenimiento.tecnico_id == tecnico_id)
        if equipo_id:  q = q.filter(OrdenMantenimiento.equipo_id == equipo_id)
        if fecha_desde: q = q.filter(OrdenMantenimiento.fecha_programada >= fecha_desde)
        if fecha_hasta: q = q.filter(OrdenMantenimiento.fecha_programada <= fecha_hasta)
        if proximos_dias:
            hoy    = date.today()
            limite = hoy + timedelta(days=proximos_dias)
            q = q.filter(
                OrdenMantenimiento.fecha_programada >= hoy,
                OrdenMantenimiento.fecha_programada <= limite,
                OrdenMantenimiento.estado == EstadoOrden.programado,
            )
        return q.order_by(OrdenMantenimiento.fecha_programada.asc()).offset(skip).limit(limit).all()

    def obtener(self, orden_id: int) -> Optional[OrdenMantenimiento]:
        return self._query_ordenes().filter(OrdenMantenimiento.id == orden_id).first()

    # ── ACTUALIZAR ────────────────────────────────────────────────────────────
    def actualizar(self, orden_id: int, data: OrdenUpdate) -> OrdenMantenimiento:
        orden = self.db.query(OrdenMantenimiento).filter(OrdenMantenimiento.id == orden_id).first()
        if not orden:
            raise HTTPException(404, "Orden no encontrada")

        cambios = data.model_dump(exclude_none=True)
        for k, v in cambios.items():
            setattr(orden, k, v)

        # Al completar → calcular duración y restaurar estado del equipo
        if data.estado == EstadoOrden.completado:
            if orden.fecha_inicio and orden.fecha_fin:
                delta = orden.fecha_fin - orden.fecha_inicio
                orden.duracion_minutos = int(delta.total_seconds() / 60)
            equipo = self.db.query(Equipo).filter(Equipo.id == orden.equipo_id).first()
            if equipo and not data.requiere_baja:
                equipo.estado = EstadoEquipo.activo
            elif equipo and data.requiere_baja:
                equipo.estado = EstadoEquipo.de_baja

        orden.actualizado_en = datetime.utcnow()
        self.db.commit()
        return self._query_ordenes().filter(OrdenMantenimiento.id == orden_id).first()

    # ── CHECKLIST ─────────────────────────────────────────────────────────────
    def actualizar_checklist(self, orden_id: int, item_id: int,
                              completado: bool, observacion: Optional[str]) -> OrdenMantenimiento:
        item = self.db.query(ChecklistMantenimiento).filter(
            ChecklistMantenimiento.id == item_id,
            ChecklistMantenimiento.orden_id == orden_id,
        ).first()
        if not item:
            raise HTTPException(404, "Item de checklist no encontrado")
        item.completado  = completado
        item.observacion = observacion
        self.db.commit()
        return self._query_ordenes().filter(OrdenMantenimiento.id == orden_id).first()

    # ── GENERAR PREVENTIVOS AUTOMÁTICOS ──────────────────────────────────────
    def generar_preventivos_automaticos(self) -> int:
        """Genera órdenes de mantenimiento preventivo según cronogramas."""
        cronogramas = self.db.query(CronogramaMantenimiento).filter(
            CronogramaMantenimiento.activo == True
        ).all()
        generados = 0
        for cron in cronogramas:
            equipos = self.db.query(Equipo).filter(
                Equipo.tipo == cron.tipo_equipo,
                Equipo.estado == EstadoEquipo.activo,
            ).all()
            for equipo in equipos:
                # Verificar si ya tiene una orden programada reciente
                ultima = self.db.query(OrdenMantenimiento).filter(
                    OrdenMantenimiento.equipo_id == equipo.id,
                    OrdenMantenimiento.tipo == TipoMantenimiento.preventivo,
                    OrdenMantenimiento.estado.in_([EstadoOrden.programado, EstadoOrden.en_proceso]),
                ).first()
                if ultima:
                    continue
                # Verificar fecha del último mantenimiento completado
                ultimo_completado = self.db.query(OrdenMantenimiento).filter(
                    OrdenMantenimiento.equipo_id == equipo.id,
                    OrdenMantenimiento.tipo == TipoMantenimiento.preventivo,
                    OrdenMantenimiento.estado == EstadoOrden.completado,
                ).order_by(OrdenMantenimiento.fecha_fin.desc()).first()

                if ultimo_completado and ultimo_completado.fecha_fin:
                    dias_desde = (datetime.utcnow() - ultimo_completado.fecha_fin).days
                    if dias_desde < cron.frecuencia_dias:
                        continue

                # Generar orden
                orden = OrdenMantenimiento(
                    numero=self._gen_numero(),
                    tipo=TipoMantenimiento.preventivo,
                    origen=OrigenOrden.automatico,
                    estado=EstadoOrden.programado,
                    equipo_id=equipo.id,
                    cronograma_id=cron.id,
                    fecha_programada=date.today() + timedelta(days=7),
                    descripcion=f"Mantenimiento preventivo automático – {cron.nombre}",
                )
                self.db.add(orden)
                self.db.flush()
                tareas = cron.descripcion_tareas.split("\n") if cron.descripcion_tareas else \
                         self._tareas_default(TipoMantenimiento.preventivo, cron.tipo_equipo)
                for tarea in tareas:
                    if tarea.strip():
                        self.db.add(ChecklistMantenimiento(orden_id=orden.id, tarea=tarea.strip()))
                generados += 1

        self.db.commit()
        return generados

    # ── CRONOGRAMAS ───────────────────────────────────────────────────────────
    def listar_cronogramas(self) -> List[CronogramaMantenimiento]:
        return self.db.query(CronogramaMantenimiento).filter(
            CronogramaMantenimiento.activo == True
        ).all()

    # ── DASHBOARD ─────────────────────────────────────────────────────────────
    def dashboard(self) -> DashboardMantenimiento:
        hoy        = date.today()
        ini_mes    = hoy.replace(day=1)
        en_7       = hoy + timedelta(days=7)

        total      = self.db.query(func.count(OrdenMantenimiento.id)).scalar()
        programados= self.db.query(func.count(OrdenMantenimiento.id)).filter(OrdenMantenimiento.estado == EstadoOrden.programado).scalar()
        en_proceso = self.db.query(func.count(OrdenMantenimiento.id)).filter(OrdenMantenimiento.estado == EstadoOrden.en_proceso).scalar()
        comp_mes   = self.db.query(func.count(OrdenMantenimiento.id)).filter(
            OrdenMantenimiento.estado == EstadoOrden.completado,
            OrdenMantenimiento.fecha_fin >= ini_mes,
        ).scalar()
        postergados= self.db.query(func.count(OrdenMantenimiento.id)).filter(OrdenMantenimiento.estado == EstadoOrden.postergado).scalar()
        preventivos= self.db.query(func.count(OrdenMantenimiento.id)).filter(OrdenMantenimiento.tipo == TipoMantenimiento.preventivo).scalar()
        correctivos= self.db.query(func.count(OrdenMantenimiento.id)).filter(OrdenMantenimiento.tipo == TipoMantenimiento.correctivo).scalar()
        proximos   = self.db.query(func.count(OrdenMantenimiento.id)).filter(
            OrdenMantenimiento.fecha_programada >= hoy,
            OrdenMantenimiento.fecha_programada <= en_7,
            OrdenMantenimiento.estado == EstadoOrden.programado,
        ).scalar()
        vencidos   = self.db.query(func.count(OrdenMantenimiento.id)).filter(
            OrdenMantenimiento.fecha_programada < hoy,
            OrdenMantenimiento.estado == EstadoOrden.programado,
        ).scalar()

        return DashboardMantenimiento(
            total=total, programados=programados, en_proceso=en_proceso,
            completados_mes=comp_mes, postergados=postergados,
            preventivos=preventivos, correctivos=correctivos,
            proximos_7_dias=proximos, vencidos=vencidos,
        )
