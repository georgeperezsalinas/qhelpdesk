"""
notificacion_service.py
Persiste notificaciones en BD y las envía por WebSocket en tiempo real.
"""
import asyncio
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.notificacion import Notificacion, TipoNotificacion
from app.models.usuario import Usuario, RolUsuario
from app.core.websocket_manager import ws_manager


class NotificacionService:
    def __init__(self, db: Session):
        self.db = db

    # ── Crear y enviar ────────────────────────────────────────────────────────
    def _crear_en_bd(
        self,
        usuario_id: int,
        tipo: TipoNotificacion,
        titulo: str,
        mensaje: str,
        url: Optional[str] = None,
    ) -> Notificacion:
        n = Notificacion(
            usuario_id=usuario_id,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            url=url,
        )
        self.db.add(n)
        self.db.flush()
        return n

    def _payload(self, n: Notificacion) -> dict:
        return {
            "event":    "notificacion",
            "id":       n.id,
            "tipo":     n.tipo.value,
            "titulo":   n.titulo,
            "mensaje":  n.mensaje,
            "url":      n.url,
            "leida":    n.leida,
            "creado_en": n.creado_en.isoformat() if n.creado_en else None,
        }

    def _enviar_async(self, usuario_id: int, payload: dict):
        """Lanza el envío WS sin bloquear el hilo síncrono de FastAPI."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(ws_manager.send_to_user(usuario_id, payload))
        except RuntimeError:
            pass

    def notificar_usuario(
        self,
        usuario_id: int,
        tipo: TipoNotificacion,
        titulo: str,
        mensaje: str,
        url: Optional[str] = None,
    ) -> Notificacion:
        n = self._crear_en_bd(usuario_id, tipo, titulo, mensaje, url)
        self.db.commit()
        self._enviar_async(usuario_id, self._payload(n))
        return n

    def notificar_roles(
        self,
        roles: List[RolUsuario],
        tipo: TipoNotificacion,
        titulo: str,
        mensaje: str,
        url: Optional[str] = None,
    ):
        """Notifica a todos los usuarios activos con los roles indicados."""
        usuarios = self.db.query(Usuario).filter(
            Usuario.rol.in_(roles),
            Usuario.activo == True,
        ).all()
        for u in usuarios:
            n = self._crear_en_bd(u.id, tipo, titulo, mensaje, url)
            self._enviar_async(u.id, self._payload(n))
        self.db.commit()

    # ── Helpers por evento ────────────────────────────────────────────────────
    def ticket_creado(self, ticket_numero: str, titulo: str,
                      solicitante_id: int, tecnico_id: Optional[int] = None):
        # Al técnico asignado
        if tecnico_id:
            self.notificar_usuario(
                tecnico_id,
                TipoNotificacion.ticket_asignado,
                f"Nuevo ticket asignado: {ticket_numero}",
                titulo,
                url=f"/tickets",
            )
        # Al jefe de área
        self.notificar_roles(
            [RolUsuario.jefe],
            TipoNotificacion.ticket_nuevo,
            f"Ticket nuevo: {ticket_numero}",
            titulo,
            url="/tickets",
        )

    def ticket_resuelto(self, ticket_numero: str, solicitante_id: int):
        self.notificar_usuario(
            solicitante_id,
            TipoNotificacion.ticket_resuelto,
            f"Tu ticket {ticket_numero} fue resuelto",
            "Un técnico ha dado solución a tu solicitud. Por favor califica la atención.",
            url="/portal/mis-tickets",
        )

    def sla_por_vencer(self, ticket_numero: str, tecnico_id: int, minutos: int):
        self.notificar_usuario(
            tecnico_id,
            TipoNotificacion.sla_por_vencer,
            f"⚠️ SLA por vencer: {ticket_numero}",
            f"El ticket vence en {minutos} minutos.",
            url="/tickets",
        )
        self.notificar_roles(
            [RolUsuario.jefe],
            TipoNotificacion.sla_por_vencer,
            f"SLA crítico: {ticket_numero}",
            f"El ticket {ticket_numero} vence en {minutos} minutos sin resolverse.",
            url="/tickets",
        )

    def sla_vencido(self, ticket_numero: str, tecnico_id: Optional[int]):
        if tecnico_id:
            self.notificar_usuario(
                tecnico_id,
                TipoNotificacion.sla_vencido,
                f"❌ SLA vencido: {ticket_numero}",
                "El SLA de este ticket ha expirado.",
                url="/tickets",
            )
        self.notificar_roles(
            [RolUsuario.jefe],
            TipoNotificacion.sla_vencido,
            f"SLA vencido: {ticket_numero}",
            f"El ticket {ticket_numero} ha superado su tiempo límite de resolución.",
            url="/tickets",
        )

    def licencia_por_vencer(self, software: str, dias: int):
        self.notificar_roles(
            [RolUsuario.jefe, RolUsuario.especialista],
            TipoNotificacion.licencia_por_vencer,
            f"Licencia por vencer: {software}",
            f"La licencia de {software} vence en {dias} días.",
            url="/inventario",
        )

    def backup_fallido(self, politica_nombre: str):
        self.notificar_roles(
            [RolUsuario.jefe, RolUsuario.especialista],
            TipoNotificacion.backup_fallido,
            f"❌ Backup fallido: {politica_nombre}",
            f"El backup '{politica_nombre}' falló. Revisar logs.",
            url="/backup",
        )

    def solicitud_aprobada(self, numero: str, solicitante_id: int):
        self.notificar_usuario(
            solicitante_id,
            TipoNotificacion.sistema,
            f"✅ Solicitud aprobada: {numero}",
            "Tu solicitud de compra fue aprobada.",
            url="/compras",
        )

    def solicitud_rechazada(self, numero: str, solicitante_id: int, motivo: str):
        self.notificar_usuario(
            solicitante_id,
            TipoNotificacion.sistema,
            f"Solicitud rechazada: {numero}",
            f"Motivo: {motivo}",
            url="/compras",
        )

    # ── CRUD notificaciones ───────────────────────────────────────────────────
    def listar(self, usuario_id: int, solo_no_leidas: bool = False,
               limit: int = 50) -> List[Notificacion]:
        q = self.db.query(Notificacion).filter(Notificacion.usuario_id == usuario_id)
        if solo_no_leidas:
            q = q.filter(Notificacion.leida == False)
        return q.order_by(Notificacion.creado_en.desc()).limit(limit).all()

    def marcar_leida(self, notif_id: int, usuario_id: int):
        n = self.db.query(Notificacion).filter(
            Notificacion.id == notif_id,
            Notificacion.usuario_id == usuario_id,
        ).first()
        if n:
            n.leida = True
            self.db.commit()

    def marcar_todas_leidas(self, usuario_id: int):
        self.db.query(Notificacion).filter(
            Notificacion.usuario_id == usuario_id,
            Notificacion.leida == False,
        ).update({"leida": True})
        self.db.commit()

    def conteo_no_leidas(self, usuario_id: int) -> int:
        return self.db.query(Notificacion).filter(
            Notificacion.usuario_id == usuario_id,
            Notificacion.leida == False,
        ).count()
