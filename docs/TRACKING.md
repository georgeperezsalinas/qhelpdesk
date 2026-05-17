# QHelpdesk — Seguimiento y Roadmap

> Última actualización: 2026-05-15  
> Madurez estimada: **~90% MVP**. Fase 3 completa (excepto email inbound y WhatsApp, pendientes de replantear)

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

### ✅ RESUELTO — Sin manejo de errores en notificaciones de tickets
- **Archivos:** `backend/app/api/tickets/__init__.py`
- **Problema:** `except Exception: pass` — errores de notificación silenciados sin logging
- **Fix:** Reemplazar `pass` con `logger.warning(...)` en los 3 bloques
- **Resuelto:** 2026-05-15

---

## Roadmap

### Fase 1 — Pre-producción (Prioridad ALTA)

| # | Tarea | Complejidad | Estado |
|---|-------|-------------|--------|
| 1 | ~~Fix password temporal predecible~~ | Baja | ✅ Hecho |
| 2 | ~~Fix notificaciones compras~~ | Baja | ✅ Hecho |
| 3 | ~~Rate limiting en login~~ | Media | ✅ Hecho |
| 4 | ~~Logging en bloques try/except de notificaciones~~ | Baja | ✅ Hecho |
| 5 | ~~Email transaccional Resend — ticket asignado, resuelto, comentario, compra aprobada/rechazada~~ | Alta | ✅ Hecho |
| 6 | ~~Alertas SLA automáticas con Celery + Redis (por vencer 2h + vencido, dedup Redis)~~ | Alta | ✅ Hecho |

### Fase 2 — v1.0 (Prioridad MEDIA)

| # | Tarea | Complejidad | Estado |
|---|-------|-------------|--------|
| 7 | LDAP/AD sync — conectar `ldap_client.py` existente | Media | ⏸ Pendiente (docker LDAP en progreso) |
| 8 | ~~Portal mejorado — búsqueda KB, filtros en mis-tickets~~ | Media | ✅ Hecho |
| 9 | ~~Alertas automáticas vencimiento licencias y contratos~~ | Media | ✅ Hecho |
| 10 | ~~UI Base de conocimiento completa~~ | Alta | ✅ Hecho |
| 11 | ~~Dashboard SLA compliance — % tickets resueltos en tiempo~~ | Media | ✅ Hecho |

### Fase 3 — v1.5 (Prioridad BAJA)

| # | Tarea | Complejidad | Estado |
|---|-------|-------------|--------|
| 12 | Email inbound — crear tickets desde email | Muy Alta | ⏸ Pendiente (replantear) |
| 13 | ~~Reportes avanzados — métricas técnico, trend analysis~~ | Alta | ✅ Hecho |
| 14 | WhatsApp channel | Alta | ⏸ Pendiente (replantear) |
| 15 | ~~Módulo telefonía — análisis de costos y uso~~ | Media | ✅ Hecho |
| 16 | ~~Calendario/vista Gantt para mantenimiento~~ | Alta | ✅ Hecho |

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
| 2026-05-15 | Logging en except pass. Email transaccional con Resend (ventas@qsdsoft.com): ticket asignado, resuelto, comentario, compra aprobada/rechazada |
| 2026-05-15 | Migración email Resend→Mailjet (a136b0d2...). Alertas SLA Celery: verificar_sla cada 15min, dedup Redis (3h/6h), WS+email por_vencer y vencido. Docker: redis+worker+beat. |
| 2026-05-15 | Email Mailjet confirmado funcionando (prueba recibida en georgeperezsalinas@gmail.com). Backend local OK con mailjet-rest + slowapi instalados en venv. |
| 2026-05-15 | #9 Alertas vencimiento licencias+contratos: vencimiento_tasks.py (Celery daily), flags alerta_30/15/7 en DB, email+WS a jefe+especialista. #10 UI Base de conocimiento: ConocimientoPage con tabla, KPIs, drawer crear/editar/ver, filtros por estado/categoría, botón publicar rápido. Backend: endpoint admin/todos + DELETE. Menú LayoutPrincipal actualizado. #11 Dashboard SLA compliance: endpoint /tickets/sla-compliance (rate global, por prioridad, por técnico, tendencia 30d), sección 03 en DashboardPage con LineChart tendencia + BarChart prioridad + ranking técnicos. Fase 2 completa excepto LDAP. |
| 2026-05-15 | Fase 3: #13 Reportes Analytics tab (tendencia semanal LineChart + distribución categorías horizontal BarChart + tabla métricas por técnico con SLA/NPS/tiempo). Endpoints: /tickets/metricas-tecnico, /tickets/tendencia-semanal. #15 Telefonía tab "Análisis de costos": endpoint /telefonia/analisis-costos (por operador/tipo/sede, próximas a vencer 60d, top 10 costosas). #16 Calendario mantenimiento: CalendarioMantenimiento con antd Calendar, badges por estado, panel lateral con órdenes del día seleccionado. |
