// ─────────────────────────────────────────────────────────────────────
// src/modules/tickets/TicketsPage.jsx
// Rediseño v2 — Tickets de soporte
// Drop-in: mantiene AG Grid, ticketService, usuarioService, drawers,
// form de nuevo ticket y detalle. Solo se restilan los renderers y la
// página. La lógica de negocio queda exactamente igual.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  SearchOutlined, FilterOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import {
  ticketService, PRIORIDADES, ESTADOS, CATEGORIAS, CANALES,
  getPrioridad, getEstado,
} from '../../services/ticketService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import './TicketsPage.css'

dayjs.extend(relativeTime)
dayjs.locale('es')

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

// ── Cell renderers ────────────────────────────────────────────────────
const PrioridadRenderer = ({ value }) => {
  const p = getPrioridad(value)
  if (!p) return null
  const MAP = {
    critica: { cls: 'crit' },
    alta:    { cls: 'warn' },
    media:   { cls: 'info' },
    baja:    { cls: 'ok'   },
  }
  const c = MAP[value] || { cls: 'info' }
  return (
    <span className={`qpill ${c.cls}`}>
      {value === 'critica' ? <FireOutlined style={{ fontSize: 9 }} /> : <span className="qpill-dot" />}
      {p.label}
    </span>
  )
}

const ESTADO_CLS = {
  abierto:'info', asignado:'info', en_progreso:'plum',
  pendiente:'warn', escalado:'crit', resuelto:'ok',
  cerrado:'muted', cancelado:'crit',
}
const EstadoRenderer = ({ value }) => {
  const e = getEstado(value)
  if (!e) return null
  return (
    <span className={`qpill ${ESTADO_CLS[value] || 'muted'}`}>
      <span className="qpill-dot" />{e.label}
    </span>
  )
}

const SLARenderer = ({ data }) => {
  if (!data?.sla_limite) return <span className="qmuted">—</span>
  const limite  = dayjs(data.sla_limite)
  const ahora   = dayjs()
  const vencido = ahora.isAfter(limite)
  const porVencer = !vencido && limite.diff(ahora, 'hour') <= 2
  const resuelto = ['resuelto', 'cerrado', 'cancelado'].includes(data.estado)

  if (resuelto) {
    return data.sla_cumplido
      ? <span className="qpill ok"><CheckOutlined style={{ fontSize: 9 }} />Cumplido</span>
      : <span className="qpill crit"><WarningOutlined style={{ fontSize: 9 }} />Vencido</span>
  }
  if (vencido) {
    return (
      <span className="qsla">
        <span className="qsla-meta">
          <span style={{ color: 'var(--crit)' }}>vencido</span>
          <span>{limite.fromNow(true)}</span>
        </span>
        <span className="qsla-bar"><span className="qsla-fill crit" style={{ width: '100%' }} /></span>
      </span>
    )
  }
  if (porVencer) {
    return (
      <span className="qsla">
        <span className="qsla-meta">
          <span style={{ color: 'var(--warn)' }}>por vencer</span>
          <span>{limite.fromNow(true)}</span>
        </span>
        <span className="qsla-bar"><span className="qsla-fill warn" style={{ width: '70%' }} /></span>
      </span>
    )
  }
  return (
    <span className="qsla">
      <span className="qsla-meta">
        <span style={{ color: 'var(--ok)' }}>OK</span>
        <span>{limite.format('DD/MM HH:mm')}</span>
      </span>
      <span className="qsla-bar"><span className="qsla-fill ok" style={{ width: '40%' }} /></span>
    </span>
  )
}

const NumeroRenderer = ({ value }) => (
  <a className="qmono" style={{ fontWeight: 600 }}>{value}</a>
)

