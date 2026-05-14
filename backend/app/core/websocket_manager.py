"""
websocket_manager.py
Gestiona las conexiones WebSocket activas y la distribución de notificaciones.
Sin Redis: modo en memoria (un solo proceso).
Con Redis: descomentar la sección de pub/sub para múltiples workers.
"""
from fastapi import WebSocket
from typing import Dict, List, Optional
import json
import asyncio
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # usuario_id → lista de conexiones (un usuario puede tener varias pestañas)
        self.connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, usuario_id: int):
        await websocket.accept()
        if usuario_id not in self.connections:
            self.connections[usuario_id] = []
        self.connections[usuario_id].append(websocket)
        logger.info(f"WS conectado: usuario {usuario_id} — total: {self._total()}")

    def disconnect(self, websocket: WebSocket, usuario_id: int):
        if usuario_id in self.connections:
            try:
                self.connections[usuario_id].remove(websocket)
            except ValueError:
                pass
            if not self.connections[usuario_id]:
                del self.connections[usuario_id]
        logger.info(f"WS desconectado: usuario {usuario_id} — total: {self._total()}")

    def _total(self) -> int:
        return sum(len(v) for v in self.connections.values())

    async def send_to_user(self, usuario_id: int, data: dict):
        """Envía un mensaje a todas las conexiones de un usuario."""
        if usuario_id not in self.connections:
            return
        mensaje = json.dumps(data, ensure_ascii=False, default=str)
        dead = []
        for ws in self.connections[usuario_id]:
            try:
                await ws.send_text(mensaje)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, usuario_id)

    async def broadcast_to_roles(self, roles: List[str], data: dict,
                                  db_session=None):
        """Envía a todos los usuarios conectados que tengan alguno de los roles."""
        if not db_session:
            return
        from app.models.usuario import Usuario
        usuarios_con_rol = db_session.query(Usuario.id).filter(
            Usuario.rol.in_(roles), Usuario.activo == True
        ).all()
        for (uid,) in usuarios_con_rol:
            await self.send_to_user(uid, data)

    async def broadcast_all(self, data: dict):
        """Envía a todos los usuarios conectados."""
        mensaje = json.dumps(data, ensure_ascii=False, default=str)
        for uid, conns in list(self.connections.items()):
            dead = []
            for ws in conns:
                try:
                    await ws.send_text(mensaje)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws, uid)

    def usuarios_conectados(self) -> List[int]:
        return list(self.connections.keys())


# Instancia global — se comparte entre todos los endpoints
ws_manager = ConnectionManager()
