import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_listar_tickets_sin_auth():
    r = client.get("/api/v1/tickets/")
    assert r.status_code == 401

# Agregar más tests con fixtures de base de datos de prueba
