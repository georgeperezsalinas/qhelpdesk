// ─────────────────────────────────────────────────────────────────────
// src/modules/compras/ComprasPage.jsx
// Rediseño v2 — Compras TI
// Drop-in: mantiene compraService, flujo aprobar/rechazar/recibir,
// ítems dinámicos, drawer detalle con Steps, modal aprobar/rechazar.
// Requiere: qmodules.css y qhelpers.jsx cargados.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Drawer, Form, Input, Select, DatePicker, InputNumber,
  Tooltip, message, Modal, Alert, Table, Row, Col, Steps, Typography,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EyeOutlined, ExportOutlined,
  CheckOutlined, CloseOutlined, ShoppingCartOutlined,
  SearchOutlined, FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  compraService, ESTADOS_SOLICITUD, TIPOS_SOLICITUD,
  formatCurrency, getEstado, getTipo,
} from '../../services/compraService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import {
  QPageHeader, QKpiRow, QPill, QDrawerTitle,
} from '../../components/common/qhelpers'

const { Option } = Select
const { TextArea } = Input
const { Paragraph } = Typography

const ESTADO_TONE = {
  borrador:  'muted',
  enviada:   'info',
  aprobada:  'ok',
  rechazada: 'crit',
  en_proceso:'warn',
  recibida:  'ok',
  cancelada: 'muted',
}

const FLUJO_PASOS = [
  { title: 'Borrador',   estado: 'borrador'   },
  { title: 'Enviada',    estado: 'enviada'    },
  { title: 'Aprobada',   estado: 'aprobada'   },
  { title: 'En proceso', estado: 'en_proceso' },
  { title: 'Recibida',   estado: 'recibida'   },
]

function PasoActual({ estado }) {
  if (estado === 'rechazada') return <QPill tone="crit">Rechazada</QPill>
  if (estado === 'cancelada') return <QPill tone="muted">Cancelada</QPill>
  const idx = FLUJO_PASOS.findIndex(p => p.estado === estado)
  return (
    <Steps
      current={idx >= 0 ? idx : 0}
      size="small"
      items={FLUJO_PASOS.map(p => ({ title: p.title }))}
      style={{ marginBottom: 18 }}
    />
  )
}

const EstadoRenderer = ({ value }) => {
  const e = getEstado(value); if (!e) return value
  return <QPill tone={ESTADO_TONE[value] || 'muted'}>{e.label}</QPill>
}

