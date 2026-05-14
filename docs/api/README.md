# Documentación de la API

La API REST está disponible en `/api/v1/` y cuenta con documentación interactiva en:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Autenticación
La API usa JWT. Para obtener un token:
```
POST /api/v1/usuarios/login
Content-Type: application/x-www-form-urlencoded
username=admin&password=...
```
Usar el token en el header: `Authorization: Bearer <token>`
