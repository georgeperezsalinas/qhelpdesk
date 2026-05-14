import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Tooltip, Typography, Row, Col,
  Card, Statistic, Drawer, Form, Input, Select, message,
  Modal, Timeline, Avatar, Divider, Spin, Rate, Alert,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EyeOutlined, EditOutlined,
  MessageOutlined, ThunderboltOutlined, CheckOutlined,
  ClockCircleOutlined, ExportOutlined, WarningOutlined,
  FireOutlined, FileTextOutlined, TagsOutlined, TeamOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import KpiStrip from '../../components/common/KpiStrip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { ticketService, PRIORIDADES, ESTADOS, CATEGORIAS, CANALES, getPrioridad, getEstado } from '../../services/ticketService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'

dayjs.extend(relativeTime)
dayjs.locale('es')

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

// ── CELL RENDERERS ────────────────────────────────────────────────────────────
const PrioridadRenderer = ({ value }) => {
  const p = getPrioridad(value)
  if (!p) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: p.bg, color: p.color,
      border: `1px solid ${p.color}33`,
      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap', lineHeight: 1.4,
    }}>
      {value === 'critica' && <FireOutlined style={{ fontSize: 10 }} />}
      {p.label}
    </span>
  )
}

const ESTADO_COLORS = {
  default:    { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  blue:       { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  processing: { bg: '#faf5ff', color: '#7e22ce', dot: '#a855f7' },
  warning:    { bg: '#fff7ed', color: '#c2410c', dot: '#f97316' },
  volcano:    { bg: '#fff3e0', color: '#b45309', dot: '#f59e0b' },
  success:    { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  error:      { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
}

const EstadoRenderer = ({ value }) => {
  const e = getEstado(value)
  if (!e) return null
  const c = ESTADO_COLORS[e.color] || ESTADO_COLORS.default
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.color,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      whiteSpace: 'nowrap', lineHeight: 1.4,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {e.label}
    </span>
  )
}

const SLARenderer = ({ data }) => {
  const slaStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, whiteSpace: 'nowrap' }
  if (!data?.sla_limite) return <span style={{ ...slaStyle, color: '#94a3b8' }}>—</span>
  const limite = dayjs(data.sla_limite)
  const ahora  = dayjs()
  const vencido = ahora.isAfter(limite)
  const porVencer = !vencido && limite.diff(ahora, 'hour') <= 2
  const resuelto = ['resuelto', 'cerrado', 'cancelado'].includes(data.estado)

  if (resuelto) {
    return data.sla_cumplido
      ? <span style={{ ...slaStyle, color: '#52c41a', fontWeight: 500 }}>✓ Cumplido</span>
      : <span style={{ ...slaStyle, color: '#ef4444', fontWeight: 500 }}>✗ Vencido</span>
  }
  if (vencido)   return <span style={{ ...slaStyle, color: '#ef4444', fontWeight: 600 }}><WarningOutlined /> Venc. {limite.fromNow()}</span>
  if (porVencer) return <span style={{ ...slaStyle, color: '#fa8c16', fontWeight: 500 }}><ClockCircleOutlined /> {limite.fromNow()}</span>
  return <span style={{ ...slaStyle, color: '#64748b' }}>{limite.format('DD/MM HH:mm')}</span>
}

const NumeroRenderer = ({ value, data }) => (
  <a style={{ fontWeight: 600, fontFamily: 'monospace' }}>{value}</a>
)

// ── COMPONENTE DETALLE DE TICKET ──────────────────────────────────────────────
function DetalleTicket({ ticket, onClose, onActualizar, tecnicos }) {
  const { usuario } = useAuthStore()
  const esTecnico = ['jefe','especialista','mesa_ayuda'].includes(usuario?.rol)
  const [comentarios, setComentarios] = useState([])
  const [loadingCom, setLoadingCom]   = useState(false)
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [esInterno, setEsInterno]     = useState(false)
  const [guardando, setGuardando]     = useState(false)
  const [editEstado, setEditEstado]   = useState(false)
  const [formEstado] = Form.useForm()

  useEffect(() => {
    if (ticket) cargarComentarios()
  }, [ticket])

  const cargarComentarios = async () => {
    setLoadingCom(true)
    try {
      const { data } = await ticketService.comentarios(ticket.id)
      setComentarios(data)
    } catch {} finally { setLoadingCom(false) }
  }

  const enviarComentario = async () => {
    if (!nuevoComentario.trim()) return
    setGuardando(true)
    try {
      await ticketService.agregarComentario(ticket.id, {
        contenido: nuevoComentario, es_interno: esInterno
      })
      setNuevoComentario('')
      cargarComentarios()
      message.success('Comentario agregado')
    } catch { message.error('Error al agregar comentario') }
    finally { setGuardando(false) }
  }

  const cambiarEstado = async (values) => {
    try {
      await ticketService.actualizar(ticket.id, values)
      message.success('Ticket actualizado')
      setEditEstado(false)
      onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const tomarTicket = async () => {
    try {
      await ticketService.tomar(ticket.id)
      message.success('Ticket tomado')
      onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const cerrarTicket = async () => {
    try {
      await ticketService.cerrar(ticket.id)
      message.success('Ticket cerrado')
      onActualizar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  if (!ticket) return null
  const p = getPrioridad(ticket.prioridad)

  return (
    <div>
      {/* Cabecera */}
      <div style={{ borderLeft: `4px solid ${p?.color}`, paddingLeft: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Text code style={{ fontSize: 12 }}>{ticket.numero}</Text>
            <Title level={5} style={{ margin: '4px 0 8px' }}>{ticket.titulo}</Title>
            <Space wrap>
              <PrioridadRenderer value={ticket.prioridad} />
              <EstadoRenderer value={ticket.estado} />
              {ticket.categoria && <Tag>{ticket.categoria}</Tag>}
              {ticket.canal_entrada && <Tag color="geekblue">{ticket.canal_entrada}</Tag>}
            </Space>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      {esTecnico && (
        <Space wrap style={{ marginBottom: 16 }}>
          {!ticket.tecnico_id && (
            <Button icon={<ThunderboltOutlined />} type="primary" onClick={tomarTicket} size="small">
              Tomar ticket
            </Button>
          )}
          <Button icon={<EditOutlined />} size="small" onClick={() => setEditEstado(true)}>
            Cambiar estado
          </Button>
          {['resuelto'].includes(ticket.estado) && (
            <Button icon={<CheckOutlined />} size="small" onClick={cerrarTicket}>
              Cerrar ticket
            </Button>
          )}
        </Space>
      )}

      {/* Info del ticket */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="Solicitante">
            <Space>
              <Avatar size={32} style={{ background: '#1677ff' }}>
                {ticket.solicitante?.nombre?.[0]}{ticket.solicitante?.apellido?.[0]}
              </Avatar>
              <div>
                <div style={{ fontWeight: 500 }}>{ticket.solicitante?.nombre} {ticket.solicitante?.apellido}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{ticket.sede?.nombre || '—'}</div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="Técnico asignado">
            {ticket.tecnico ? (
              <Space>
                <Avatar size={32} style={{ background: '#52c41a' }}>
                  {ticket.tecnico?.nombre?.[0]}{ticket.tecnico?.apellido?.[0]}
                </Avatar>
                <div>
                  <div style={{ fontWeight: 500 }}>{ticket.tecnico?.nombre} {ticket.tecnico?.apellido}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{ticket.tecnico?.rol}</div>
                </div>
              </Space>
            ) : <Text type="secondary">Sin asignar</Text>}
          </Card>
        </Col>
      </Row>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Creado" value={dayjs(ticket.creado_en).format('DD/MM/YYYY HH:mm')}
              valueStyle={{ fontSize: 13 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="SLA límite"
              value={ticket.sla_limite ? dayjs(ticket.sla_limite).format('DD/MM/YYYY HH:mm') : '—'}
              valueStyle={{ fontSize: 13, color: ticket.sla_cumplido === false ? '#ff4d4f' : undefined }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Tiempo resolución"
              value={ticket.tiempo_resolucion_h ? `${ticket.tiempo_resolucion_h}h` : '—'}
              valueStyle={{ fontSize: 13 }} />
          </Card>
        </Col>
      </Row>

      {ticket.descripcion && (
        <Card size="small" title="Descripción" style={{ marginBottom: 16 }}>
          <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{ticket.descripcion}</Paragraph>
        </Card>
      )}

      {ticket.solucion && (
        <Alert type="success" message="Solución aplicada" description={ticket.solucion}
          style={{ marginBottom: 16 }} showIcon />
      )}

      {/* NPS */}
      {ticket.nps_puntuacion && (
        <Card size="small" title="Calificación del usuario" style={{ marginBottom: 16 }}>
          <Rate disabled value={Math.round(ticket.nps_puntuacion / 2)} count={5} />
          <Text style={{ marginLeft: 8 }}>{ticket.nps_puntuacion}/10</Text>
          {ticket.nps_comentario && <Paragraph style={{ marginTop: 8 }}>{ticket.nps_comentario}</Paragraph>}
        </Card>
      )}

      <Divider>Comentarios y seguimiento</Divider>

      {/* Comentarios */}
      <Spin spinning={loadingCom}>
        <Timeline style={{ marginBottom: 16 }}
          items={comentarios.map(c => ({
            color: c.es_interno ? 'orange' : 'blue',
            children: (
              <div style={{
                background: c.es_interno ? '#fffbe6' : '#f6f6f6',
                borderRadius: 6, padding: '8px 12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>
                    {c.autor?.nombre} {c.autor?.apellido}
                    {c.es_interno && <Tag color="orange" style={{ marginLeft: 6, fontSize: 10 }}>Interno</Tag>}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(c.creado_en).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </div>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{c.contenido}</Text>
              </div>
            )
          }))}
        />
      </Spin>

      {/* Nuevo comentario */}
      <div>
        <TextArea
          value={nuevoComentario}
          onChange={e => setNuevoComentario(e.target.value)}
          placeholder="Escribe un comentario o actualización..."
          rows={3} style={{ marginBottom: 8 }}
        />
        <Space>
          <Button type="primary" icon={<MessageOutlined />}
            loading={guardando} onClick={enviarComentario}
            disabled={!nuevoComentario.trim()}>
            Agregar
          </Button>
          {esTecnico && (
            <Button
              onClick={() => setEsInterno(!esInterno)}
              type={esInterno ? 'default' : 'dashed'}
            >
              {esInterno ? '🔒 Nota interna' : '💬 Público'}
            </Button>
          )}
        </Space>
      </div>

      {/* Modal cambiar estado */}
      <Modal title="Actualizar ticket" open={editEstado}
        onCancel={() => setEditEstado(false)}
        onOk={() => formEstado.submit()} okText="Guardar">
        <Form form={formEstado} layout="vertical" onFinish={cambiarEstado}
          initialValues={{ estado: ticket.estado, tecnico_id: ticket.tecnico_id }}>
          <Form.Item name="estado" label="Estado">
            <Select>
              {ESTADOS.filter(e => !['cancelado'].includes(e.value)).map(e => (
                <Option key={e.value} value={e.value}>{e.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="tecnico_id" label="Técnico asignado">
            <Select allowClear placeholder="Sin asignar">
              {tecnicos.map(t => (
                <Option key={t.id} value={t.id}>{t.nombre} {t.apellido}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="solucion" label="Solución">
            <TextArea rows={3} placeholder="Describe la solución aplicada..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function TicketsPage() {
  const gridRef  = useRef()
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const esTecnico = ['jefe','especialista','mesa_ayuda'].includes(usuario?.rol)

  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [stats,    setStats]    = useState({})
  const [tecnicos, setTecnicos] = useState([])
  const [selected, setSelected] = useState(null)   // ticket en el drawer
  const [drawerDetalle, setDrawerDetalle] = useState(false)
  const [drawerNuevo,   setDrawerNuevo]   = useState(false)
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: tks }, { data: dash }] = await Promise.all([
        ticketService.listar({ limit: 500 }),
        ticketService.dashboard(),
      ])
      setTickets(tks)
      setStats(dash)
    } catch { message.error('Error al cargar tickets') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    cargar()
    usuarioService.listarTecnicos().then(({ data }) => setTecnicos(data))
  }, [cargar])

  const verDetalle = (ticket) => {
    setSelected(ticket)
    setDrawerDetalle(true)
  }

  const onActualizar = () => {
    cargar()
    if (selected) {
      ticketService.obtener(selected.id).then(({ data }) => setSelected(data))
    }
  }

  const crearTicket = async (values) => {
    try {
      await ticketService.crear(values)
      message.success('Ticket creado correctamente')
      setDrawerNuevo(false)
      form.resetFields()
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error al crear ticket') }
  }

  const exportar = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `tickets_${dayjs().format('YYYYMMDD')}.csv`,
    })
  }

  // ── Columnas ────────────────────────────────────────────────────────────────
  const columnDefs = useMemo(() => [
    {
      colId: 'sel', headerName: '', width: 44, maxWidth: 44,
      checkboxSelection: true, headerCheckboxSelection: true,
      pinned: 'left', sortable: false, filter: false,
      suppressHeaderMenuButton: true, suppressFloatingFilterButton: true,
      resizable: false, lockPosition: true,
    },
    {
      colId: 'numero', headerName: 'N°', field: 'numero', width: 200, pinned: 'left',
      filter: 'agTextColumnFilter', cellRenderer: NumeroRenderer,
      suppressFloatingFilterButton: true,
    },
    {
      colId: 'titulo', headerName: 'Título', field: 'titulo', flex: 2, minWidth: 260,
      filter: 'agTextColumnFilter',
      suppressFloatingFilterButton: true,
      cellRenderer: ({ value, data }) => (
        <Tooltip title={value} mouseEnterDelay={0.5}>
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', display: 'block', cursor: 'pointer',
            color: '#1677ff', fontWeight: 500,
          }}
            onClick={() => verDetalle(data)}
          >
            {value}
          </span>
        </Tooltip>
      ),
    },
    {
      colId: 'prioridad', headerName: 'Prioridad', field: 'prioridad', width: 115,
      filter: 'agSetColumnFilter',
      suppressFloatingFilterButton: true,
      cellRenderer: PrioridadRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: {
        values: PRIORIDADES.map(p => p.value),
        valueFormatter: (p) => getPrioridad(p.value)?.label || p.value,
      },
      comparator: (a, b) => {
        const orden = { critica: 0, alta: 1, media: 2, baja: 3 }
        return (orden[a] ?? 9) - (orden[b] ?? 9)
      },
    },
    {
      colId: 'estado', headerName: 'Estado', field: 'estado', width: 140,
      filter: 'agSetColumnFilter',
      suppressFloatingFilterButton: true,
      cellRenderer: EstadoRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: {
        values: ESTADOS.map(e => e.value),
        valueFormatter: (p) => getEstado(p.value)?.label || p.value,
      },
    },
    {
      colId: 'categoria', headerName: 'Categoría', field: 'categoria', width: 130,
      filter: 'agSetColumnFilter',
      suppressFloatingFilterButton: true,
      valueFormatter: (p) => p.value || '—',
    },
    {
      colId: 'solicitante', headerName: 'Solicitante', field: 'solicitante', flex: 1, minWidth: 150,
      filter: 'agTextColumnFilter',
      suppressFloatingFilterButton: true,
      valueGetter: (p) => p.data?.solicitante
        ? `${p.data.solicitante.nombre} ${p.data.solicitante.apellido}`
        : '—',
    },
    {
      colId: 'tecnico', headerName: 'Técnico', field: 'tecnico', flex: 1, minWidth: 145,
      filter: 'agTextColumnFilter',
      suppressFloatingFilterButton: true,
      valueGetter: (p) => p.data?.tecnico
        ? `${p.data.tecnico.nombre} ${p.data.tecnico.apellido}`
        : '',
      cellRenderer: ({ data }) => data?.tecnico
        ? <span>{data.tecnico.nombre} {data.tecnico.apellido}</span>
        : <span style={{ color: '#94a3b8', fontSize: 11 }}>Sin asignar</span>,
    },
    {
      colId: 'sede', headerName: 'Sede', field: 'sede', width: 130,
      filter: 'agSetColumnFilter',
      suppressFloatingFilterButton: true,
      valueGetter: (p) => p.data?.sede?.nombre || '—',
    },
    {
      colId: 'sla', headerName: 'SLA', field: 'sla_limite', width: 160,
      filter: false,
      suppressHeaderMenuButton: true, suppressFloatingFilterButton: true,
      cellRenderer: SLARenderer,
    },
    {
      colId: 'creado_en', headerName: 'Creado', field: 'creado_en', width: 130,
      filter: 'agDateColumnFilter',
      suppressFloatingFilterButton: true,
      valueFormatter: (p) => p.value ? dayjs(p.value).format('DD/MM/YY HH:mm') : '—',
      sort: 'desc',
    },
    {
      colId: 'acciones', headerName: 'Acciones', width: 100, pinned: 'right',
      sortable: false, filter: false,
      suppressHeaderMenuButton: true, suppressFloatingFilterButton: true,
      resizable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', gap: 2 },
      cellRenderer: ({ data }) => (
        <>
          <Tooltip title="Ver detalle">
            <Button size="small" icon={<EyeOutlined />} type="text"
              style={{ color: '#1677ff' }}
              onClick={() => verDetalle(data)} />
          </Tooltip>
          {esTecnico && !data.tecnico_id && (
            <Tooltip title="Tomar ticket">
              <Button size="small" icon={<ThunderboltOutlined />} type="text"
                style={{ color: '#fa8c16' }}
                onClick={async () => {
                  await ticketService.tomar(data.id)
                  message.success('Ticket tomado')
                  cargar()
                }} />
            </Tooltip>
          )}
        </>
      ),
    },
  ], [esTecnico])

  const defaultColDef = useMemo(() => ({
    suppressFloatingFilterButton: true,
    minWidth: 80,
  }), [])

  // Colorear filas por prioridad
  const getRowStyle = ({ data }) => {
    if (data?.prioridad === 'critica' && !['resuelto','cerrado'].includes(data?.estado))
      return { background: '#fff1f0' }
    return {}
  }

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Tickets de soporte</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading}>Actualizar</Button>
          <Button icon={<ExportOutlined />} onClick={exportar}>Exportar CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerNuevo(true)}>
            Nuevo ticket
          </Button>
        </Space>
      </div>

      {/* STATS */}
      <KpiStrip items={[
        { label: 'Total',        value: stats.total,          color: '#64748b'  },
        { label: 'Abiertos',     value: stats.abiertos,       color: '#1677ff'  },
        { label: 'En progreso',  value: stats.en_progreso,    color: '#7c3aed'  },
        { label: 'Sin asignar',  value: stats.sin_asignar,    color: '#f59e0b'  },
        { label: 'Vencidos SLA', value: stats.vencidos_sla,   color: '#ef4444'  },
        { label: 'Por vencer',   value: stats.por_vencer_sla, color: '#f97316'  },
        { label: 'Resueltos hoy',value: stats.resueltos_hoy,  color: '#22c55e'  },
        { label: 'NPS promedio', value: stats.nps_promedio ? `${stats.nps_promedio}/10` : '—', color: '#a855f7' },
      ]} />

      {/* TOOLBAR GRID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 13 }} />}
          placeholder="Buscar en todos los campos..."
          allowClear
          size="small"
          style={{ width: 280, fontSize: 12 }}
          onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)}
        />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
          {tickets.length} registros
        </span>
      </div>

      {/* GRID */}
      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef}
          rowData={tickets}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          {...defaultGridOptions}
          loading={loading}
          rowHeight={30}
          headerHeight={34}

          getRowId={(p) => String(p.data.id)}
          getRowStyle={getRowStyle}
          onGridReady={(p) => p.api.sizeColumnsToFit()}
          onFirstDataRendered={(p) => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* DRAWER DETALLE */}
      <Drawer
        title={selected ? `${selected.numero} – ${selected.titulo}` : 'Detalle'}
        open={drawerDetalle}
        onClose={() => setDrawerDetalle(false)}
        width={700}
        styles={{ body: { paddingTop: 16 } }}
      >
        <DetalleTicket
          ticket={selected}
          onClose={() => setDrawerDetalle(false)}
          onActualizar={onActualizar}
          tecnicos={tecnicos}
        />
      </Drawer>

      {/* DRAWER NUEVO TICKET */}
      <Drawer
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: '#dbeafe', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <PlusOutlined style={{ fontSize: 12, color: '#1d4ed8' }} />
            </span>
            Nuevo ticket
          </span>
        }
        open={drawerNuevo}
        onClose={() => { setDrawerNuevo(false); form.resetFields() }}
        width={500}
        styles={{ body: { padding: 0 }, header: { borderBottom: '1px solid #e2e8f0' } }}
      >
        <Form form={form} layout="vertical" onFinish={crearTicket}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* ── Sección 1: Descripción del problema ── */}
            <div className="form-section-header">
              <FileTextOutlined /> Descripción del problema
            </div>
            <div className="form-section-body">
              <Form.Item
                name="titulo"
                label="Título del problema"
                rules={[{ required: true, message: 'El título es obligatorio' }]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  size="large"
                  placeholder="Ej: No puedo acceder al sistema de nómina..."
                  style={{ fontSize: 13 }}
                />
              </Form.Item>
              <Form.Item
                name="descripcion"
                label="Descripción detallada"
                help="Incluye: qué ocurrió, cuándo empezó y si hay mensaje de error"
                style={{ marginBottom: 6 }}
              >
                <TextArea
                  rows={5}
                  placeholder="Describe con detalle el problema, los pasos para reproducirlo y el impacto en tu trabajo..."
                  style={{ fontSize: 13, resize: 'vertical' }}
                />
              </Form.Item>
            </div>

            {/* ── Sección 2: Clasificación ── */}
            <div className="form-section-header">
              <TagsOutlined /> Clasificación
            </div>
            <div className="form-section-body">
              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item name="prioridad" label="Prioridad" initialValue="media" style={{ marginBottom: 14 }}>
                    <Select size="middle">
                      {PRIORIDADES.map(p => (
                        <Option key={p.value} value={p.value}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                          }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: p.color, flexShrink: 0,
                            }} />
                            {p.label}
                          </span>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="categoria" label="Categoría" style={{ marginBottom: 14 }}>
                    <Select allowClear placeholder="Seleccionar categoría...">
                      {CATEGORIAS.map(c => (
                        <Option key={c.value} value={c.value}>{c.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="canal_entrada" label="Canal de ingreso" initialValue="portal" style={{ marginBottom: 6 }}>
                <Select>
                  {CANALES.map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}
                </Select>
              </Form.Item>
            </div>

            {/* ── Sección 3: Asignación (solo técnicos) ── */}
            {esTecnico && (
              <>
                <div className="form-section-header">
                  <TeamOutlined /> Asignación
                </div>
                <div className="form-section-body">
                  <Form.Item
                    name="tecnico_id"
                    label="Técnico asignado"
                    help="Si no se selecciona, quedará pendiente de asignación"
                    style={{ marginBottom: 6 }}
                  >
                    <Select allowClear placeholder="Sin asignar (auto-asignación)">
                      {tecnicos.map(t => (
                        <Option key={t.id} value={t.id}>
                          {t.nombre} {t.apellido}
                          <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>
                            — {t.rol}
                          </span>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              </>
            )}
          </div>

          {/* ── Footer fijo ── */}
          <div className="form-drawer-footer">
            <Button onClick={() => { setDrawerNuevo(false); form.resetFields() }}>
              Cancelar
            </Button>
            <Button type="primary" icon={<PlusOutlined />} htmlType="submit">
              Crear ticket
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}
