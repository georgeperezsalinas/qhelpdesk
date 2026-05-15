from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "qhelpdesk",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.sla_tasks"],
)

celery_app.conf.update(
    timezone="America/Lima",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Reintentar tarea si el broker no está disponible al arrancar
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "verificar-sla": {
            "task": "app.tasks.sla_tasks.verificar_sla",
            "schedule": 900.0,  # cada 15 minutos
        },
    },
)
