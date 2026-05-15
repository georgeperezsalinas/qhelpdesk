import logging
from typing import Optional
import resend
from app.core.config import settings

logger = logging.getLogger(__name__)

_BRAND = "#1677ff"  # color primario del sistema


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

    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

            <!-- Header -->
            <tr><td style="background:{_BRAND};padding:20px 32px;">
              <span style="color:#fff;font-size:20px;font-weight:700;">🖥️ QHelpDesk</span>
            </td></tr>

            <!-- Body -->
            <tr><td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#222;font-size:18px;">{titulo}</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                {cuerpo}
                {boton}
              </table>
            </td></tr>

            <!-- Footer -->
            <tr><td style="background:#fafafa;border-top:1px solid #eee;
                           padding:16px 32px;color:#999;font-size:12px;">
              Este mensaje fue generado automáticamente por QHelpDesk.
              Por favor no responda a este correo.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>"""


def _row(label: str, value: str) -> str:
    return f"""
    <tr>
      <td style="padding:6px 0;color:#666;font-size:14px;width:120px;vertical-align:top;">
        <strong>{label}:</strong>
      </td>
      <td style="padding:6px 0;color:#333;font-size:14px;">{value}</td>
    </tr>"""


class EmailService:
    def __init__(self):
        if settings.RESEND_API_KEY:
            resend.api_key = settings.RESEND_API_KEY

    def _send(self, to: str, subject: str, html: str) -> bool:
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurado — email a %s no enviado", to)
            return False
        try:
            resend.Emails.send({
                "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>",
                "to": [to],
                "subject": subject,
                "html": html,
            })
            logger.info("Email enviado a %s — %s", to, subject)
            return True
        except Exception as exc:
            logger.warning("Error enviando email a %s: %s", to, exc)
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
        cuerpo = (
            _row("Ticket", f"<strong>{numero}</strong>")
            + _row("Asunto", titulo)
            + _row("Prioridad", prioridad.upper())
            + _row("Solicitante", solicitante)
        )
        html = _base_html(
            titulo=f"Nuevo ticket asignado: {numero}",
            cuerpo=cuerpo,
            boton_texto="Ver ticket",
            boton_url=f"{_base_url()}/tickets",
        )
        return self._send(tecnico_email, f"[QHelpDesk] Nuevo ticket asignado: {numero}", html)

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
              Tu solicitud ha sido resuelta. Por favor tómate un momento para calificar la atención recibida.
              </td></tr>"""
        )
        html = _base_html(
            titulo=f"Tu ticket {numero} fue resuelto ✅",
            cuerpo=cuerpo,
            boton_texto="Calificar atención",
            boton_url=f"{_base_url()}/portal/mis-tickets",
        )
        return self._send(solicitante_email, f"[QHelpDesk] Tu ticket {numero} fue resuelto", html)

    def ticket_comentario(
        self,
        solicitante_email: str,
        numero: str,
        titulo: str,
        comentario: str,
        autor_nombre: str,
    ) -> bool:
        cuerpo = (
            _row("Ticket", f"<strong>{numero}</strong>")
            + _row("Asunto", titulo)
            + _row("Técnico", autor_nombre)
            + f"""<tr><td colspan="2" style="padding-top:16px;">
              <div style="background:#f9f9f9;border-left:3px solid {_BRAND};
                          padding:12px 16px;border-radius:4px;font-size:14px;color:#333;">
                {comentario[:300]}{'...' if len(comentario) > 300 else ''}
              </div>
            </td></tr>"""
        )
        html = _base_html(
            titulo=f"Nuevo comentario en tu ticket {numero}",
            cuerpo=cuerpo,
            boton_texto="Ver ticket",
            boton_url=f"{_base_url()}/portal/mis-tickets",
        )
        return self._send(solicitante_email, f"[QHelpDesk] Comentario en tu ticket {numero}", html)

    # ── Compras ───────────────────────────────────────────────────────────────

    def compra_aprobada(
        self,
        solicitante_email: str,
        numero: str,
        valor_aprobado: Optional[float],
    ) -> bool:
        valor_str = f"S/ {valor_aprobado:,.2f}" if valor_aprobado else "—"
        cuerpo = (
            _row("Solicitud", f"<strong>{numero}</strong>")
            + _row("Estado", "<span style='color:#52c41a;font-weight:700;'>APROBADA ✅</span>")
            + _row("Monto aprobado", valor_str)
        )
        html = _base_html(
            titulo=f"Tu solicitud {numero} fue aprobada",
            cuerpo=cuerpo,
            boton_texto="Ver solicitud",
            boton_url=f"{_base_url()}/compras",
        )
        return self._send(solicitante_email, f"[QHelpDesk] Solicitud aprobada: {numero}", html)

    def compra_rechazada(
        self,
        solicitante_email: str,
        numero: str,
        motivo: str,
    ) -> bool:
        cuerpo = (
            _row("Solicitud", f"<strong>{numero}</strong>")
            + _row("Estado", "<span style='color:#ff4d4f;font-weight:700;'>RECHAZADA ❌</span>")
            + _row("Motivo", motivo)
        )
        html = _base_html(
            titulo=f"Tu solicitud {numero} fue rechazada",
            cuerpo=cuerpo,
            boton_texto="Ver solicitud",
            boton_url=f"{_base_url()}/compras",
        )
        return self._send(solicitante_email, f"[QHelpDesk] Solicitud rechazada: {numero}", html)


def _base_url() -> str:
    from app.core.config import settings
    origins = settings.ALLOWED_ORIGINS
    return origins[0].rstrip("/") if origins else "http://localhost:5173"


email_service = EmailService()
