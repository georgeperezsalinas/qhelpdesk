import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Badge, Card, Statistic, Row, Col,
  Drawer, Form, Input, Select, DatePicker, InputNumber,
  Tooltip, Typography, message, Divider, Modal,
  Alert, Table, Popconfirm, Steps,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EyeOutlined, ExportOutlined,
  CheckOutlined, CloseOutlined, SendOutlined, ShoppingCartOutlined,
  FileTextOutlined, DollarOutlined, SearchOutlined,
} from '@ant-design/icons'
import KpiStrip from '../../components/common/KpiStrip'
import dayjs from 'dayjs'
import {
  compraService, ESTADOS_SOLICITUD, TIPOS_SOLICITUD,
  formatCurrency, getEstado, getTipo,
} from '../../services/compraService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

// ── FLUJO DE ESTADOS ──────────────────────────────────────────────────────────
const FLUJO_PASOS = [
  { title: 'Borrador',    estado: 'borrador'      },
  { title: 'Enviada',     estado: 'enviada'       },
  { title: 'Aprobada',    estado: 'aprobada'      },
  { title: 'En proceso',  estado: 'en_proceso'    },
  { title: 'Recibida',    estado: 'recibida'      },
]

function PasoActual({ estado }) {
  const idx = FLUJO_PASOS.findIndex(p => p.estado === estado)
  if (estado === 'rechazada') return <Tag color="red">Rechazada</Tag>
  if (estado === 'cancelada') return <Tag color="default">Cancelada</Tag>
  return (
    <Steps
      current={idx >= 0 ? idx : 0}
      size="small"
      items={FLUJO_PASOS.map(p => ({ title: p.title }))}
      style={{ marginBottom: 16 }}
    />
  )
}

// ── CELL RENDERERS ─────────────────────────────────────────────────────────────
const EstadoRenderer = ({ value }) => {
  const e = getEstado(value)
  return e ? <Badge status={e.color} text={e.label} /> : value
}

