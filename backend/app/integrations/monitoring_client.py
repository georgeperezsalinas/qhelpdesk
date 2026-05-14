import httpx
from typing import Optional

class ZabbixClient:
    """Integración con Zabbix para alertas de infraestructura"""
    def __init__(self, url: str, token: str):
        self.url = url
        self.headers = {"Authorization": f"Bearer {token}"}

    def get_alertas_activas(self) -> list:
        try:
            r = httpx.get(f"{self.url}/api/v1/alerts", headers=self.headers, timeout=5)
            return r.json()
        except Exception:
            return []

    def get_estado_host(self, host: str) -> Optional[dict]:
        try:
            r = httpx.get(f"{self.url}/api/v1/hosts/{host}", headers=self.headers, timeout=5)
            return r.json()
        except Exception:
            return None
