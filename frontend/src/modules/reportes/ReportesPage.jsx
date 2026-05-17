// ─────────────────────────────────────────────────────────────────────
// src/modules/reportes/ReportesPage.jsx
// Rediseño v2 — Reportes y exportaciones
// Drop-in: mantiene endpoints /reportes/*, descarga de blobs, RangePicker.
// Requiere: qmodules.css y qhelpers.jsx cargados.
// ─────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Button, DatePicker, Space, Alert, message } from 'antd'
import {
  FileExcelOutlined, FilePdfOutlined, DownloadOutlined,
  BarChartOutlined, ToolOutlined, ShoppingCartOutlined,
  DashboardOutlined, SafetyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { QPageHeader, QPill } from '../../components/common/qhelpers'

const { RangePicker } = DatePicker

// ── Util: descargar blob ─────────────────────────────────────────────
async function descargarReporte(url, filename, setLoading) {
  setLoading(true)
  try {
    const resp = await api.get(url, { responseType: 'blob' })
    const href = window.URL.createObjectURL(new Blob([resp.data]))
    const a = document.createElement('a')
    a.href = href; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    window.URL.revokeObjectURL(href)
    message.success(`Reporte descargado: ${filename}`)
  } catch { message.error('Error al generar el reporte') }
  finally { setLoading(false) }
}

// ── Tarjeta de reporte (rediseño editorial) ─────────────────────────
function ReporteCard({
  num, icon, titulo, descripcion, etiquetas, tone,
  onExcel, onPDF, loadingExcel, loadingPDF,
  requiereFecha = true, fechas, setFechas,
}) {
  const toneColor = {
    info:  'var(--info)',
    ok:    'var(--ok)',
    warn:  'var(--warn)',
    plum:  'var(--plum)',
    crit:  'var(--crit)',
    acc:   'var(--acc)',
  }[tone || 'acc']

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--line-1)',
      borderRadius: 'var(--radius-md)',
      padding: '22px 24px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 22, bottom: 22,
        width: 3, background: toneColor,
      }} />

      {/* Top: numbering + icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${toneColor}14`,
          color: toneColor,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="qmono" style={{
            fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em',
            marginBottom: 4,
          }}>R · {num}</div>
          <div style={{
            fontFamily: 'var(--f-display)',
            fontSize: 22, lineHeight: 1.15,
            color: 'var(--ink-1)', letterSpacing: '-0.01em',
            fontStyle: 'italic',
          }}>{titulo}</div>
        </div>
      </div>

      {/* Descripción */}
      <p style={{
        fontSize: 12.5, color: 'var(--ink-3)',
        lineHeight: 1.55, margin: '0 0 12px',
        minHeight: 56,
      }}>{descripcion}</p>

      {/* Etiquetas */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {etiquetas.map(e => <QPill key={e} tone="muted">{e}</QPill>)}
      </div>

      {/* RangePicker */}
      {requiereFecha && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 9.5, fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6,
          }}>Período</div>
          <RangePicker
            size="middle"
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={fechas}
            onChange={setFechas}
            presets={[
              { label: 'Este mes',         value: [dayjs().startOf('month'), dayjs()] },
              { label: 'Mes anterior',     value: [dayjs().subtract(1,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
              { label: 'Últimos 3 meses',  value: [dayjs().subtract(3,'month'), dayjs()] },
              { label: 'Este año',         value: [dayjs().startOf('year'), dayjs()] },
            ]}
          />
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Botones */}
      <div style={{
        display: 'flex', gap: 8,
        paddingTop: 14,
        borderTop: '1px solid var(--line-2)',
      }}>
        {onExcel && (
          <Button icon={<FileExcelOutlined />} loading={loadingExcel} onClick={onExcel}
            style={{
              flex: 1, height: 36,
              borderColor: 'var(--ok)', color: 'var(--ok)',
              background: 'var(--ok-soft)',
            }}>
            Excel
          </Button>
        )}
        {onPDF && (
          <Button icon={<FilePdfOutlined />} loading={loadingPDF} onClick={onPDF}
            style={{
              flex: 1, height: 36,
              borderColor: 'var(--crit)', color: 'var(--crit)',
              background: 'var(--crit-soft)',
            }}>
            PDF
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────
export default function ReportesPage() {
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [fechasTickets,   setFechasTickets]  = useState([dayjs().startOf('month'), dayjs()])
  const [fechasMant,      setFechasMant]     = useState([dayjs().startOf('month'), dayjs()])
  const [fechasCompras,   setFechasCompras]  = useState([dayjs().startOf('month'), dayjs()])
  const [fechasGerencial, setFechasGerencial]= useState([dayjs().startOf('month'), dayjs()])
  const [loadings, setLoadings] = useState({})
  const setLoading = (key, val) => setLoadings(p => ({ ...p, [key]: val }))

  const params = (fechas) => {
    if (!fechas || !fechas[0] || !fechas[1]) return ''
    return `?fecha_desde=${fechas[0].format('YYYY-MM-DD')}&fecha_hasta=${fechas[1].format('YYYY-MM-DD')}`
  }

  if (!esJefe) {
    return (
      <div>
        <QPageHeader
          eyebrow="Inteligencia · reportes"
          title="Reportes &"
          titleEm="exportaciones"
        />
        <Alert className="qalert" type="warning" showIcon
          message="Acceso restringido"
          description="Solo el jefe de área y especialistas pueden generar reportes." />
      </div>
    )
  }

  return (
    <div>
      <QPageHeader
        eyebrow="Inteligencia · reportes y exportaciones"
        title="Reportes"
        titleEm="& exportaciones"
        subtitle="Genera reportes ejecutivos con datos en tiempo real, listos para presentar a dirección. Excel con múltiples hojas y filtros · PDF con KPIs visuales y branding institucional."
      />

      <Alert className="qalert" type="info" showIcon
        message="Los reportes se generan en tiempo real con los datos actuales del sistema."
        description="Los rangos de fecha se aplican según la fecha de creación del registro." />

      {/* Grid de tarjetas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 18,
        marginTop: 8,
      }}>
        <ReporteCard
          num="01" tone="info" icon={<BarChartOutlined />}
          titulo="Tickets y SLA"
          descripcion="Resumen ejecutivo con KPIs, distribución por prioridad, categoría y técnico. Detalle completo con SLA y NPS."
          etiquetas={['2 hojas', 'SLA', 'NPS', 'Técnicos']}
          fechas={fechasTickets} setFechas={setFechasTickets}
          loadingExcel={loadings.ticketsExcel}
          onExcel={() => descargarReporte(
            `/reportes/tickets/excel${params(fechasTickets)}`,
            `reporte_tickets_${dayjs().format('YYYYMMDD')}.xlsx`,
            v => setLoading('ticketsExcel', v)
          )}
        />

        <ReporteCard
          num="02" tone="ok" icon={<SafetyOutlined />}
          titulo="Inventario TI"
          descripcion="Estado del inventario, depreciación por equipo, valor actual vs valor de compra. Licencias por vencer."
          etiquetas={['2 hojas', 'Depreciación', 'Licencias']}
          requiereFecha={false}
          loadingExcel={loadings.inventarioExcel}
          onExcel={() => descargarReporte(
            '/reportes/inventario/excel',
            `reporte_inventario_${dayjs().format('YYYYMMDD')}.xlsx`,
            v => setLoading('inventarioExcel', v)
          )}
        />

        <ReporteCard
          num="03" tone="warn" icon={<ToolOutlined />}
          titulo="Mantenimiento"
          descripcion="Órdenes ejecutadas, ratio preventivo/correctivo, costos, duración y cumplimiento del cronograma."
          etiquetas={['1 hoja', 'Costos', 'Ratio prev/corr']}
          fechas={fechasMant} setFechas={setFechasMant}
          loadingExcel={loadings.mantExcel}
          onExcel={() => descargarReporte(
            `/reportes/mantenimiento/excel${params(fechasMant)}`,
            `reporte_mantenimiento_${dayjs().format('YYYYMMDD')}.xlsx`,
            v => setLoading('mantExcel', v)
          )}
        />

        <ReporteCard
          num="04" tone="plum" icon={<ShoppingCartOutlined />}
          titulo="Compras TI"
          descripcion="Solicitudes por estado, valor estimado vs ejecutado, proveedores, tiempos de aprobación y partidas presupuestales."
          etiquetas={['1 hoja', 'Presupuesto', 'Proveedores']}
          fechas={fechasCompras} setFechas={setFechasCompras}
          loadingExcel={loadings.comprasExcel}
          onExcel={() => descargarReporte(
            `/reportes/compras/excel${params(fechasCompras)}`,
            `reporte_compras_${dayjs().format('YYYYMMDD')}.xlsx`,
            v => setLoading('comprasExcel', v)
          )}
        />

        <ReporteCard
          num="05" tone="crit" icon={<DashboardOutlined />}
          titulo="Informe gerencial"
          descripcion="Informe ejecutivo consolidado con todos los módulos: tickets, inventario, mantenimiento y backup. Ideal para presentar a dirección."
          etiquetas={['Multi-hoja', 'PDF ejecutivo']}
          fechas={fechasGerencial} setFechas={setFechasGerencial}
          loadingExcel={loadings.gerencialExcel}
          loadingPDF={loadings.gerencialPDF}
          onExcel={() => descargarReporte(
            `/reportes/gerencial/excel${params(fechasGerencial)}`,
            `informe_gerencial_${dayjs().format('YYYYMMDD')}.xlsx`,
            v => setLoading('gerencialExcel', v)
          )}
          onPDF={() => descargarReporte(
            `/reportes/gerencial/pdf${params(fechasGerencial)}`,
            `informe_gerencial_${dayjs().format('YYYYMMDD')}.pdf`,
            v => setLoading('gerencialPDF', v)
          )}
        />

        {/* Tarjeta de info — estilo editorial diferente */}
        <div style={{
          background: 'var(--bg-tinted)',
          border: '1px dashed var(--acc-line)',
          borderRadius: 'var(--radius-md)',
          padding: '22px 24px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div className="qmono" style={{
            fontSize: 10, color: 'var(--acc-ink)', letterSpacing: '0.14em',
            marginBottom: 8,
          }}>NOTA · 06</div>
          <div style={{
            fontFamily: 'var(--f-display)', fontStyle: 'italic',
            fontSize: 22, color: 'var(--ink-1)', marginBottom: 14,
            letterSpacing: '-0.01em', lineHeight: 1.15,
          }}>Sobre los reportes</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileExcelOutlined style={{ color: 'var(--ok)', fontSize: 14 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>Excel (.xlsx)</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 0 0 22px', lineHeight: 1.55 }}>
              Múltiples hojas, cabeceras con branding, filas alternadas,
              filtros automáticos, anchos ajustados. Compatible con Excel 2016+.
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FilePdfOutlined style={{ color: 'var(--crit)', fontSize: 14 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>PDF ejecutivo</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 0 0 22px', lineHeight: 1.55 }}>
              Diseño A4 con header/footer institucional, KPIs visuales,
              tablas formateadas. Ideal para presentaciones a gerencia.
            </p>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{
            paddingTop: 12,
            borderTop: '1px solid var(--acc-line)',
            fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.55,
          }}>
            <DownloadOutlined style={{ color: 'var(--acc)', marginRight: 6 }} />
            Todos los reportes se generan con datos en tiempo real al momento de la descarga.
          </div>
        </div>
      </div>
    </div>
  )
}