// ── DRAWER DETALLE ────────────────────────────────────────────────────────────
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

  const e = getEstado(solicitud.estado)
  const puedeAprobar  = esJefe && solicitud.estado === 'enviada'
  const puedeRechazar = esJefe && ['enviada', 'aprobada'].includes(solicitud.estado)
  const puedeAvanzar  = esJefe && ['aprobada'].includes(solicitud.estado)

  const aprobar = async () => {
    setGuardando(true)
    try {
      await compraService.aprobar(solicitud.id, valorAprobado)
      message.success('Solicitud aprobada')
      setModalAprobar(false)
      onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
    finally { setGuardando(false) }
  }

  const rechazar = async () => {
    if (!motivoRechazo.trim()) { message.warning('Ingresa el motivo de rechazo'); return }
    setGuardando(true)
    try {
      await compraService.rechazar(solicitud.id, motivoRechazo)
      message.success('Solicitud rechazada')
      setModalRechazar(false)
      onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
    finally { setGuardando(false) }
  }

  const cambiarEstado = async (nuevoEstado) => {
    try {
      await compraService.actualizar(solicitud.id, { estado: nuevoEstado })
      message.success('Estado actualizado')
      onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const columnasItems = [
    { title: 'Descripción', dataIndex: 'descripcion', key: 'desc' },
    { title: 'Cant.', dataIndex: 'cantidad', width: 70, key: 'qty' },
    { title: 'Unidad', dataIndex: 'unidad', width: 90, key: 'unit' },
    { title: 'P. Unitario', dataIndex: 'precio_unitario', width: 110, key: 'precio',
      render: v => formatCurrency(v) },
    { title: 'Subtotal', dataIndex: 'subtotal', width: 110, key: 'sub',
      render: v => <Text strong>{formatCurrency(v)}</Text> },
  ]

  return (
    <div>
      {/* Cabecera */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text code style={{ fontSize: 12 }}>{solicitud.numero}</Text>
          <Tag>{getTipo(solicitud.tipo)}</Tag>
          <Badge status={e?.color} text={e?.label} />
        </Space>
        <Title level={5} style={{ margin: '8px 0' }}>{solicitud.descripcion}</Title>
      </div>

      {/* Flujo de estados */}
      <PasoActual estado={solicitud.estado} />

      {/* Acciones */}
      {(puedeAprobar || puedeRechazar || puedeAvanzar) && (
        <Space wrap style={{ marginBottom: 16 }}>
          {puedeAprobar && (
            <Button type="primary" icon={<CheckOutlined />}
              onClick={() => setModalAprobar(true)}>
              Aprobar
            </Button>
          )}
          {puedeAvanzar && (
            <Button icon={<ShoppingCartOutlined />}
              onClick={() => cambiarEstado('en_proceso')}>
              Marcar en proceso
            </Button>
          )}
          {solicitud.estado === 'en_proceso' && (
            <Button type="primary" icon={<CheckOutlined />}
              onClick={() => cambiarEstado('recibida')}>
              Marcar como recibida
            </Button>
          )}
          {puedeRechazar && (
            <Button danger icon={<CloseOutlined />}
              onClick={() => setModalRechazar(true)}>
              Rechazar
            </Button>
          )}
        </Space>
      )}

      {/* Alerta si rechazada */}
      {solicitud.estado === 'rechazada' && solicitud.motivo_rechazo && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }}
          message="Motivo de rechazo"
          description={solicitud.motivo_rechazo} />
      )}

      {/* Info general */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="Solicitante">
            <Text strong>{solicitud.solicitante?.nombre} {solicitud.solicitante?.apellido}</Text>
            <br /><Text type="secondary" style={{ fontSize: 12 }}>{solicitud.solicitante?.username}</Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Aprobador">
            {solicitud.aprobador
              ? <><Text strong>{solicitud.aprobador?.nombre} {solicitud.aprobador?.apellido}</Text>
                  <br /><Text type="secondary" style={{ fontSize: 12 }}>
                    {solicitud.fecha_aprobacion ? dayjs(solicitud.fecha_aprobacion).format('DD/MM/YYYY') : ''}
                  </Text></>
              : <Text type="secondary">Pendiente</Text>
            }
          </Card>
        </Col>
      </Row>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Valor estimado" value={formatCurrency(solicitud.valor_estimado)}
              valueStyle={{ fontSize: 14 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Valor aprobado"
              value={formatCurrency(solicitud.valor_aprobado)}
              valueStyle={{ fontSize: 14, color: solicitud.valor_aprobado ? '#52c41a' : undefined }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Fecha necesidad"
              value={solicitud.fecha_necesidad ? dayjs(solicitud.fecha_necesidad).format('DD/MM/YYYY') : '—'}
              valueStyle={{ fontSize: 14 }} />
          </Card>
        </Col>
      </Row>

      {/* Proveedor y OC */}
      {(solicitud.proveedor || solicitud.orden_compra_numero || solicitud.presupuesto_codigo) && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            {solicitud.proveedor && (
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 11 }}>Proveedor</Text>
                <div style={{ fontWeight: 500 }}>{solicitud.proveedor.razon_social}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>RUC: {solicitud.proveedor.ruc}</Text>
              </Col>
            )}
            {solicitud.orden_compra_numero && (
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 11 }}>Orden de compra</Text>
                <div style={{ fontWeight: 500 }}>{solicitud.orden_compra_numero}</div>
              </Col>
            )}
            {solicitud.presupuesto_codigo && (
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 11 }}>Partida presupuestal</Text>
                <div><Text code>{solicitud.presupuesto_codigo}</Text></div>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Justificación y especificaciones */}
      {solicitud.justificacion && (
        <Card size="small" title="Justificación" style={{ marginBottom: 12 }}>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{solicitud.justificacion}</Paragraph>
        </Card>
      )}
      {solicitud.especificaciones && (
        <Card size="small" title="Especificaciones técnicas" style={{ marginBottom: 12 }}>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{solicitud.especificaciones}</Paragraph>
        </Card>
      )}

      {/* Ítems */}
      {solicitud.items?.length > 0 && (
        <>
          <Divider>Detalle de ítems</Divider>
          <Table
            dataSource={solicitud.items} columns={columnasItems}
            rowKey="id" size="small" pagination={false}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={4} align="right">
                  <Text strong>Total estimado:</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Text strong style={{ color: '#1677ff' }}>
                    {formatCurrency(solicitud.items.reduce((acc, i) => acc + (i.subtotal || 0), 0))}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </>
      )}

      {/* Modal aprobar */}
      <Modal title="Aprobar solicitud" open={modalAprobar}
        onCancel={() => setModalAprobar(false)}
        onOk={aprobar} okText="Confirmar aprobación"
        confirmLoading={guardando}
      >
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          message={`Solicitud: ${solicitud.numero}`}
          description={solicitud.descripcion} />
        <Form layout="vertical">
          <Form.Item label="Valor aprobado (S/)">
            <InputNumber
              value={valorAprobado}
              onChange={setValorAprobado}
              min={0} style={{ width: '100%' }}
              prefix="S/"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal rechazar */}
      <Modal title="Rechazar solicitud" open={modalRechazar}
        onCancel={() => setModalRechazar(false)}
        onOk={rechazar} okText="Confirmar rechazo"
        okButtonProps={{ danger: true }}
        confirmLoading={guardando}
      >
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="Esta acción notificará al solicitante." />
        <Form layout="vertical">
          <Form.Item label="Motivo del rechazo" required>
            <TextArea
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              rows={3} placeholder="Explica el motivo del rechazo..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function ComprasPage() {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [solicitudes, setSolicitudes] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [stats,       setStats]       = useState({})
  const [selected,    setSelected]    = useState(null)
  const [drawerDetalle, setDrawerDetalle] = useState(false)
  const [drawerNuevo,   setDrawerNuevo]   = useState(false)
  const [items,         setItems]         = useState([{ key: 0, descripcion: '', cantidad: 1, unidad: 'unidad', precio_unitario: null }])
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: sols }, { data: dash }] = await Promise.all([
        compraService.listar({ limit: 500 }),
        compraService.dashboard(),
      ])
      setSolicitudes(sols)
      setStats(dash)
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
          descripcion: i.descripcion,
          cantidad: i.cantidad || 1,
          unidad: i.unidad,
          precio_unitario: i.precio_unitario,
        })),
      }
      await compraService.crear(payload)
      message.success('Solicitud creada correctamente')
      setDrawerNuevo(false)
      form.resetFields()
      setItems([{ key: 0, descripcion: '', cantidad: 1, unidad: 'unidad', precio_unitario: null }])
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `compras_${dayjs().format('YYYYMMDD')}.csv`,
  })

  const columnDefs = useMemo(() => [
    { headerName: '', width: 44, checkboxSelection: true,
      headerCheckboxSelection: true, pinned: 'left',
      suppressMenu: true, sortable: false, filter: false },
    { headerName: 'N°', field: 'numero', width: 140, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <a onClick={() => verDetalle(data)} style={{ fontFamily: 'monospace', fontSize: 12 }}>{value}</a>
      )},
    { headerName: 'Tipo', field: 'tipo', width: 130,
      filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => <Tag>{getTipo(value)}</Tag>,
      filterParams: { values: TIPOS_SOLICITUD.map(t => t.value) } },
    { headerName: 'Descripción', field: 'descripcion', minWidth: 250,
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => (
        <Tooltip title={value}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', display: 'block' }}>{value}</span>
        </Tooltip>
      )},
    { headerName: 'Estado', field: 'estado', width: 140,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      filterParams: { values: ESTADOS_SOLICITUD.map(e => e.value) } },
    { headerName: 'Solicitante', field: 'solicitante', minWidth: 160,
      filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.solicitante
        ? `${p.data.solicitante.nombre} ${p.data.solicitante.apellido}` : '—' },
    { headerName: 'Proveedor', field: 'proveedor', minWidth: 180,
      filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.proveedor?.razon_social || '—' },
    { headerName: 'Valor estimado', field: 'valor_estimado', width: 140,
      filter: 'agNumberColumnFilter',
      valueFormatter: p => formatCurrency(p.value) },
    { headerName: 'Valor aprobado', field: 'valor_aprobado', width: 140,
      filter: 'agNumberColumnFilter',
      valueFormatter: p => formatCurrency(p.value) },
    { headerName: 'F. Necesidad', field: 'fecha_necesidad', width: 130,
      filter: 'agDateColumnFilter',
      valueFormatter: p => p.value ? dayjs(p.value).format('DD/MM/YYYY') : '—' },
    { headerName: 'Creado', field: 'creado_en', width: 130,
      filter: 'agDateColumnFilter',
      valueFormatter: p => p.value ? dayjs(p.value).format('DD/MM/YYYY') : '—',
      sort: 'desc' },
    { headerName: 'Acciones', width: 90, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Ver detalle">
          <Button size="small" icon={<EyeOutlined />} type="text"
            onClick={() => verDetalle(data)} />
        </Tooltip>
      )},
  ], [])

  const defaultColDef = useMemo(() => ({
  }), [])

  const getRowStyle = ({ data }) => {
    if (data?.estado === 'enviada') return { background: '#e6f4ff' }
    if (data?.estado === 'rechazada') return { background: '#fff1f0' }
    return {}
  }

  // Calcular total de ítems en el formulario
  const totalItems = items.reduce((acc, i) =>
    acc + ((i.cantidad || 0) * (i.precio_unitario || 0)), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ShoppingCartOutlined style={{ marginRight: 8 }} />Compras TI
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading} />
          <Button icon={<ExportOutlined />} onClick={exportar}>CSV</Button>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => setDrawerNuevo(true)}>
            Nueva solicitud
          </Button>
        </Space>
      </div>

      {/* Alertas */}
      {stats.enviadas > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          message={`${stats.enviadas} solicitud(es) esperando aprobación`}
          action={<Button size="small" onClick={() => {}}>Ver</Button>} />
      )}

      {/* Stats */}
      <KpiStrip items={[
        { label: 'Total',          value: stats.total,                      color: '#64748b'  },
        { label: 'Borradores',     value: stats.borradores,                 color: '#94a3b8'  },
        { label: 'Enviadas',       value: stats.enviadas,                   color: '#1677ff'  },
        { label: 'Aprobadas',      value: stats.aprobadas,                  color: '#22c55e'  },
        { label: 'En proceso',     value: stats.en_proceso,                 color: '#f59e0b'  },
        { label: 'Recibidas',      value: stats.recibidas,                  color: '#06b6d4'  },
        { label: 'Val. aprobado',  value: formatCurrency(stats.valor_total_aprobado), color: '#22c55e' },
        { label: 'Val. recibido',  value: formatCurrency(stats.valor_total_recibido), color: '#1677ff' },
      ]} />

      {/* Toolbar búsqueda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Input prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 13 }} />}
          placeholder="Buscar en todos los campos..." allowClear size="small"
          style={{ width: 280, fontSize: 12 }}
          onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)} />
      </div>

      {/* Grid */}
      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef} rowData={solicitudes} columnDefs={columnDefs}
          defaultColDef={defaultColDef} {...defaultGridOptions}
          loading={loading} rowHeight={44} headerHeight={40}
          getRowId={p => String(p.data.id)}
          getRowStyle={getRowStyle}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Drawer Detalle */}
      <Drawer
        title={selected ? `${selected.numero} – ${selected.descripcion?.slice(0, 40)}` : 'Detalle'}
        open={drawerDetalle} onClose={() => setDrawerDetalle(false)} width={680}
        styles={{ body: { paddingTop: 16 } }}
      >
        <DrawerDetalle
          solicitud={selected}
          onClose={() => setDrawerDetalle(false)}
          onActualizar={onActualizar}
          esJefe={esJefe}
        />
      </Drawer>

      {/* Drawer Nueva Solicitud */}
      <Drawer
        title="Nueva solicitud de compra"
        open={drawerNuevo}
        onClose={() => { setDrawerNuevo(false); form.resetFields() }}
        width={620}
        extra={<Button type="primary" onClick={() => form.submit()}>Crear solicitud</Button>}
      >
        <Form form={form} layout="vertical" onFinish={crearSolicitud}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo de solicitud" rules={[{ required: true }]}>
                <Select>
                  {TIPOS_SOLICITUD.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fecha_necesidad" label="Fecha de necesidad">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
            <Input placeholder="Resumen de lo que se solicita comprar..." />
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

          <Divider>Detalle de ítems</Divider>
          {items.map((item, idx) => (
            <Row key={item.key} gutter={8} style={{ marginBottom: 8 }}>
              <Col span={9}>
                <Input placeholder="Descripción del ítem"
                  value={item.descripcion}
                  onChange={e => {
                    const copia = [...items]
                    copia[idx].descripcion = e.target.value
                    setItems(copia)
                  }} />
              </Col>
              <Col span={3}>
                <InputNumber min={1} value={item.cantidad} style={{ width: '100%' }}
                  placeholder="Cant."
                  onChange={v => { const c = [...items]; c[idx].cantidad = v; setItems(c) }} />
              </Col>
              <Col span={4}>
                <Input placeholder="Unidad" value={item.unidad}
                  onChange={e => { const c = [...items]; c[idx].unidad = e.target.value; setItems(c) }} />
              </Col>
              <Col span={5}>
                <InputNumber min={0} value={item.precio_unitario} style={{ width: '100%' }}
                  placeholder="Precio unit."
                  onChange={v => { const c = [...items]; c[idx].precio_unitario = v; setItems(c) }} />
              </Col>
              <Col span={3}>
                <Button danger type="text"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  disabled={items.length === 1}>✕</Button>
              </Col>
            </Row>
          ))}
          <Button type="dashed" block icon={<PlusOutlined />}
            onClick={() => setItems([...items, { key: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', precio_unitario: null }])}>
            Agregar ítem
          </Button>
          {totalItems > 0 && (
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Text strong>Total estimado: {formatCurrency(totalItems)}</Text>
            </div>
          )}
        </Form>
      </Drawer>
    </div>
  )
}