// ── DRAWER DETALLE ────────────────────────────────────────────────────
function DrawerDetalle({ solicitud, onClose, onActualizar, esJefe }) {
  const [modalAprobar, setModalAprobar] = useState(false)
  const [modalRechazar, setModalRechazar] = useState(false)
  const [valorAprobado, setValorAprobado] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (solicitud) setValorAprobado(solicitud.valor_estimado)
  }, [solicitud])

  if (!solicitud) return null

  const puedeAprobar  = esJefe && solicitud.estado === 'enviada'
  const puedeRechazar = esJefe && ['enviada', 'aprobada'].includes(solicitud.estado)
  const puedeAvanzar  = esJefe && solicitud.estado === 'aprobada'

  const aprobar = async () => {
    setGuardando(true)
    try {
      await compraService.aprobar(solicitud.id, valorAprobado)
      message.success('Solicitud aprobada')
      setModalAprobar(false); onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
    finally { setGuardando(false) }
  }
  const rechazar = async () => {
    if (!motivoRechazo.trim()) { message.warning('Ingresa el motivo de rechazo'); return }
    setGuardando(true)
    try {
      await compraService.rechazar(solicitud.id, motivoRechazo)
      message.success('Solicitud rechazada')
      setModalRechazar(false); onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
    finally { setGuardando(false) }
  }
  const cambiarEstado = async (nuevoEstado) => {
    try {
      await compraService.actualizar(solicitud.id, { estado: nuevoEstado })
      message.success('Estado actualizado'); onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const columnasItems = [
    { title: 'Descripción', dataIndex: 'descripcion', key: 'd' },
    { title: 'Cant.', dataIndex: 'cantidad', width: 70, key: 'q',
      render: v => <span className="qmono">{v}</span> },
    { title: 'Unidad', dataIndex: 'unidad', width: 90, key: 'u' },
    { title: 'P. Unit.', dataIndex: 'precio_unitario', width: 110, key: 'p',
      render: v => <span className="qmono">{formatCurrency(v)}</span> },
    { title: 'Subtotal', dataIndex: 'subtotal', width: 110, key: 's',
      render: v => <span className="qmono" style={{ fontWeight: 600 }}>{formatCurrency(v)}</span> },
  ]

  return (
    <div>
      {/* Cabecera */}
      <div style={{ marginBottom: 18 }}>
        <Space size={8} style={{ marginBottom: 8 }}>
          <span className="qmono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>{solicitud.numero}</span>
          <QPill tone="muted">{getTipo(solicitud.tipo)}</QPill>
          <EstadoRenderer value={solicitud.estado} />
        </Space>
        <h2 style={{
          fontFamily: 'var(--f-display)', fontSize: 24, lineHeight: 1.2,
          margin: 0, color: 'var(--ink-1)', fontWeight: 400, letterSpacing: '-0.01em',
        }}>{solicitud.descripcion}</h2>
      </div>

      <PasoActual estado={solicitud.estado} />

      {/* Acciones */}
      {(puedeAprobar || puedeRechazar || puedeAvanzar) && (
        <Space wrap style={{ marginBottom: 18 }}>
          {puedeAprobar && (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => setModalAprobar(true)}>
              Aprobar
            </Button>
          )}
          {puedeAvanzar && (
            <Button icon={<ShoppingCartOutlined />} onClick={() => cambiarEstado('en_proceso')}>
              Marcar en proceso
            </Button>
          )}
          {solicitud.estado === 'en_proceso' && (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => cambiarEstado('recibida')}>
              Marcar como recibida
            </Button>
          )}
          {puedeRechazar && (
            <Button danger icon={<CloseOutlined />} onClick={() => setModalRechazar(true)}>
              Rechazar
            </Button>
          )}
        </Space>
      )}

      {solicitud.estado === 'rechazada' && solicitud.motivo_rechazo && (
        <Alert className="qalert" type="error" showIcon
          message="Motivo de rechazo" description={solicitud.motivo_rechazo} />
      )}

      {/* Meta grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
        background: 'var(--line-2)', border: '1px solid var(--line-1)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 18,
      }}>
        {[
          { k: 'Solicitante', v: solicitud.solicitante
              ? <><div style={{ fontWeight: 500 }}>{solicitud.solicitante.nombre} {solicitud.solicitante.apellido}</div>
                  <span className="qmono qmuted" style={{ fontSize: 10.5 }}>@{solicitud.solicitante.username}</span></>
              : '—' },
          { k: 'Aprobador', v: solicitud.aprobador
              ? <><div style={{ fontWeight: 500 }}>{solicitud.aprobador.nombre} {solicitud.aprobador.apellido}</div>
                  <span className="qmono qmuted" style={{ fontSize: 10.5 }}>{solicitud.fecha_aprobacion ? dayjs(solicitud.fecha_aprobacion).format('DD/MM/YY') : ''}</span></>
              : <span className="qmuted">Pendiente</span> },
          { k: 'Fecha necesidad', v: <span className="qmono">{solicitud.fecha_necesidad ? dayjs(solicitud.fecha_necesidad).format('DD/MM/YYYY') : '—'}</span> },
          { k: 'Valor estimado', v: <span className="qmono">{formatCurrency(solicitud.valor_estimado)}</span> },
          { k: 'Valor aprobado',
            v: <span className="qmono" style={{
              color: solicitud.valor_aprobado ? 'var(--ok)' : 'var(--ink-3)',
              fontWeight: solicitud.valor_aprobado ? 600 : 400,
            }}>{formatCurrency(solicitud.valor_aprobado)}</span> },
          { k: 'Partida presupuestal',
            v: solicitud.presupuesto_codigo
              ? <span className="qmono">{solicitud.presupuesto_codigo}</span>
              : <span className="qmuted">—</span> },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', padding: '12px 14px' }}>
            <div style={{
              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6,
            }}>{m.k}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-1)' }}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* Proveedor + OC */}
      {(solicitud.proveedor || solicitud.orden_compra_numero) && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--line-1)',
          borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 16,
        }}>
          <Row gutter={16}>
            {solicitud.proveedor && (
              <Col span={12}>
                <div style={{
                  fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4,
                }}>Proveedor</div>
                <div style={{ fontWeight: 500 }}>{solicitud.proveedor.razon_social}</div>
                <div className="qmono qmuted" style={{ fontSize: 11 }}>RUC: {solicitud.proveedor.ruc}</div>
              </Col>
            )}
            {solicitud.orden_compra_numero && (
              <Col span={12}>
                <div style={{
                  fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4,
                }}>Orden de compra</div>
                <div className="qmono" style={{ fontWeight: 500 }}>{solicitud.orden_compra_numero}</div>
              </Col>
            )}
          </Row>
        </div>
      )}

      {/* Justificación / especificaciones */}
      {solicitud.justificacion && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--line-1)',
          borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 14,
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8,
          }}>Justificación</div>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12.5, color: 'var(--ink-2)' }}>
            {solicitud.justificacion}
          </Paragraph>
        </div>
      )}
      {solicitud.especificaciones && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--line-1)',
          borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 14,
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8,
          }}>Especificaciones técnicas</div>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12.5, color: 'var(--ink-2)' }}>
            {solicitud.especificaciones}
          </Paragraph>
        </div>
      )}

      {/* Ítems */}
      {solicitud.items?.length > 0 && (
        <>
          <div className="qsec-h">
            <div className="qsec-l"><span className="qsec-num">01</span><em>Detalle de ítems</em></div>
            <div className="qsec-r"><span className="qmuted">{solicitud.items.length} líneas</span></div>
          </div>
          <Table dataSource={solicitud.items} columns={columnasItems}
            rowKey="id" size="small" pagination={false}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={4} align="right">
                  <span style={{ fontWeight: 600 }}>Total estimado:</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <span className="qmono" style={{ fontWeight: 700, color: 'var(--acc)' }}>
                    {formatCurrency(solicitud.items.reduce((acc, i) => acc + (i.subtotal || 0), 0))}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </>
      )}

      {/* Modal aprobar */}
      <Modal title={<QDrawerTitle icon={<CheckOutlined />}>Aprobar solicitud</QDrawerTitle>}
        open={modalAprobar} onCancel={() => setModalAprobar(false)}
        onOk={aprobar} okText="Confirmar aprobación" confirmLoading={guardando}>
        <Alert className="qalert" type="info" showIcon
          message={`Solicitud: ${solicitud.numero}`} description={solicitud.descripcion} />
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Valor aprobado (S/)">
            <InputNumber value={valorAprobado} onChange={setValorAprobado}
              min={0} style={{ width: '100%' }} prefix="S/" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal rechazar */}
      <Modal title={<QDrawerTitle icon={<CloseOutlined />}>Rechazar solicitud</QDrawerTitle>}
        open={modalRechazar} onCancel={() => setModalRechazar(false)}
        onOk={rechazar} okText="Confirmar rechazo"
        okButtonProps={{ danger: true }} confirmLoading={guardando}>
        <Alert className="qalert" type="warning" showIcon
          message="Esta acción notificará al solicitante." />
        <Form layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Motivo del rechazo" required>
            <TextArea value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}
              rows={3} placeholder="Explica el motivo del rechazo…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────
