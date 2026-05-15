# QHelpdesk — Seguimiento y Roadmap

> Última actualización: 2026-05-15  
> Auditoría inicial completada. Madurez estimada: **~65% MVP**

---

## Estado del Sistema

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Backend | FastAPI 0.111 + SQLAlchemy 2 + PostgreSQL | ✅ Funcional |
| Frontend | React 18 + Vite + Ant Design | ✅ Funcional |
| Auth | JWT + OAuth2 + bcrypt | ✅ Funcional |
| Real-time | WebSocket | ✅ Funcional |
| Reportes | Excel (openpyxl) + PDF (ReportLab) | ✅ Funcional |
| Docker | docker-compose | ✅ Configurado |
| Email | — | ❌ No implementado |
| LDAP/AD | ldap3 instalado pero sin conectar | ⚠️ Parcial |
| Redis/Celery | Instalados sin uso | ⚠️ Sin usar |
| Rate Limiting | — | ❌ No implementado |

---

## Módulos Implementados

| Módulo | Endpoints | Estado | Notas |
|--------|-----------|--------|-------|
| Tickets | 11 | ✅ Completo | Ciclo completo, SLA, escalación, NPS |
| Usuarios | 11 | ✅ Completo | RBAC 6 roles |
| Inventario | 11 | ✅ Completo | Equipos, licencias, historial |
| Mantenimiento | 8 | ✅ Completo | Preventivo/correctivo, checklist |
| Compras | 7 | ✅ Completo | Flujo aprobación |
| Backup | 7 | ✅ Completo | Políticas y ejecuciones |
| Infraestructura | 8 | ✅ Completo | Servidores, red, BD |
| Telefonía | 4 | ⚠️ Básico | Solo CRUD, sin análisis |
| Reportes | 6 | ✅ Funcional | Excel + PDF |
| Notificaciones | 7 + WS | ✅ Funcional | WebSocket tiempo real |
| Portal usuario | 3 páginas | ⚠️ Mínimo | Home, nuevo ticket, mis tickets |
| Base Conocimiento | Tabla solo | ❌ Sin UI | Tabla `articulos_kb` sin frontend |

**Total: ~70 endpoints, 27 tablas DB**

---

## Bugs Críticos

### ✅ RESUELTO — Password temporal predecible
- **Archivo:** `backend/app/api/usuarios/__init__.py:199`
- **Problema:** `nueva = f"{user.username.capitalize()}2024*"` — predecible y año hardcodeado
- **Fix:** Generación con `secrets.token_urlsafe(12)` más símbolo especial
- **Resueltó:** 2026-05-15

### ✅ RESUELTO — Notificaciones de compras nunca disparadas  
- **Archivo:** `backend/app/api/compras/__init__.py:71-95`
- **Problema:** `aprobar` y `rechazar` llaman a `actualizar()` pero jamás invocan `NotificacionService.solicitud_aprobada()` / `solicitud_rechazada()`
- **Fix:** Agregar llamadas al servicio de notificaciones tras la actualización
- **Resuelto:** 2026-05-15

### ✅ RESUELTO — Sin rate limiting en login
- **Archivo:** `backend/app/main.py` + `backend/app/api/usuarios/__init__.py`
- **Problema:** Endpoint `/login` sin protección contra fuerza bruta
- **Fix:** `slowapi` — 5 intentos/minuto por IP en login y refresh
- **Resuelto:** 2026-05-15

### 🔴 PENDIENTE — `{username}2024*` ya corregido arriba (ver arriba)

### 🔴 PENDIENTE — Sin manejo de errores en notificaciones de tickets
- **Archivos:** `backend/app/api/tickets/__init__.py` líneas 56-62, 86-92, 113-125
- **Problema:** `except Exception: pass` — errores de notificación silenciados sin logging
- **Fix:** Reemplazar `pass` con `logger.warning(...)` para visibilidad en producción

---

## Roadmap

### Fase 1 — Pre-producción (Prioridad ALTA)

| # | Tarea | Complejidad | Estado |
|---|-------|-------------|--------|
| 1 | ~~Fix password temporal predecible~~ | Baja | ✅ Hecho |
| 2 | ~~Fix notificaciones compras~~ | Baja | ✅ Hecho |
| 3 | ~~Rate limiting en login~~ | Media | ✅ Hecho |
| 4 | Logging en bloques try/except de notificaciones | Baja | 🔴 Pendiente |
| 5 | Email SMTP — notificaciones salientes (ticket creado, resuelto) | Alta | 🔴 Pendiente |
| 6 | Alertas SLA automáticas (job background con Celery ya instalado) | Alta | 🔴 Pendiente |

### Fase 2 — v1.0 (Prioridad MEDIA)

| # | Tarea | Complejidad | Estado |
|---|-------|-------------|--------|
| 7 | LDAP/AD sync — conectar `ldap_client.py` existente | Media | 🔵 Backlog |
| 8 | Portal mejorado — búsqueda KB, filtros en mis-tickets | Media | 🔵 Backlog |
| 9 | Alertas automáticas vencimiento licencias y contratos | Media | 🔵 Backlog |
| 10 | UI Base de conocimiento completa | Alta | 🔵 Backlog |
| 11 | Dashboard SLA compliance — % tickets resueltos en tiempo | Media | 🔵 Backlog |

### Fase 3 — v1.5 (Prioridad BAJA)

| # | Tarea | Complejidad | Estado |
|---|-------|-------------|--------|
| 12 | Email inbound — crear tickets desde email | Muy Alta | 🔵 Backlog |
| 13 | Reportes avanzados — métricas técnico, trend analysis | Alta | 🔵 Backlog |
| 14 | WhatsApp channel | Alta | 🔵 Backlog |
| 15 | Módulo telefonía — análisis de costos y uso | Media | 🔵 Backlog |
| 16 | Calendario/vista Gantt para mantenimiento | Alta | 🔵 Backlog |

---

## Deuda Técnica

| Ítem | Archivo | Descripción |
|------|---------|-------------|
| N+1 queries | `ticket_service.py:listar` | Relaciones cargadas sin `joinedload` en listado |
| Sin cursor pagination | Múltiples servicios | `offset/limit` ineficiente en grandes volúmenes |
| Redis sin usar | `requirements.txt` | Instalado pero sin implementar caché |
| Celery sin usar | `requirements.txt` | Instalado pero sin workers configurados — ideal para alertas SLA |
| CORS muy abierto | `main.py:31` | `allow_methods=["*"]` — restringir a los necesarios |
| Sin validación fecha | Schema compras | `fecha_necesidad` no valida que sea fecha futura |

---

## Notas de Arquitectura

- **Auto-asignación de tickets:** usa skill match + menor carga actual (correcto)
- **SLA:** calculado y persistido correctamente en `tiempo_resolucion_h` (horas, no segundos)
- **WebSocket:** ping cada 30s, reconexión manejada por cliente
- **Uploads:** imágenes hasta 5MB, servidas como static files — no hay CDN
- **Migrations:** Alembic configurado pero sin migraciones versionadas en `/migrations/`

---

## Sesiones de Trabajo

| Fecha | Actividad |
|-------|-----------|
| 2026-05-15 | Auditoría inicial completa. Fixes: password, notificaciones compras, rate limiting |
