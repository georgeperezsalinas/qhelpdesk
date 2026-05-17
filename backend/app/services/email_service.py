import logging
from datetime import date
from typing import Optional, TYPE_CHECKING
from mailjet_rest import Client
from app.core.config import settings

if TYPE_CHECKING:
    from app.models.ticket import Ticket

logger = logging.getLogger(__name__)

_BRAND = "#1677ff"


def _base_html(titulo: str, cuerpo: str, boton_texto: str = "", boton_url: str = "") -> str:
    boton = ""
    if boton_texto and boton_url:
        boton = f"""
        <tr><td style="padding:24px 0 0;">
          <a href="{boton_url}"
             style="background:{_BRAND};color:#fff;padding:12px 24px;border-radius:6px;
                    text-decoration:none;font-weight:600;display:inline-block;">
            {boton_texto}
          </a>
        </td></tr>"""

    return f"""<!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
            <tr><td style="background:{_BRAND};padding:20px 32px;">
              <span style="color:#fff;font-size:20px;font-weight:700;">&#128421; QHelpDesk</span>
            </td></tr>
            <tr><td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#222;font-size:18px;">{titulo}</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                {cuerpo}
                {boton}
              </table>
            </td></tr>
            <tr><td style="background:#fafafa;border-top:1px solid #eee;
                           padding:16px 32px;color:#999;font-size:12px;">
              Mensaje automático de QHelpDesk. Por favor no responda este correo.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>"""


def _row(label: str, value: str) -> str:
    return f"""<tr>
      <td style="padding:6px 0;color:#666;font-size:14px;width:130px;vertical-align:top;">
        <strong>{label}:</strong>
      </td>
      <td style="padding:6px 0;color:#333;font-size:14px;">{value}</td>
    </tr>"""


def _base_url() -> str:
    return settings.APP_BASE_URL.rstrip("/")