function initials(name) {
  if (!name) return '—'
  return name.split(' ').map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase()
}
const AvatarChip = ({ persona }) => persona ? (
  <span className="qav-named">
    <Avatar size={22} style={{ background: 'var(--ink-2)', fontSize: 10, fontWeight: 600 }}>
      {initials(`${persona.nombre} ${persona.apellido}`)}
    </Avatar>
    <span>{persona.nombre} {persona.apellido}</span>
  </span>
) : <span className="qmuted">Sin asignar</span>

// ── Detalle (drawer body) ────────────────────────────────────────────
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

  useEffect(() => { if (ticket) cargarComentarios() }, [ticket])

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
    try { await ticketService.tomar(ticket.id); message.success('Ticket tomado'); onActualizar() }
    catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }
  const cerrarTicket = async () => {
    try { await ticketService.cerrar(ticket.id); message.success('Ticket cerrado'); onActualizar() }
    catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  if (!ticket) return null
  const slaVencido = ticket.sla_limite && dayjs().isAfter(dayjs(ticket.sla_limite)) && !['resuelto','cerrado'].includes(ticket.estado)

  return (
    <div className="qdetail">
      {/* Encabezado */}
      <div className="qdetail-head">
        <div className="qmono" style={{ fontWeight: 600 }}>{ticket.numero}</div>
        <h2>{ticket.titulo}</h2>
        <div className="qdetail-tags">
          <PrioridadRenderer value={ticket.prioridad} />
          <EstadoRenderer value={ticket.estado} />
          {ticket.categoria && <span className="qpill muted">{ticket.categoria}</span>}
          {ticket.canal_entrada && <span className="qpill muted">{ticket.canal_entrada}</span>}
        </div>
      </div>

      {/* SLA banner */}
      {slaVencido && (
        <div className="qsla-banner">
          <WarningOutlined />
          <div>
            <div className="qsla-banner-t">SLA vencido — {dayjs(ticket.sla_limite).fromNow()}</div>
            <div className="qsla-banner-s">El ticket debe ser atendido de inmediato.</div>
          </div>
        </div>
      )}

      {/* Acciones */}
      {esTecnico && (
        <div className="qdetail-actions">
          {!ticket.tecnico_id && (
            <Button icon={<ThunderboltOutlined />} type="primary" onClick={tomarTicket} size="small">
              Tomar ticket
            </Button>
          )}
          <Button icon={<EditOutlined />} size="small" onClick={() => setEditEstado(true)}>
            Cambiar estado
          </Button>
          {ticket.estado === 'resuelto' && (
            <Button icon={<CheckOutlined />} size="small" onClick={cerrarTicket}>
              Cerrar ticket
            </Button>
          )}
        </div>
      )}

      {/* Meta grid */}
      <div className="qmeta-grid">
        <div className="qmeta-cell">
          <div className="qmeta-k">Solicitante</div>
          <div className="qrow">
            <Avatar size={30} style={{ background: '#7C2D12' }}>
              {initials(`${ticket.solicitante?.nombre} ${ticket.solicitante?.apellido}`)}
            </Avatar>
            <div>
              <div className="qmeta-v">{ticket.solicitante?.nombre} {ticket.solicitante?.apellido}</div>
              <div className="qmuted" style={{ fontSize: 10.5 }}>{ticket.sede?.nombre || '—'}</div>
            </div>
          </div>
        </div>
        <div className="qmeta-cell">
          <div className="qmeta-k">Técnico asignado</div>
          {ticket.tecnico ? (
            <div className="qrow">
              <Avatar size={30} style={{ background: '#15633F' }}>
                {initials(`${ticket.tecnico.nombre} ${ticket.tecnico.apellido}`)}
              </Avatar>
              <div>
                <div className="qmeta-v">{ticket.tecnico.nombre} {ticket.tecnico.apellido}</div>
                <div className="qmuted" style={{ fontSize: 10.5 }}>{ticket.tecnico.rol}</div>
              </div>
            </div>
          ) : <div className="qmuted">Sin asignar</div>}
        </div>
        <div className="qmeta-cell">
          <div className="qmeta-k">Creado</div>
          <div className="qmeta-v qmono">{dayjs(ticket.creado_en).format('DD/MM/YYYY HH:mm')}</div>
        </div>
        <div className="qmeta-cell">
          <div className="qmeta-k">SLA Límite</div>
          <div className="qmeta-v qmono"
               style={{ color: slaVencido ? 'var(--crit)' : 'var(--ink-1)' }}>
            {ticket.sla_limite ? dayjs(ticket.sla_limite).format('DD/MM HH:mm') : '—'}
          </div>
        </div>
        <div className="qmeta-cell">
          <div className="qmeta-k">Tiempo resolución</div>
          <div className="qmeta-v qmono">{ticket.tiempo_resolucion_h ? `${ticket.tiempo_resolucion_h} h` : '—'}</div>
        </div>
      </div>

      {/* Descripción */}
      {ticket.descripcion && (
        <div className="qsection-block">
          <div className="qsection-title">Descripción del problema</div>
          <div className="qsection-body">
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{ticket.descripcion}</p>
          </div>
        </div>
      )}

      {ticket.solucion && (
        <Alert type="success" message="Solución aplicada" description={ticket.solucion}
          style={{ marginBottom: 18, borderRadius: 'var(--radius-sm)' }} showIcon />
      )}

      {ticket.nps_puntuacion && (
        <div className="qsection-block">
          <div className="qsection-title">Calificación del usuario</div>
          <div className="qsection-body">
            <Rate disabled value={Math.round(ticket.nps_puntuacion / 2)} count={5} />
            <Text style={{ marginLeft: 8 }}>{ticket.nps_puntuacion}/10</Text>
            {ticket.nps_comentario && <Paragraph style={{ marginTop: 8 }}>{ticket.nps_comentario}</Paragraph>}
          </div>
        </div>
      )}

      {/* Conversación */}
      <div className="qsec-h" style={{ marginTop: 24 }}>
        <div className="qsec-l"><span className="qsec-num">03</span><em>Conversación</em></div>
        <div className="qsec-r"><span className="qmuted">{comentarios.length} eventos</span></div>
      </div>

      <Spin spinning={loadingCom}>
        <div className="qtl">
          {comentarios.map((c, i) => (
            <div key={i} className={`qtl-item ${c.es_interno ? 'internal' : ''}`}>
              <div className="qtl-head">
                <Avatar size={20} style={{ background: 'var(--ink-2)', fontSize: 9 }}>
                  {initials(`${c.autor?.nombre} ${c.autor?.apellido}`)}
                </Avatar>
                <span className="qtl-actor">{c.autor?.nombre} {c.autor?.apellido}</span>
                {c.es_interno && <span className="qpill warn">Nota interna</span>}
                <span className="qtl-when qmono">{dayjs(c.creado_en).format('DD/MM HH:mm')}</span>
              </div>
              <div className={`qtl-body ${c.es_interno ? 'internal' : ''}`}>
                {c.contenido}
              </div>
            </div>
          ))}
          {comentarios.length === 0 && !loadingCom && (
            <div className="qmuted" style={{ padding: '16px 0', fontStyle: 'italic' }}>
              Sin comentarios todavía.
            </div>
          )}
        </div>
      </Spin>

      {/* Composer */}
      <div className="qcomposer">
        <TextArea
          value={nuevoComentario}
          onChange={e => setNuevoComentario(e.target.value)}
          placeholder="Escribe un comentario o actualización..."
          rows={3}
        />
        <div className="qcomposer-bar">
          {esTecnico && (
            <button
              type="button"
              className={`qbtn-toggle ${esInterno ? 'on' : ''}`}
              onClick={() => setEsInterno(!esInterno)}
            >
              {esInterno ? '🔒 Nota interna' : '💬 Visible al solicitante'}
            </button>
          )}
          <span style={{ flex: 1 }} />
          <Button type="primary" icon={<MessageOutlined />}
            loading={guardando} onClick={enviarComentario}
            disabled={!nuevoComentario.trim()}>
            Enviar
          </Button>
        </div>
      </div>

      {/* Modal cambio de estado */}
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

// ── Página principal ─────────────────────────────────────────────────
export default function TicketsPage() {
  const gridRef  = useRef()
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const esTecnico = ['jefe','especialista','mesa_ayuda'].includes(usuario?.rol)

  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [stats,    setStats]    = useState({})
  const [tecnicos, setTecnicos] = useState([])
  const [selected, setSelected] = useState(null)
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

  const verDetalle = (ticket) => { setSelected(ticket); setDrawerDetalle(true) }
  const onActualizar = () => {
    cargar()
    if (selected) ticketService.obtener(selected.id).then(({ data }) => setSelected(data))
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

  // ── Columnas ────────────────────────────────────────────────────────
  const columnDefs = useMemo(() => [
    { colId: 'sel', headerName: '', width: 40, maxWidth: 40,
      checkboxSelection: true, headerCheckboxSelection: true,
      pinned: 'left', sortable: false, filter: false,
      suppressHeaderMenuButton: true, suppressFloatingFilterButton: true,
      resizable: false, lockPosition: true },
    { colId: 'numero', headerName: 'N°', field: 'numero', width: 165, pinned: 'left',
      filter: 'agTextColumnFilter', cellRenderer: NumeroRenderer,
      suppressFloatingFilterButton: true },
    { colId: 'titulo', headerName: 'Título', field: 'titulo', flex: 2, minWidth: 260,
      filter: 'agTextColumnFilter', suppressFloatingFilterButton: true,
      cellRenderer: ({ value, data }) => (
        <Tooltip title={value} mouseEnterDelay={0.5}>
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', display: 'block', cursor: 'pointer',
            color: 'var(--ink-1)', fontWeight: 500,
          }} onClick={() => verDetalle(data)}>{value}</span>
        </Tooltip>
      )},
    { colId: 'prioridad', headerName: 'Prio', field: 'prioridad', width: 110,
      filter: 'agSetColumnFilter', suppressFloatingFilterButton: true,
      cellRenderer: PrioridadRenderer, cellStyle: { overflow: 'visible' },
      filterParams: { values: PRIORIDADES.map(p => p.value),
        valueFormatter: (p) => getPrioridad(p.value)?.label || p.value },
      comparator: (a, b) => {
        const o = { critica: 0, alta: 1, media: 2, baja: 3 }
        return (o[a] ?? 9) - (o[b] ?? 9)
      }},
    { colId: 'estado', headerName: 'Estado', field: 'estado', width: 135,
      filter: 'agSetColumnFilter', suppressFloatingFilterButton: true,
      cellRenderer: EstadoRenderer, cellStyle: { overflow: 'visible' },
      filterParams: { values: ESTADOS.map(e => e.value),
        valueFormatter: (p) => getEstado(p.value)?.label || p.value }},
    { colId: 'categoria', headerName: 'Categoría', field: 'categoria', width: 130,
      filter: 'agSetColumnFilter', suppressFloatingFilterButton: true,
      valueFormatter: (p) => p.value || '—' },
    { colId: 'solicitante', headerName: 'Solicitante', field: 'solicitante', flex: 1, minWidth: 160,
      filter: 'agTextColumnFilter', suppressFloatingFilterButton: true,
      valueGetter: (p) => p.data?.solicitante
        ? `${p.data.solicitante.nombre} ${p.data.solicitante.apellido}` : '—',
      cellRenderer: ({ data }) => <AvatarChip persona={data?.solicitante} /> },
    { colId: 'tecnico', headerName: 'Técnico', field: 'tecnico', flex: 1, minWidth: 160,
      filter: 'agTextColumnFilter', suppressFloatingFilterButton: true,
      valueGetter: (p) => p.data?.tecnico
        ? `${p.data.tecnico.nombre} ${p.data.tecnico.apellido}` : '',
      cellRenderer: ({ data }) => <AvatarChip persona={data?.tecnico} /> },
    { colId: 'sla', headerName: 'SLA', field: 'sla_limite', width: 150,
      filter: false, suppressHeaderMenuButton: true, suppressFloatingFilterButton: true,
      cellRenderer: SLARenderer, cellStyle: { overflow: 'visible' } },
    { colId: 'creado_en', headerName: 'Creado', field: 'creado_en', width: 130,
      filter: 'agDateColumnFilter', suppressFloatingFilterButton: true,
      valueFormatter: (p) => p.value ? dayjs(p.value).format('DD/MM/YY HH:mm') : '—',
      sort: 'desc' },
    { colId: 'acciones', headerName: '', width: 90, pinned: 'right',
      sortable: false, filter: false,
      suppressHeaderMenuButton: true, suppressFloatingFilterButton: true,
      resizable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', gap: 2 },
      cellRenderer: ({ data }) => (
        <>
          <Tooltip title="Ver detalle">
            <Button size="small" icon={<EyeOutlined />} type="text"
              style={{ color: 'var(--ink-2)' }} onClick={() => verDetalle(data)} />
          </Tooltip>
          {esTecnico && !data.tecnico_id && (
            <Tooltip title="Tomar ticket">
              <Button size="small" icon={<ThunderboltOutlined />} type="text"
                style={{ color: 'var(--acc)' }}
                onClick={async () => {
                  await ticketService.tomar(data.id); message.success('Ticket tomado'); cargar()
                }} />
            </Tooltip>
          )}
        </>
      )},
  ], [esTecnico])

  const defaultColDef = useMemo(() => ({
    suppressFloatingFilterButton: true, minWidth: 80,
  }), [])

  const getRowStyle = ({ data }) => {
    if (data?.prioridad === 'critica' && !['resuelto','cerrado'].includes(data?.estado))
      return { background: 'rgba(168,32,26,0.04)' }
    return {}
  }

  return (
    <div className="qtickets">

      {/* Header editorial */}
      <div className="qph" style={{ marginBottom: 22 }}>
        <div className="qph-eyebrow"><span className="qph-dot" />Mesa de ayuda · cola de tickets</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="qph-title">Tickets de <em>soporte</em></h1>
            <p className="qph-sub" style={{ marginTop: 8 }}>
              {tickets.length} tickets en cola · ordena, filtra, exporta y atiende desde aquí.
            </p>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading}>Actualizar</Button>
            <Button icon={<ExportOutlined />} onClick={exportar}>Exportar CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerNuevo(true)}>
              Nuevo ticket
            </Button>
          </Space>
        </div>
        <span className="qph-rule" />
      </div>

      {/* KPI strip editorial */}
      <div className="qkpi-row">
        {[
          { lbl: 'Total',         val: stats.total ?? 0 },
          { lbl: 'Abiertos',      val: stats.abiertos ?? 0,        tone: 'info' },
          { lbl: 'En progreso',   val: stats.en_progreso ?? 0,     tone: 'plum' },
          { lbl: 'Sin asignar',   val: stats.sin_asignar ?? 0,     tone: (stats.sin_asignar > 0 ? 'warn' : 'ok') },
          { lbl: 'Vencidos SLA',  val: stats.vencidos_sla ?? 0,    tone: (stats.vencidos_sla > 0 ? 'crit' : 'ok') },
          { lbl: 'Por vencer',    val: stats.por_vencer_sla ?? 0,  tone: 'warn' },
          { lbl: 'Resueltos hoy', val: stats.resueltos_hoy ?? 0,   tone: 'ok'   },
          { lbl: 'NPS',           val: stats.nps_promedio ? `${stats.nps_promedio}/10` : '—' },
        ].map((k, i, arr) => (
          <div key={k.lbl} className="qkpi-cell" style={{
            borderRight: i < arr.length - 1 ? '1px solid var(--line-2)' : 'none',
          }}>
            <div className="qkpi-lbl">{k.lbl}</div>
            <div className={`qkpi-cell-val tone-${k.tone || 'neutral'}`}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="qtoolbar">
        <div className="qinput-wrap">
          <SearchOutlined />
          <input
            className="qinput"
            placeholder="Buscar en todos los campos…"
            onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)}
          />
        </div>
        <span className="qtag-filter"><FilterOutlined /> Filtros avanzados</span>
        <span style={{ marginLeft: 'auto' }} className="qmuted qmono">
          {tickets.length} registros
        </span>
      </div>

      {/* Grid */}
      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef}
          rowData={tickets}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          {...defaultGridOptions}
          loading={loading}
          rowHeight={36}
          headerHeight={36}
          getRowId={(p) => String(p.data.id)}
          getRowStyle={getRowStyle}
          onGridReady={(p) => p.api.sizeColumnsToFit()}
          onFirstDataRendered={(p) => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Drawer detalle */}
      <Drawer
        title={null}
        open={drawerDetalle}
        onClose={() => setDrawerDetalle(false)}
        width={720}
        styles={{
          body:    { padding: '24px 28px', background: 'var(--bg-canvas)' },
          header:  { display: 'none' },
        }}
        className="qdrawer"
      >
        <DetalleTicket
          ticket={selected}
          onClose={() => setDrawerDetalle(false)}
          onActualizar={onActualizar}
          tecnicos={tecnicos}
        />
      </Drawer>

      {/* Drawer nuevo ticket */}
      <Drawer
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--acc-soft)', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--acc-ink)',
            }}>
              <PlusOutlined />
            </span>
            <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontSize: 22 }}>
              Nuevo ticket
            </span>
          </span>
        }
        open={drawerNuevo}
        onClose={() => { setDrawerNuevo(false); form.resetFields() }}
        width={520}
        styles={{
          body:   { padding: 0, background: 'var(--bg-canvas)' },
          header: { borderBottom: '1px solid var(--line-1)', background: 'var(--bg-canvas)' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={crearTicket}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="qform-section-h"><FileTextOutlined /> Descripción del problema</div>
            <div className="qform-section-b">
              <Form.Item name="titulo" label="Título del problema"
                rules={[{ required: true, message: 'El título es obligatorio' }]}
                style={{ marginBottom: 14 }}>
                <Input size="large" placeholder="Ej: No puedo acceder al sistema de nómina..." />
              </Form.Item>
              <Form.Item name="descripcion" label="Descripción detallada"
                help="Incluye: qué ocurrió, cuándo empezó y si hay mensaje de error"
                style={{ marginBottom: 6 }}>
                <TextArea rows={5} placeholder="Describe con detalle el problema…"
                  style={{ resize: 'vertical' }} />
              </Form.Item>
            </div>

            <div className="qform-section-h"><TagsOutlined /> Clasificación</div>
            <div className="qform-section-b">
              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item name="prioridad" label="Prioridad" initialValue="media" style={{ marginBottom: 14 }}>
                    <Select size="middle">
                      {PRIORIDADES.map(p => (
                        <Option key={p.value} value={p.value}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
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
                      {CATEGORIAS.map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}
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

            {esTecnico && (
              <>
                <div className="qform-section-h"><TeamOutlined /> Asignación</div>
                <div className="qform-section-b">
                  <Form.Item name="tecnico_id" label="Técnico asignado"
                    help="Si no se selecciona, quedará pendiente de asignación"
                    style={{ marginBottom: 6 }}>
                    <Select allowClear placeholder="Sin asignar (auto-asignación)">
                      {tecnicos.map(t => (
                        <Option key={t.id} value={t.id}>
                          {t.nombre} {t.apellido}
                          <span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 6 }}>— {t.rol}</span>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              </>
            )}
          </div>

          <div className="qform-footer">
            <Button onClick={() => { setDrawerNuevo(false); form.resetFields() }}>Cancelar</Button>
            <Button type="primary" icon={<PlusOutlined />} htmlType="submit">Crear ticket</Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}
