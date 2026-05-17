"""
Tarea periódica Celery: verifica vencimiento de licencias y contratos.
Corre una vez al día (00:30 America/Lima).

- Licencias con fecha_vencimiento en ≤30 / ≤15 / ≤7 días → alerta WS + email
- Contratos con fecha_fin en ≤30 / ≤15 / ≤7 días         → alerta WS + email

Los flags alerta_30 / alerta_15 / alerta_7 en el modelo evitan re-envíos.
Cuando se entra en un umbral más urgente se marcan los previos como hechos.
"""
import logging
from datetime import date

from sqlalchemy.orm import joinedload

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.inventario import Licencia
from app.models.contrato import Contrato, EstadoContrato
from app.models.usuario import Usuario, RolUsuario
from app.services.email_service import email_service
from app.services.notificacion_service import NotificacionService

logger = logging.getLogger(__name__)

_ROLES_ALERTAS = [RolUsuario.jefe, RolUsuario.especialista]


def _usuarios_alerta(db):
    return db.query(Usuario).filter(
        Usuario.rol.in_(_ROLES_ALERTAS),
        Usuario.activo == True,
        Usuario.email.isnot(None),
    ).all()


def _umbral_y_flags(dias, obj):
    """
    Devuelve el umbral (7, 15, 30) a alertar ahora, o None si ya se hizo todo.
    También actualiza los flags de umbrales menos urgentes para evitar
    que disparen en runs futuros si ya mandamos una alerta más urgente.
    """
    if dias <= 7:
        obj.alerta_30 = True
        obj.alerta_15 = True
        return 7 if not obj.alerta_7 else None
    if dias <= 15:
        obj.alerta_30 = True
        return 15 if not obj.alerta_15 else None
    if dias <= 30:
        return 30 if not obj.alerta_30 else None
    return None


def _marcar_flag(obj, umbral: int):
    if umbral == 7:
        obj.alerta_7 = True
    elif umbral == 15:
        obj.alerta_15 = True
    else:
        obj.alerta_30 = True


@celery_app.task(
    name="app.tasks.vencimiento_tasks.verificar_vencimientos",
    bind=True,
    max_retries=2,
)
def verificar_vencimientos(self):
    """Chequea vencimiento de licencias y contratos y dispara alertas."""
    hoy = date.today()
    db = SessionLocal()
    alertas_licencias = 0
    alertas_contratos = 0

    try:
        usuarios = _usuarios_alerta(db)

        # ── Licencias ─────────────────────────────────────────────────────────
        licencias = db.query(Licencia).filter(
            Licencia.activa == True,
            Licencia.fecha_vencimiento.isnot(None),
        ).all()

        for lic in licencias:
            dias = (lic.fecha_vencimiento - hoy).days
            if dias < 0:
                continue  # ya vencida

            umbral = _umbral_y_flags(dias, lic)
            if umbral is None:
                continue

            try:
                NotificacionService(db).licencia_por_vencer(lic.software, dias)
            except Exception as exc:
                logger.warning("WS licencia '%s': %s", lic.software, exc)

            for u in usuarios:
                nombre = f"{u.nombre} {u.apellido}"
                email_service.licencia_por_vencer(
                    u.email, nombre, lic.software, dias, lic.fecha_vencimiento
                )

            _marcar_flag(lic, umbral)
            alertas_licencias += 1

        db.commit()

        # ── Contratos ─────────────────────────────────────────────────────────
        contratos = db.query(Contrato).options(
            joinedload(Contrato.proveedor)
        ).filter(
            Contrato.estado.notin_([EstadoContrato.rescindido, EstadoContrato.vencido]),
            Contrato.fecha_fin.isnot(None),
        ).all()

        for con in contratos:
            dias = (con.fecha_fin - hoy).days

            if dias < 0:
                con.estado = EstadoContrato.vencido
                continue

            # Actualizar estado a "por_vencer" cuando entra en ventana de 30 días
            if dias <= 30 and con.estado == EstadoContrato.vigente:
                con.estado = EstadoContrato.por_vencer

            umbral = _umbral_y_flags(dias, con)
            if umbral is None:
                continue

            objeto = con.objeto or ""
            try:
                NotificacionService(db).contrato_por_vencer(con.numero, objeto, dias)
            except Exception as exc:
                logger.warning("WS contrato '%s': %s", con.numero, exc)

            proveedor_nombre = con.proveedor.nombre if con.proveedor else "—"
            for u in usuarios:
                nombre = f"{u.nombre} {u.apellido}"
                email_service.contrato_por_vencer(
                    u.email, nombre, con.numero, objeto, proveedor_nombre, dias, con.fecha_fin
                )

            _marcar_flag(con, umbral)
            alertas_contratos += 1

        db.commit()

        resultado = {"licencias": alertas_licencias, "contratos": alertas_contratos}
        logger.info("verificar_vencimientos: %s", resultado)
        return resultado

    except Exception as exc:
        logger.error("Error en verificar_vencimientos: %s", exc, exc_info=True)
        raise self.retry(exc=exc, countdown=300)

    finally:
        db.close()
