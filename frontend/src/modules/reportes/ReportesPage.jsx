import { useState } from 'react'
import {
  Card, Row, Col, Button, Typography, Space, DatePicker,
  Tag, Divider, Alert, Spin, message, Badge,
} from 'antd'
import {
  FileExcelOutlined, FilePdfOutlined, DownloadOutlined,
  BarChartOutlined, FileTextOutlined, ToolOutlined,
  ShoppingCartOutlined, TeamOutlined, DashboardOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const { Title, Text, Paragraph } = Typography
const { RangePicker } = DatePicker

// ── Descargar archivo del backend ─────────────────────────────────────────────
async function descargarReporte(url, filename, setLoading) {
  setLoading(true)
  try {
    const resp = await api.get(url, { responseType: 'blob' })
    const href = window.URL.createObjectURL(new Blob([resp.data]))
    const a    = document.createElement('a')
    a.href     = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(href)
    message.success(`Reporte descargado: ${filename}`)
  } catch {
    message.error('Error al generar el reporte')
  } finally {
    setLoading(false)
  }
}

// ── Tarjeta de reporte ────────────────────────────────────────────────────────
function ReporteCard({
  icon, titulo, descripcion, campos, color,
  onExcel, onPDF, loadingExcel, loadingPDF,
  requiereFecha = true, fechas, setFechas,
}) {
  return (
    <Card
      style={{ height: '100%', borderTop: `3px solid ${color}` }}
      styles={{ body: { padding: '20px 20px 16px' } }}
    >
      <Space style={{ marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{titulo}</div>
          <Tag color="default" style={{ fontSize: 10, marginTop: 2 }}>
            {campos}
          </Tag>
        </div>
      </Space>

      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        {descripcion}
      </Paragraph>

      {requiereFecha && (
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
            Período:
          </Text>
          <RangePicker
            size="small"
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={fechas}
            onChange={setFechas}
            presets={[
              { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] },
              { label: 'Mes anterior', value: [dayjs().subtract(1,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
              { label: 'Últimos 3 meses', value: [dayjs().subtract(3,'month'), dayjs()] },
              { label: 'Este año', value: [dayjs().startOf('year'), dayjs()] },
            ]}
          />
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />

      <Space wrap>
        {onExcel && (
          <Button
            icon={<FileExcelOutlined />}
            loading={loadingExcel}
            onClick={onExcel}
            style={{ color: '#1E7E34', borderColor: '#1E7E34' }}
          >
            Excel
          </Button>
        )}
        {onPDF && (
          <Button
            icon={<FilePdfOutlined />}
            loading={loadingPDF}
            onClick={onPDF}
            danger
          >
            PDF
          </Button>
        )}
      </Space>
    </Card>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function ReportesPage() {
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  // Fechas por reporte
  const [fechasTickets,  setFechasTickets]  = useState([dayjs().startOf('month'), dayjs()])
  const [fechasMant,     setFechasMant]     = useState([dayjs().startOf('month'), dayjs()])
  const [fechasCompras,  setFechasCompras]  = useState([dayjs().startOf('month'), dayjs()])
  const [fechasGerencial,setFechasGerencial]= useState([dayjs().startOf('month'), dayjs()])

  // Loading por reporte
  const [loadings, setLoadings] = useState({})

  const setLoading = (key, val) => setLoadings(p => ({ ...p, [key]: val }))

  const params = (fechas) => {
    if (!fechas || !fechas[0] || !fechas[1]) return ''
    return `?fecha_desde=${fechas[0].format('YYYY-MM-DD')}&fecha_hasta=${fechas[1].format('YYYY-MM-DD')}`
  }

  if (!esJefe) {
    return (
      <Alert type="warning" showIcon
        message="Acceso restringido"
        description="Solo el jefe de área y especialistas pueden generar reportes." />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: '#1B3A6B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DownloadOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Title level={4} style={{ margin: 0 }}>Reportes y exportaciones</Title>
          <Text type="secondary">Reportes ERP nivel empresarial · Excel y PDF</Text>
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
        message="Los reportes se generan en tiempo real con los datos actuales del sistema."
        description="Excel incluye múltiples hojas con datos detallados y formato ERP. PDF incluye dashboard ejecutivo con KPIs para presentar a gerencia."
      />

      <Row gutter={[16, 16]}>
        {/* Reporte de Tickets */}
        <Col xs={24} md={12} lg={8}>
          <ReporteCard
            icon={<BarChartOutlined />}
            titulo="Gestión de Tickets y SLA"
            descripcion="Resumen ejecutivo con KPIs, distribución por prioridad, categoría y técnico. Detalle completo con SLA y NPS."
            campos="2 hojas · SLA · NPS · Técnicos"
            color="#1B3A6B"
            fechas={fechasTickets}
            setFechas={setFechasTickets}
            loadingExcel={loadings.ticketsExcel}
            onExcel={() => descargarReporte(
              `/reportes/tickets/excel${params(fechasTickets)}`,
              `reporte_tickets_${dayjs().format('YYYYMMDD')}.xlsx`,
              v => setLoading('ticketsExcel', v)
            )}
          />
        </Col>

        {/* Reporte de Inventario */}
        <Col xs={24} md={12} lg={8}>
          <ReporteCard
            icon={<SafetyOutlined />}
            titulo="Inventario TI y Activos"
            descripcion="Estado del inventario, depreciación por equipo, valor actual vs valor de compra. Licencias por vencer."
            campos="2 hojas · Depreciación · Licencias"
            color="#0f6e56"
            requiereFecha={false}
            loadingExcel={loadings.inventarioExcel}
            onExcel={() => descargarReporte(
              '/reportes/inventario/excel',
              `reporte_inventario_${dayjs().format('YYYYMMDD')}.xlsx`,
              v => setLoading('inventarioExcel', v)
            )}
          />
        </Col>

        {/* Reporte de Mantenimiento */}
        <Col xs={24} md={12} lg={8}>
          <ReporteCard
            icon={<ToolOutlined />}
            titulo="Mantenimiento Preventivo y Correctivo"
            descripcion="Órdenes ejecutadas, ratio preventivo/correctivo, costos, duración y cumplimiento del cronograma."
            campos="1 hoja · Costos · Ratio prev/corr"
            color="#fa8c16"
            fechas={fechasMant}
            setFechas={setFechasMant}
            loadingExcel={loadings.mantExcel}
            onExcel={() => descargarReporte(
              `/reportes/mantenimiento/excel${params(fechasMant)}`,
              `reporte_mantenimiento_${dayjs().format('YYYYMMDD')}.xlsx`,
              v => setLoading('mantExcel', v)
            )}
          />
        </Col>

        {/* Reporte de Compras */}
        <Col xs={24} md={12} lg={8}>
          <ReporteCard
            icon={<ShoppingCartOutlined />}
            titulo="Compras TI"
            descripcion="Solicitudes por estado, valor estimado vs ejecutado, proveedores, tiempos de aprobación y partidas presupuestales."
            campos="1 hoja · Presupuesto · Proveedores"
            color="#722ed1"
            fechas={fechasCompras}
            setFechas={setFechasCompras}
            loadingExcel={loadings.comprasExcel}
            onExcel={() => descargarReporte(
              `/reportes/compras/excel${params(fechasCompras)}`,
              `reporte_compras_${dayjs().format('YYYYMMDD')}.xlsx`,
              v => setLoading('comprasExcel', v)
            )}
          />
        </Col>

        {/* Informe Gerencial */}
        <Col xs={24} md={12} lg={8}>
          <ReporteCard
            icon={<DashboardOutlined />}
            titulo="Informe Gerencial Consolidado"
            descripcion="Informe ejecutivo con todos los módulos: tickets, inventario, mantenimiento y backup. Ideal para presentar a dirección."
            campos="Excel multi-hoja · PDF ejecutivo"
            color="#cf1322"
            fechas={fechasGerencial}
            setFechas={setFechasGerencial}
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
        </Col>

        {/* Info sobre formatos */}
        <Col xs={24} md={12} lg={8}>
          <Card style={{ height: '100%', background: '#f6f9ff', border: '1px dashed #2F7FD1' }}
                styles={{ body: { padding: '20px' } }}>
            <Title level={5} style={{ color: '#1B3A6B', marginBottom: 16 }}>
              📋 Sobre los reportes
            </Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <FileExcelOutlined style={{ color: '#1E7E34', marginRight: 8 }} />
                <Text strong style={{ fontSize: 12 }}>Excel (.xlsx)</Text>
                <Paragraph type="secondary" style={{ fontSize: 11, margin: '4px 0 0 24px' }}>
                  Múltiples hojas, cabeceras con branding institucional, filas alternadas,
                  filtros automáticos, anchos ajustados. Compatible con Excel 2016+.
                </Paragraph>
              </div>
              <div>
                <FilePdfOutlined style={{ color: '#cf1322', marginRight: 8 }} />
                <Text strong style={{ fontSize: 12 }}>PDF ejecutivo</Text>
                <Paragraph type="secondary" style={{ fontSize: 11, margin: '4px 0 0 24px' }}>
                  Diseño A4 con header/footer institucional, KPIs visuales,
                  tablas formateadas. Ideal para presentaciones a gerencia.
                </Paragraph>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Todos los reportes se generan con datos en tiempo real al momento de la descarga.
                Los rangos de fecha se aplican según la fecha de creación del registro.
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
