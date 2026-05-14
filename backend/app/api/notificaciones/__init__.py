from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from jose import JWTError
import asyncio
import json

from app.core.database import get_db, SessionLocal
from app.core.deps import get_current_user
from app.core.security import decode_access_token
from app.core.websocket_manager import ws_manager
from app.models.usuario import Usuario
from app.models.notificacion import Notificacion
from app.services.notificacion_service import NotificacionService
from pydantic import BaseModel

router = APIRouter()

# ── SCHEMA ─────────────────────────────────────────────────────────────────────
class NotificacionRead(BaseModel):
    id: int
    tipo: str
    titulo: str
    mensaje: str
    url: Optional[str] = None
    leida: bool
    creado_en: str
    class Config:
        from_attributes = True

# ── WEBSOCKET ENDPOINT ────────────────────────────────────────────────────────
@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    Conexión WebSocket autenticada por token JWT.
    URL: ws://localhost:8000/api/v1/notificaciones/ws/<access_token>
    """
    # Validar token
    try:
        payload = decode_access_token(token)
        usuario_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        await websocket.close(code=4001)
        return

    # Verificar usuario activo
    db = SessionLocal()
    try:
        user = db.query(Usuario).filter(
            Usuario.id == usuario_id, Usuario.activo == True
        ).first()
        if not user:
            await websocket.close(code=4001)
            return

        await ws_manager.connect(websocket, usuario_id)

        # Enviar notificaciones no leídas al conectar
        svc = NotificacionService(db)
        no_leidas = svc.listar(usuario_id, solo_no_leidas=True, limit=20)
        if no_leidas:
            await websocket.send_text(json.dumps({
                "event": "notificaciones_pendientes",
                "total": len(no_leidas),
                "items": [
                    {
                        "id":       n.id,
                        "tipo":     n.tipo.value,
                        "titulo":   n.titulo,
                        "mensaje":  n.mensaje,
                        "url":      n.url,
                        "leida":    n.leida,
                        "creado_en": n.creado_en.isoformat() if n.creado_en else None,
                    }
                    for n in no_leidas
                ],
            }, ensure_ascii=False))

        # Enviar ping cada 30s para mantener viva la conexión
        async def keepalive():
            while True:
                await asyncio.sleep(30)
                try:
                    await websocket.send_text(json.dumps({"event": "ping"}))
                except Exception:
                    break

        keepalive_task = asyncio.create_task(keepalive())

        try:
            while True:
                # Escuchar mensajes del cliente (ej: marcar como leída)
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                    if msg.get("action") == "marcar_leida" and msg.get("id"):
                        svc.marcar_leida(msg["id"], usuario_id)
                        await websocket.send_text(json.dumps({
                            "event": "leida_confirmada",
                            "id": msg["id"],
                        }))
                    elif msg.get("action") == "marcar_todas_leidas":
                        svc.marcar_todas_leidas(usuario_id)
                        await websocket.send_text(json.dumps({
                            "event": "todas_leidas"
                        }))
                    elif msg.get("action") == "pong":
                        pass  # respuesta al keepalive
                except (json.JSONDecodeError, Exception):
                    pass
        except WebSocketDisconnect:
            pass
        finally:
            keepalive_task.cancel()
            ws_manager.disconnect(websocket, usuario_id)
    finally:
        db.close()

# ── REST ENDPOINTS DE NOTIFICACIONES ──────────────────────────────────────────
@router.get("/", response_model=List[NotificacionRead])
def listar_notificaciones(
    solo_no_leidas: bool = False,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    notifs = NotificacionService(db).listar(current_user.id, solo_no_leidas, limit)
    return [
        {
            "id":       n.id,
            "tipo":     n.tipo.value,
            "titulo":   n.titulo,
            "mensaje":  n.mensaje,
            "url":      n.url,
            "leida":    n.leida,
            "creado_en": n.creado_en.isoformat() if n.creado_en else "",
        }
        for n in notifs
    ]

@router.get("/conteo")
def conteo_no_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return {"total": NotificacionService(db).conteo_no_leidas(current_user.id)}

@router.post("/{notif_id}/leer")
def marcar_leida(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    NotificacionService(db).marcar_leida(notif_id, current_user.id)
    return {"ok": True}

@router.post("/leer-todas")
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    NotificacionService(db).marcar_todas_leidas(current_user.id)
    return {"ok": True}

@router.get("/online")
def usuarios_online(
    _: Usuario = Depends(get_current_user),
):
    return {"usuarios_conectados": ws_manager.usuarios_conectados()}
