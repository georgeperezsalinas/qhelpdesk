"""
Tarea periódica Celery: verifica SLA de tickets activos.

Corre cada 15 minutos (configurado en celery_app.py).
- Tickets con SLA en las próximas 2 horas → alerta "por vencer"
- Tickets con SLA ya expirado             → alerta "vencido"

Usa Redis para deduplicar alertas y no bombardear al técnico.
"""
import logging
from datetime import datetime, timedelta

import redis as redis_lib
from sqlalchemy.orm import joinedload

from app.celery_app import celery_app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.ticket import Ticket, EstadoTicket
from app.services.email_service import email_service
from app.services.notificacion_service import NotificacionService

logger = logging.getLogger(__name__)

# Estados que aún requieren atención SLA
_ACTIVOS = [
    EstadoTicket.abierto,
    EstadoTicket.asignado,
    EstadoTicket.en_progreso,
    EstadoTicket.pendiente,
    EstadoTicket.escalado,
]

# TTL de deduplicación en Redis
_TTL_POR_VENCER = timedelta(hours=3)   # no re-alertar por 3h
_TTL_VENCIDO    = timedelta(hours=6)   # no re-alertar por 6h


def _redis_client():
    """Devuelve cliente Redis o None si no está disponible."""
    try:
        r = redis_lib.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        r.ping()
        return r
    except Exception as exc:
        logger.warning("Redis no disponible para deduplicación SLA: %s", exc)
        return None


def _tickets_con_relaciones(db, filtros):
    """Carga tickets con solicitante y tecnico en una sola query."""
    return (
        db.query(Ticket)
        .options(joinedload(Ticket.tecnico), joinedload(Ticket.solicitante))
        .filter(*filtros)
        .all()
    )


@celery_app.task(name="app.tasks.sla_tasks.verificar_sla", bind=True, max_retries=2)
def verificar_sla(self):
    """Chequea SLA de todos los tickets activos y dispara alertas."""
    ahora = datetime.utcnow()
    db = SessionLocal()
    r = _redis_client()
    enviados_por_vencer = 0
    enviados_vencidos   = 0

    try:
        # ── 1. Tickets POR VENCER (próximas 2 horas) ─────────────────────────
        por_vencer = _tickets_con_relaciones(db, [
            Ticket.sla_limite >= ahora,
            Ticket.sla_limite <= ahora + timedelta(hours=2),
            Ticket.estado.in_(_ACTIVOS),
        ])

        for ticket in por_vencer:
            redis_key = f"sla:alerta:por_vencer:{ticket.id}"
            if r and r.exists(redis_key):
                continue  # ya se alertó recientemente

            minutos = max(1, int((ticket.sla_limite - ahora).total_seconds() / 60))

            # Notificación in-app
            if ticket.tecnico_id:
                try:
                    NotificacionService(db).sla_por_vencer(
                        ticket.numero, ticket.tecnico_id, minutos
                    )
                except Exception as exc:
                    logger.warning("WS SLA por_vencer %s: %s", ticket.numero, exc)

            # Email al técnico
            email_service.sla_por_vencer(ticket, minutos)

            if r:
                r.setex(redis_key, _TTL_POR_VENCER, "1")
            enviados_por_vencer += 1

        # ── 2. Tickets VENCIDOS ───────────────────────────────────────────────
        vencidos = _tickets_con_relaciones(db, [
            Ticket.sla_limite < ahora,
            Ticket.estado.in_(_ACTIVOS),
        ])

        for ticket in vencidos:
            redis_key = f"sla:alerta:vencido:{ticket.id}"
            if r and r.exists(redis_key):
                continue

            # Notificación in-app
            try:
                NotificacionService(db).sla_vencido(ticket.numero, ticket.tecnico_id)
            except Exception as exc:
                logger.warning("WS SLA vencido %s: %s", ticket.numero, exc)

            # Email al técnico
            email_service.sla_vencido(ticket)

            if r:
                r.setex(redis_key, _TTL_VENCIDO, "1")
            enviados_vencidos += 1

        resultado = {"por_vencer": enviados_por_vencer, "vencidos": enviados_vencidos}
        logger.info("verificar_sla: %s", resultado)
        return resultado

    except Exception as exc:
        logger.error("Error en verificar_sla: %s", exc, exc_info=True)
        raise self.retry(exc=exc, countdown=120)

    finally:
        db.close()