export default function ComprasPage() {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [selected, setSelected] = useState(null)
  const [drawerDetalle, setDrawerDetalle] = useState(false)
  const [drawerNuevo, setDrawerNuevo] = useState(false)
  const [items, setItems] = useState([{ key: 0, descripcion: '', cantidad: 1, unidad: 'unidad', precio_unitario: null }])
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: sols }, { data: dash }] = await Promise.all([
        compraService.listar({ limit: 500 }),
        compraService.dashboard(),
      ])
      setSolicitudes(sols); setStats(dash)
    } catch { message.error('Error al cargar solicitudes') }
    finally  { setLoading(false) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const verDetalle = (s) => { setSelected(s); setDrawerDetalle(true) }
  const onActualizar = async () => {
    cargar()
    if (selected) {
      const { data } = await compraService.obtener(selected.id)
      setSelected(data)
    }
  }
  const crearSolicitud = async (values) => {
    try {
      const payload = {
        ...values,
        fecha_necesidad: values.fecha_necesidad?.format('YYYY-MM-DD') || null,
        items: items.filter(i => i.descripcion.trim()).map(i => ({
          descripcion: i.descripcion, cantidad: i.cantidad || 1,
          unidad: i.unidad, precio_unitario: i.precio_unitario,
        })),
      }
      await compraService.crear(payload)
      message.success('Solicitud creada correctamente')
      setDrawerNuevo(false); form.resetFields()
      setItems([{ key: 0, descripcion: '', cantidad: 1, unidad: 'unidad', precio_unitario: null }])
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }
  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `compras_${dayjs().format('YYYYMMDD')}.csv`,
  })

  const columnDefs = useMemo(() => [
    { headerName: '', width: 38, checkboxSelection: true, headerCheckboxSelection: true,
      pinned: 'left', suppressMenu: true, sortable: false, filter: false },
    { headerName: 'N°', field: 'numero', width: 150, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <a onClick={() => verDetalle(data)} className="qmono"
           style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{value}</a>
      )},
    { headerName: 'Tipo', field: 'tipo', width: 130, filter: 'agSetColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => <QPill tone="muted">{getTipo(value)}</QPill>,
      filterParams: { values: TIPOS_SOLICITUD.map(t => t.value) } },
    { headerName: 'Descripción', field: 'descripcion', minWidth: 260, filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => (
        <Tooltip title={value}>
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', display: 'block',
            fontWeight: 500, color: 'var(--ink-1)',
          }}>{value}</span>
        </Tooltip>
      )},
    { headerName: 'Estado', field: 'estado', width: 130,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: { values: ESTADOS_SOLICITUD.map(e => e.value) } },
    { headerName: 'Solicitante', field: 'solicitante', minWidth: 160, filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.solicitante
        ? `${p.data.solicitante.nombre} ${p.data.solicitante.apellido}` : '—' },
    { headerName: 'Proveedor', field: 'proveedor', minWidth: 180, filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.proveedor?.razon_social || '—',
      cellRenderer: ({ value }) => value === '—'
        ? <span className="qmuted">—</span>
        : <span style={{ fontSize: 12 }}>{value}</span> },
    { headerName: 'V. Estimado', field: 'valor_estimado', width: 130, filter: 'agNumberColumnFilter',
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontSize: 11.5 }}>{formatCurrency(value)}</span> },
    { headerName: 'V. Aprobado', field: 'valor_aprobado', width: 130, filter: 'agNumberColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11.5, color: 'var(--ok)', fontWeight: 600 }}>{formatCurrency(value)}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'F. Necesidad', field: 'fecha_necesidad', width: 130, filter: 'agDateColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11.5 }}>{dayjs(value).format('DD/MM/YY')}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Creado', field: 'creado_en', width: 130, filter: 'agDateColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span className="qmono qmuted" style={{ fontSize: 11 }}>{dayjs(value).format('DD/MM/YY')}</span>
        : <span className="qmuted">—</span>,
      sort: 'desc' },
    { headerName: '', width: 70, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Ver detalle">
          <Button size="small" icon={<EyeOutlined />} type="text"
            style={{ color: 'var(--ink-2)' }} onClick={() => verDetalle(data)} />
        </Tooltip>
      )},
  ], [])

  const getRowStyle = ({ data }) => {
    if (data?.estado === 'enviada')   return { background: 'rgba(30,58,138,0.04)' }
    if (data?.estado === 'rechazada') return { background: 'rgba(168,32,26,0.05)' }
    return {}
  }

  const totalItems = items.reduce((acc, i) =>
    acc + ((i.cantidad || 0) * (i.precio_unitario || 0)), 0)

  return (
    <div>
      <QPageHeader
        eyebrow="Administración · compras TI"
        title="Solicitudes de"
        titleEm="compra"
        subtitle={`${stats.total ?? 0} solicitudes en el sistema · ${stats.enviadas ?? 0} esperando aprobación · valor aprobado ${formatCurrency(stats.valor_total_aprobado)}`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading}>Actualizar</Button>
            <Button icon={<ExportOutlined />} onClick={exportar}>CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerNuevo(true)}>
              Nueva solicitud
            </Button>
          </Space>
        }
      />

      {stats.enviadas > 0 && (
        <Alert className="qalert" type="warning" showIcon
          message={`${stats.enviadas} solicitud(es) esperando aprobación`} />
      )}

      <QKpiRow items={[
        { lbl: 'Total',          val: stats.total ?? 0 },
        { lbl: 'Borradores',     val: stats.borradores ?? 0,           tone: 'muted' },
        { lbl: 'Enviadas',       val: stats.enviadas ?? 0,             tone: 'info' },
        { lbl: 'Aprobadas',      val: stats.aprobadas ?? 0,            tone: 'ok' },
        { lbl: 'En proceso',     val: stats.en_proceso ?? 0,           tone: 'warn' },
        { lbl: 'Recibidas',      val: stats.recibidas ?? 0,            tone: 'info' },
        { lbl: 'Val. aprobado',  val: formatCurrency(stats.valor_total_aprobado), tone: 'ok' },
        { lbl: 'Val. recibido',  val: formatCurrency(stats.valor_total_recibido), tone: 'info' },
      ]} />

      <div className="qtoolbar">
        <div className="qinput-wrap">
          <SearchOutlined />
          <input className="qinput" placeholder="Buscar en todos los campos…"
            onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)} />
        </div>
        <span style={{ marginLeft: 'auto' }} className="qmuted qmono">{solicitudes.length} solicitudes</span>
      </div>

      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef} rowData={solicitudes} columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={40} headerHeight={36}
          getRowId={p => String(p.data.id)}
          getRowStyle={getRowStyle}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* DRAWER DETALLE */}
      <Drawer
        title={selected
          ? <QDrawerTitle icon={<ShoppingCartOutlined />}>{selected.numero}</QDrawerTitle>
          : 'Detalle'}
        open={drawerDetalle} onClose={() => setDrawerDetalle(false)} width={720}
        styles={{
          body: { padding: '22px 28px', background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <DrawerDetalle solicitud={selected} onClose={() => setDrawerDetalle(false)}
          onActualizar={onActualizar} esJefe={esJefe} />
      </Drawer>

      {/* DRAWER NUEVA SOLICITUD */}
      <Drawer
        title={<QDrawerTitle icon={<PlusOutlined />}>Nueva solicitud de compra</QDrawerTitle>}
        open={drawerNuevo}
        onClose={() => { setDrawerNuevo(false); form.resetFields() }}
        width={640}
        styles={{
          body: { padding: 0, background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={crearSolicitud}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="qform-section-h"><FileTextOutlined /> Información general</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="tipo" label="Tipo de solicitud" rules={[{ required: true }]}>
                    <Select>{TIPOS_SOLICITUD.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}</Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fecha_necesidad" label="Fecha de necesidad">
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
                <Input placeholder="Resumen de lo que se solicita comprar…" />
              </Form.Item>
              <Form.Item name="justificacion" label="Justificación">
                <TextArea rows={2} placeholder="¿Por qué se necesita esta compra?" />
              </Form.Item>
              <Form.Item name="especificaciones" label="Especificaciones técnicas">
                <TextArea rows={2} placeholder="Marca, modelo, capacidad, versión, etc." />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="valor_estimado" label="Valor estimado (S/)">
                    <InputNumber min={0} style={{ width: '100%' }} prefix="S/" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="presupuesto_codigo" label="Partida presupuestal">
                    <Input placeholder="2.6.7.001" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="qform-section-h">Detalle de ítems</div>
            <div className="qform-section-b">
              {items.map((item, idx) => (
                <Row key={item.key} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={9}>
                    <Input placeholder="Descripción del ítem" value={item.descripcion}
                      onChange={e => { const c = [...items]; c[idx].descripcion = e.target.value; setItems(c) }} />
                  </Col>
                  <Col span={3}>
                    <InputNumber min={1} value={item.cantidad} style={{ width: '100%' }} placeholder="Cant."
                      onChange={v => { const c = [...items]; c[idx].cantidad = v; setItems(c) }} />
                  </Col>
                  <Col span={4}>
                    <Input placeholder="Unidad" value={item.unidad}
                      onChange={e => { const c = [...items]; c[idx].unidad = e.target.value; setItems(c) }} />
                  </Col>
                  <Col span={5}>
                    <InputNumber min={0} value={item.precio_unitario} style={{ width: '100%' }} placeholder="P. unit."
                      onChange={v => { const c = [...items]; c[idx].precio_unitario = v; setItems(c) }} />
                  </Col>
                  <Col span={3}>
                    <Button danger type="text"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      disabled={items.length === 1}>✕</Button>
                  </Col>
                </Row>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 4 }}
                onClick={() => setItems([...items, {
                  key: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', precio_unitario: null,
                }])}>
                Agregar ítem
              </Button>
              {totalItems > 0 && (
                <div style={{
                  textAlign: 'right', marginTop: 12,
                  padding: '10px 12px', background: 'var(--bg-tinted)',
                  border: '1px solid var(--line-1)', borderRadius: 'var(--radius-sm)',
                }}>
                  <span className="qmuted" style={{ fontSize: 11, marginRight: 8 }}>Total estimado</span>
                  <span className="qmono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--acc)' }}>
                    {formatCurrency(totalItems)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="qform-footer">
            <Button onClick={() => { setDrawerNuevo(false); form.resetFields() }}>Cancelar</Button>
            <Button type="primary" htmlType="submit">Crear solicitud</Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}
