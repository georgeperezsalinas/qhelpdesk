# Flujo de vida de un ticket

## Estados
`abierto` → `en_progreso` → `pendiente` ← → `en_progreso` → `resuelto` → `cerrado`

## Reglas de SLA
| Prioridad | Tiempo de resolución |
|-----------|----------------------|
| Crítica   | 4 horas              |
| Alta      | 8 horas              |
| Media     | 24 horas             |
| Baja      | 72 horas             |

## Roles
- **Usuario final:** abre tickets, consulta estado
- **Mesa de ayuda (nivel 1):** atiende, escala si necesario
- **Especialista (nivel 2):** resuelve tickets técnicos complejos
- **Jefe de área:** reportes, aprobaciones, reasignaciones