class EmailService:

    def _client(self) -> Client:
        return Client(
            auth=(settings.MAILJET_API_KEY, settings.MAILJET_API_SECRET),
            version="v3.1",
        )

    def _send(self, to_email: str, to_name: str, subject: str, html: str) -> bool:
        if not settings.MAILJET_API_KEY or not settings.MAILJET_API_SECRET:
            logger.warning("Mailjet no configurado — email a %s omitido", to_email)
            return False
        try:
            result = self._client().send.create(data={
                "Messages": [{
                    "From": {
                        "Email": settings.EMAIL_FROM,
                        "Name": settings.EMAIL_FROM_NAME,
                    },
                    "To": [{"Email": to_email, "Name": to_name}],
                    "Subject": subject,
                    "HTMLPart": html,
                }]
            })
            if result.status_code == 200:
                logger.info("Email enviado a %s — %s", to_email, subject)
                return True
            logger.warning("Mailjet %s para email a %s: %s",
                           result.status_code, to_email, result.json())
            return False
        except Exception as exc:
            logger.warning("Error enviando email a %s: %s", to_email, exc)
            return False

    # ── Tickets ───────────────────────────────────────────────────────────────

    def ticket_asignado(
        self,
        tecnico_email: str,
        tecnico_nombre: str,
        numero: str,
        titulo: str,
        prioridad: str,
        solicitante: str,
    ) -> bool:
        colores_prioridad = {
            "critica": "#ff4d4f",
            "alta": "#fa8c16",
            "media": "#faad14",
            "baja": "#52c41a",
        }
        color = colores_prioridad.get(prioridad.lower(), _BRAND)
        cuerpo = (
            _row("Ticket", f"<strong>{numero}</strong>")
            + _row("Asunto", titulo)
            + _row("Prioridad", f"<span style='color:{color};font-weight:700;'>{prioridad.upper()}</span>")
            + _row("Solicitante", solicitante)
        )
        html = _base_html(
            titulo=f"Nuevo ticket asignado: {numero}",
            cuerpo=cuerpo,
            boton_texto="Ver ticket",
            boton_url=f"{_base_url()}/tickets",
        )
        return self._send(
            tecnico_email, tecnico_nombre,
            f"[QHelpDesk] Nuevo ticket asignado: {numero}", html,
        )

    def ticket_resuelto(
        self,
        solicitante_email: str,
        solicitante_nombre: str,
        numero: str,
        titulo: str,
    ) -> bool:
        cuerpo = (
            _row("Ticket", f"<strong>{numero}</strong>")
            + _row("Asunto", titulo)
            + """<tr><td colspan="2" style="padding-top:16px;color:#555;font-size:14px;">
              Tu solicitud ha sido resuelta. Por favor tómate un momento para
              calificar la atención recibida — tu opinión nos ayuda a mejorar.
              </td></tr>"""
        )
        html = _base_html(
            titulo=f"Tu ticket {numero} fue resuelto &#10003;",
            cuerpo=cuerpo,
            boton_texto="Calificar atención",
            boton_url=f"{_base_url()}/portal/mis-tickets",
        )
        return self._send(
            solicitante_email, solicitante_nombre,
            f"[QHelpDesk] Tu ticket {numero} fue resuelto", html,
        )

    def ticket_comentario(
        self,
        solicitante_email: str,
        solicitante_nombre: str,
        numero: str,
        titulo: str,
        comentario: str,
        autor_nombre: str,
    ) -> bool:
        extracto = comentario[:300] + ("..." if len(comentario) > 300 else "")
        cuerpo = (
            _row("Ticket", f"<strong>{numero}</strong>")
            + _row("Asunto", titulo)
            + _row("Técnico", autor_nombre)
            + f"""<tr><td colspan="2" style="padding-top:16px;">
              <div style="background:#f9f9f9;border-left:3px solid {_BRAND};
                          padding:12px 16px;border-radius:4px;font-size:14px;color:#333;">
                {extracto}
              </div>
            </td></tr>"""
        )
        html = _base_html(
            titulo=f"Nuevo comentario en tu ticket {numero}",
            cuerpo=cuerpo,
            boton_texto="Ver ticket",
            boton_url=f"{_base_url()}/portal/mis-tickets",
        )
        return self._send(
            solicitante_email, solicitante_nombre,
            f"[QHelpDesk] Comentario en tu ticket {numero}", html,
        )

    # ── SLA ───────────────────────────────────────────────────────────────────

    def sla_por_vencer(self, ticket: "Ticket", minutos: int) -> bool:
        if not ticket.tecnico or not ticket.tecnico.email:
            return False
        horas = minutos // 60
        mins  = minutos % 60
        tiempo_str = f"{horas}h {mins}min" if horas else f"{mins} min"
        cuerpo = (
            _row("Ticket", f"<strong>{ticket.numero}</strong>")
            + _row("Asunto", ticket.titulo)
            + _row("Prioridad", ticket.prioridad.value.upper())
            + _row("Vence en", f"<span style='color:#fa8c16;font-weight:700;'>{tiempo_str}</span>")
        )
        html = _base_html(
            titulo=f"&#9888; SLA por vencer: {ticket.numero}",
            cuerpo=cuerpo,
            boton_texto="Atender ahora",
            boton_url=f"{_base_url()}/tickets",
        )
        nombre = f"{ticket.tecnico.nombre} {ticket.tecnico.apellido}"
        return self._send(
            ticket.tecnico.email, nombre,
            f"[QHelpDesk] ⚠️ SLA por vencer ({tiempo_str}): {ticket.numero}", html,
        )

    def sla_vencido(self, ticket: "Ticket") -> bool:
        if not ticket.tecnico or not ticket.tecnico.email:
            return False
        cuerpo = (
            _row("Ticket", f"<strong>{ticket.numero}</strong>")
            + _row("Asunto", ticket.titulo)
            + _row("Prioridad", ticket.prioridad.value.upper())
            + _row("Estado SLA", "<span style='color:#ff4d4f;font-weight:700;'>VENCIDO &#10060;</span>")
        )
        html = _base_html(
            titulo=f"SLA vencido: {ticket.numero}",
            cuerpo=cuerpo,
            boton_texto="Resolver ticket",
            boton_url=f"{_base_url()}/tickets",
        )
        nombre = f"{ticket.tecnico.nombre} {ticket.tecnico.apellido}"
        return self._send(
            ticket.tecnico.email, nombre,
            f"[QHelpDesk] ❌ SLA vencido: {ticket.numero}", html,
        )

    # ── Inventario / Contratos ────────────────────────────────────────────────

    def licencia_por_vencer(
        self,
        to_email: str,
        to_name: str,
        software: str,
        dias: int,
        fecha_vencimiento: date,
    ) -> bool:
        color = "#ff4d4f" if dias <= 7 else ("#fa8c16" if dias <= 15 else "#faad14")
        cuerpo = (
            _row("Software", f"<strong>{software}</strong>")
            + _row("Vence en", f"<span style='color:{color};font-weight:700;'>{dias} días</span>")
            + _row("Fecha", fecha_vencimiento.strftime("%d/%m/%Y"))
        )
        html = _base_html(
            titulo=f"Licencia por vencer: {software}",
            cuerpo=cuerpo,
            boton_texto="Ver inventario",
            boton_url=f"{_base_url()}/inventario",
        )
        return self._send(
            to_email, to_name,
            f"[QHelpDesk] ⚠️ Licencia por vencer ({dias}d): {software}", html,
        )

    def contrato_por_vencer(
        self,
        to_email: str,
        to_name: str,
        numero: str,
        objeto: str,
        proveedor: str,
        dias: int,
        fecha_fin: date,
    ) -> bool:
        color = "#ff4d4f" if dias <= 7 else ("#fa8c16" if dias <= 15 else "#faad14")
        cuerpo = (
            _row("Contrato", f"<strong>{numero}</strong>")
            + _row("Objeto", objeto or "—")
            + _row("Proveedor", proveedor)
            + _row("Vence en", f"<span style='color:{color};font-weight:700;'>{dias} días</span>")
            + _row("Fecha fin", fecha_fin.strftime("%d/%m/%Y"))
        )
        html = _base_html(
            titulo=f"Contrato por vencer: {numero}",
            cuerpo=cuerpo,
            boton_texto="Ver contratos",
            boton_url=f"{_base_url()}/inventario",
        )
        return self._send(
            to_email, to_name,
            f"[QHelpDesk] ⚠️ Contrato por vencer ({dias}d): {numero}", html,
        )

    # ── Compras ───────────────────────────────────────────────────────────────

    def compra_aprobada(
        self,
        solicitante_email: str,
        solicitante_nombre: str,
        numero: str,
        valor_aprobado: Optional[float],
    ) -> bool:
        valor_str = f"S/ {valor_aprobado:,.2f}" if valor_aprobado else "—"
        cuerpo = (
            _row("Solicitud", f"<strong>{numero}</strong>")
            + _row("Estado", "<span style='color:#52c41a;font-weight:700;'>APROBADA &#10003;</span>")
            + _row("Monto aprobado", valor_str)
        )
        html = _base_html(
            titulo=f"Tu solicitud {numero} fue aprobada",
            cuerpo=cuerpo,
            boton_texto="Ver solicitud",
            boton_url=f"{_base_url()}/compras",
        )
        return self._send(
            solicitante_email, solicitante_nombre,
            f"[QHelpDesk] Solicitud aprobada: {numero}", html,
        )

    def compra_rechazada(
        self,
        solicitante_email: str,
        solicitante_nombre: str,
        numero: str,
        motivo: str,
    ) -> bool:
        cuerpo = (
            _row("Solicitud", f"<strong>{numero}</strong>")
            + _row("Estado", "<span style='color:#ff4d4f;font-weight:700;'>RECHAZADA &#10060;</span>")
            + _row("Motivo", motivo)
        )
        html = _base_html(
            titulo=f"Tu solicitud {numero} fue rechazada",
            cuerpo=cuerpo,
            boton_texto="Ver solicitud",
            boton_url=f"{_base_url()}/compras",
        )
        return self._send(
            solicitante_email, solicitante_nombre,
            f"[QHelpDesk] Solicitud rechazada: {numero}", html,
        )


email_service = EmailService()
