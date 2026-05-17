// ─────────────────────────────────────────────────────────────────────
// src/modules/mantenimiento/MantenimientoPage.jsx
// Rediseño v2 — Mantenimiento
// Drop-in: mantiene mantenimientoService, checklist, generación de
// preventivos, drawers, AG Grid.
// Requiere: qmodules.css y qhelpers.jsx cargados.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Drawer, Form, Input, Select, DatePicker, Checkbox,
  Tooltip, message, Divider, Row, Col, Popconfirm, Alert,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, ExportOutlined,
  ToolOutlined, CheckCircleOutlined, PlayCircleOutlined,
  ThunderboltOutlined, WarningOutlined, SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  mantenimientoService, TIPOS_MANTENIMIENTO, ESTADOS_ORDEN, getTipo, getEstado,
} from '../../services/mantenimientoService'
import { inventarioService } from '../../services/inventarioService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import {
  QPageHeader, QKpiRow, QPill, QProgress, QDrawerTitle,
} from '../../components/common/qhelpers'

const { Option } = Select
const { TextArea } = Input

// Mapeos
const TIPO_TONE   = { preventivo: 'info', correctivo: 'warn', predictivo: 'plum' }
const ESTADO_TONE = {
  programado: 'info', en_proceso: 'warn',
  completado: 'ok',   cancelado: 'muted',
}

// ── Renderers ─────────────────────────────────────────────────────────
const TipoRenderer = ({ value }) => {
  const t = getTipo(value); if (!t) return value
  return <QPill tone={TIPO_TONE[value] || 'muted'}>{t.label}</QPill>
}
const EstadoRenderer = ({ value }) => {
  const e = getEstado(value); if (!e) return value
  return <QPill tone={ESTADO_TONE[value] || 'muted'}>{e.label}</QPill>
}
const FechaRenderer = ({ value, data }) => {
  if (!value) return <span className="qmuted">—</span>
  const fecha = dayjs(value)
  const vencida = fecha.isBefore(dayjs(), 'day') && data?.estado === 'programado'
  return (
    <span className="qmono" style={{
      color: vencida ? 'var(--crit)' : 'var(--ink-1)',
      fontWeight: vencida ? 600 : 400,
      fontSize: 11.5,
    }}>
      {vencida && <WarningOutlined style={{ marginRight: 4 }} />}
      {fecha.format('DD/MM/YYYY')}
    </span>
  )
}
const ChecklistRenderer = ({ data }) => {
  if (!data?.checklist?.length) return <span className="qmuted">—</span>
  const total = data.checklist.length
  const completados = data.checklist.filter(c => c.completado).length
  return <QProgress value={completados} max={total}
    tone={completados === total ? 'ok' : 'info'}
    label={`${completados}/${total}`} />
}
const OrigenRenderer = ({ value }) => {
  const map = { automatico: { tone: 'plum', lbl: 'Auto' }, ticket: { tone: 'info', lbl: 'Ticket' } }
  const m = map[value] || { tone: 'muted', lbl: 'Manual' }
  return <QPill tone={m.tone}>{m.lbl}</QPill>
}

// ── DRAWER DETALLE / EJECUCIÓN ────────────────────────────────────────
function DrawerDetalle({ orden, onClose, onActualizar }) {
  const [formUpdate] = Form.useForm()
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (orden) formUpdate.setFieldsValue({
      trabajos_realizados: orden.trabajos_realizados,
      repuestos_usados:    orden.repuestos_usados,
      costo: orden.costo,
      proxima_fecha: orden.proxima_fecha ? dayjs(orden.proxima_fecha) : null,
    })
  }, [orden])

  if (!orden) return null

  const iniciar = async () => {
    try {
      await mantenimientoService.actualizar(orden.id, {
        estado: 'en_proceso',
        fecha_inicio: new Date().toISOString(),
      })
      message.success('Mantenimiento iniciado')
      onActualizar()
    } catch { message.error('Error') }
  }
  const completar = async (values) => {
    setGuardando(true)
    try {
      await mantenimientoService.actualizar(orden.id, {
        ...values,
        estado: 'completado',
        fecha_fin: new Date().toISOString(),
        proxima_fecha: values.proxima_fecha?.format('YYYY-MM-DD') || null,
      })
      message.success('Orden completada')
      onActualizar()
    } catch { message.error('Error') }
    finally { setGuardando(false) }
  }
  const toggleChecklist = async (item, checked) => {
    try {
      await mantenimientoService.actualizarChecklist(orden.id, item.id, checked, item.observacion)
      onActualizar()
    } catch { message.error('Error') }
  }

  const t = getTipo(orden.tipo)
  const e = getEstado(orden.estado)
  const puedeIniciar   = orden.estado === 'programado'
  const puedeCompletar = orden.estado === 'en_proceso'
  const totalTareas = orden.checklist?.length || 0
  const completadas = orden.checklist?.filter(c => c.completado).length || 0

  return (
    <div>
      {/* Cabecera */}
      <div style={{ marginBottom: 18 }}>
        <span className="qmono" style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink-1)' }}>{orden.numero}</span>
        <h2 style={{
          fontFamily: 'var(--f-display)', fontSize: 26, lineHeight: 1.15,
          margin: '6px 0 10px', color: 'var(--ink-1)', fontWeight: 400, letterSpacing: '-0.01em',
        }}>{orden.descripcion}</h2>
        <Space size={8}>
          {t && <QPill tone={TIPO_TONE[orden.tipo] || 'muted'}>{t.label}</QPill>}
          {e && <QPill tone={ESTADO_TONE[orden.estado] || 'muted'}>{e.label}</QPill>}
        </Space>
      </div>

      {/* Meta grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1,
        background: 'var(--line-2)', border: '1px solid var(--line-1)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 18,
      }}>
        {[
          { k: 'Equipo', v: orden.equipo
              ? <><div>{orden.equipo.marca} {orden.equipo.modelo}</div>
                  <span className="qmono qmuted" style={{ fontSize: 10.5 }}>{orden.equipo.codigo_inventario}</span></>
              : '—' },
          { k: 'Técnico asignado', v: orden.tecnico
              ? `${orden.tecnico.nombre} ${orden.tecnico.apellido}`
              : <span className="qmuted">Sin asignar</span> },
          { k: 'Fecha programada', v: <span className="qmono">{dayjs(orden.fecha_programada).format('DD/MM/YYYY')}</span> },
          { k: 'Duración', v: orden.duracion_minutos ? `${orden.duracion_minutos} min` : '—' },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', padding: '12px 14px' }}>
            <div style={{
              fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6,
            }}>{m.k}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-1)', fontWeight: 500 }}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* Acción iniciar */}
      {puedeIniciar && (
        <div style={{ marginBottom: 18 }}>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={iniciar}>
            Iniciar mantenimiento
          </Button>
        </div>
      )}

      {/* Checklist */}
      {totalTareas > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{
              fontSize: 11.5, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink-2)',
            }}>Checklist de tareas</span>
            <span className="qmuted qmono" style={{ fontSize: 11 }}>{completadas}/{totalTareas} completadas</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <QProgress value={completadas} max={totalTareas}
              tone={completadas === totalTareas ? 'ok' : 'info'}
              label={`${Math.round((completadas/totalTareas)*100)}%`} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {orden.checklist?.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px',
                background: item.completado ? 'var(--ok-soft)' : 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${item.completado ? '#A6D4B5' : 'var(--line-1)'}`,
              }}>
                <Checkbox checked={item.completado}
                  disabled={!puedeCompletar && !puedeIniciar}
                  onChange={e => toggleChecklist(item, e.target.checked)} />
                <div style={{ flex: 1 }}>
                  <span style={{
                    textDecoration: item.completado ? 'line-through' : 'none',
                    color: item.completado ? 'var(--ink-3)' : 'var(--ink-1)',
                    fontSize: 12.5,
                  }}>{item.tarea}</span>
                  {item.observacion && (
                    <div className="qmuted" style={{ fontSize: 11, marginTop: 2 }}>{item.observacion}</div>
                  )}
                </div>
                {item.completado && <CheckCircleOutlined style={{ color: 'var(--ok)' }} />}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cierre */}
      {puedeCompletar && (
        <>
          <Divider style={{ borderColor: 'var(--line-1)' }}>
            <span style={{
              fontFamily: 'var(--f-display)', fontStyle: 'italic',
              fontSize: 16, color: 'var(--ink-1)',
            }}>Completar orden</span>
          </Divider>
          <Form form={formUpdate} layout="vertical" onFinish={completar}>
            <Form.Item name="trabajos_realizados" label="Trabajos realizados"
              rules={[{ required: true, message: 'Describe los trabajos realizados' }]}>
              <TextArea rows={3} placeholder="Describe detalladamente los trabajos realizados…" />
            </Form.Item>
            <Form.Item name="repuestos_usados" label="Repuestos / insumos utilizados">
              <TextArea rows={2} placeholder="Pasta térmica, ventilador, memoria RAM…" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="costo" label="Costo (S/)">
                  <Input type="number" min={0} prefix="S/" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="proxima_fecha" label="Próximo mantenimiento">
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit" loading={guardando}
              icon={<CheckCircleOutlined />} block>
              Marcar como completado
            </Button>
          </Form>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────
export default function MantenimientoPage() {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats]     = useState({})
  const [equipos, setEquipos] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [cronogramas, setCronogramas] = useState([])
  const [selected, setSelected] = useState(null)
  const [drawerDetalle, setDrawerDetalle] = useState(false)
  const [drawerNuevo, setDrawerNuevo]   = useState(false)
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ords }, { data: dash }] = await Promise.all([
        mantenimientoService.listar({ limit: 500 }),
        mantenimientoService.dashboard(),
      ])
      setOrdenes(ords); setStats(dash)
    } catch { message.error('Error al cargar órdenes') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    cargar()
    inventarioService.listarEquipos({ limit: 500 }).then(({ data }) => setEquipos(data))
    usuarioService.listarTecnicos().then(({ data }) => setTecnicos(data))
    mantenimientoService.cronogramas().then(({ data }) => setCronogramas(data))
  }, [cargar])

  const verDetalle = (orden) => { setSelected(orden); setDrawerDetalle(true) }

  const onActualizar = async () => {
    cargar()
    if (selected) {
      const { data } = await mantenimientoService.obtener(selected.id)
      setSelected(data)
    }
  }

  const crearOrden = async (values) => {
    try {
      await mantenimientoService.crear({
        ...values, fecha_programada: values.fecha_programada.format('YYYY-MM-DD'),
      })
      message.success('Orden de mantenimiento creada')
      setDrawerNuevo(false); form.resetFields(); cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const generarPreventivos = async () => {
    try {
      const { data } = await mantenimientoService.generarPreventivos()
      message.success(data.message); cargar()
    } catch { message.error('Error al generar preventivos') }
  }

  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `mantenimiento_${dayjs().format('YYYYMMDD')}.csv`,
  })

  const columnDefs = useMemo(() => [
    { headerName: '', width: 38, checkboxSelection: true, headerCheckboxSelection: true,
      pinned: 'left', suppressMenu: true, sortable: false, filter: false },
    { headerName: 'N°', field: 'numero', width: 145, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <a onClick={() => verDetalle(data)} className="qmono"
           style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{value}</a>
      )},
    { headerName: 'Tipo', field: 'tipo', width: 120,
      filter: 'agSetColumnFilter', cellRenderer: TipoRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: { values: TIPOS_MANTENIMIENTO.map(t => t.value) } },
    { headerName: 'Estado', field: 'estado', width: 130,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: { values: ESTADOS_ORDEN.map(e => e.value) } },
    { headerName: 'Equipo', field: 'equipo', minWidth: 220, filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.equipo
        ? `${p.data.equipo.marca} ${p.data.equipo.modelo} (${p.data.equipo.codigo_inventario})` : '—',
      cellRenderer: ({ data }) => data?.equipo ? (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 500 }}>{data.equipo.marca} {data.equipo.modelo}</div>
          <span className="qmono qmuted" style={{ fontSize: 10.5 }}>{data.equipo.codigo_inventario}</span>
        </div>
      ) : '—'},
    { headerName: 'Técnico', field: 'tecnico', minWidth: 160, filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.tecnico
        ? `${p.data.tecnico.nombre} ${p.data.tecnico.apellido}` : '—' },
    { headerName: 'F. Programada', field: 'fecha_programada', width: 150,
      filter: 'agDateColumnFilter', cellRenderer: FechaRenderer },
    { headerName: 'Checklist', field: 'checklist', width: 150,
      filter: false, cellStyle: { overflow: 'visible' },
      cellRenderer: ChecklistRenderer },
    { headerName: 'Origen', field: 'origen', width: 110,
      filter: 'agSetColumnFilter', cellRenderer: OrigenRenderer,
      cellStyle: { overflow: 'visible' } },
    { headerName: '', width: 70, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Ver / Ejecutar">
          <Button size="small" icon={<EditOutlined />} type="text"
            style={{ color: 'var(--ink-2)' }} onClick={() => verDetalle(data)} />
        </Tooltip>
      )},
  ], [])

  const getRowStyle = ({ data }) => {
    if (data?.estado === 'programado' && dayjs(data.fecha_programada).isBefore(dayjs(), 'day'))
      return { background: 'rgba(168,32,26,0.05)' }
    if (data?.estado === 'en_proceso')
      return { background: 'rgba(180,83,9,0.05)' }
    return {}
  }

  return (
    <div>
      <QPageHeader
        eyebrow="Activos TI · mantenimiento"
        title="Órdenes de"
        titleEm="mantenimiento"
        subtitle={`${stats.total ?? 0} órdenes registradas · ${stats.programados ?? 0} programadas · ${stats.proximos_7_dias ?? 0} próximas a vencer`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading}>Actualizar</Button>
            <Button icon={<ExportOutlined />} onClick={exportar}>CSV</Button>
            {esJefe && (
              <Popconfirm
                title="¿Generar órdenes preventivas automáticas para todos los equipos activos?"
                onConfirm={generarPreventivos}>
                <Button icon={<ThunderboltOutlined />}>Generar preventivos</Button>
              </Popconfirm>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerNuevo(true)}>
              Nueva orden
            </Button>
          </Space>
        }
      />

      {stats.vencidos > 0 && (
        <Alert className="qalert" type="error" showIcon icon={<WarningOutlined />}
          message={`${stats.vencidos} orden(es) vencidas sin ejecutar`} />
      )}

      <QKpiRow items={[
        { lbl: 'Total',          val: stats.total ?? 0 },
        { lbl: 'Programados',    val: stats.programados ?? 0,    tone: 'info' },
        { lbl: 'En proceso',     val: stats.en_proceso ?? 0,     tone: 'warn' },
        { lbl: 'Completados mes',val: stats.completados_mes ?? 0,tone: 'ok'   },
        { lbl: 'Próx. 7 días',   val: stats.proximos_7_dias ?? 0,tone: 'plum' },
        { lbl: 'Preventivos',    val: stats.preventivos ?? 0,    tone: 'info' },
        { lbl: 'Correctivos',    val: stats.correctivos ?? 0,    tone: 'warn' },
        { lbl: 'Vencidos',       val: stats.vencidos ?? 0,
          tone: stats.vencidos > 0 ? 'crit' : 'ok' },
      ]} />

      <div className="qtoolbar">
        <div className="qinput-wrap">
          <SearchOutlined />
          <input className="qinput" placeholder="Buscar en todos los campos…"
            onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)} />
        </div>
        <span style={{ marginLeft: 'auto' }} className="qmuted qmono">{ordenes.length} órdenes</span>
      </div>

      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef} rowData={ordenes} columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={44} headerHeight={36}
          getRowId={p => String(p.data.id)}
          getRowStyle={getRowStyle}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      <Drawer
        title={selected ? <QDrawerTitle icon={<ToolOutlined />}>{selected.numero}</QDrawerTitle> : 'Detalle'}
        open={drawerDetalle} onClose={() => setDrawerDetalle(false)} width={640}
        styles={{
          body: { padding: '20px 26px', background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <DrawerDetalle orden={selected} onClose={() => setDrawerDetalle(false)} onActualizar={onActualizar} />
      </Drawer>

      <Drawer
        title={<QDrawerTitle icon={<PlusOutlined />}>Nueva orden de mantenimiento</QDrawerTitle>}
        open={drawerNuevo}
        onClose={() => { setDrawerNuevo(false); form.resetFields() }}
        width={540}
        styles={{
          body: { padding: 0, background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={crearOrden}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="qform-section-h"><ToolOutlined /> Datos de la orden</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                    <Select>
                      {TIPOS_MANTENIMIENTO.map(t => (
                        <Option key={t.value} value={t.value}>{t.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fecha_programada" label="Fecha programada" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="equipo_id" label="Equipo" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children"
                  placeholder="Buscar por código o modelo…">
                  {equipos.map(e => (
                    <Option key={e.id} value={e.id}>
                      {e.codigo_inventario} – {e.marca} {e.modelo}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="tecnico_id" label="Técnico responsable">
                <Select allowClear placeholder="Sin asignar">
                  {tecnicos.map(t => <Option key={t.id} value={t.id}>{t.nombre} {t.apellido}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="descripcion" label="Descripción / motivo" rules={[{ required: true }]}>
                <TextArea rows={3} placeholder="Describe el trabajo a realizar…" />
              </Form.Item>
              <Form.Item name="cronograma_id" label="Cronograma base (opcional)" style={{ marginBottom: 6 }}>
                <Select allowClear placeholder="Sin cronograma">
                  {cronogramas.map(c => <Option key={c.id} value={c.id}>{c.nombre}</Option>)}
                </Select>
              </Form.Item>
            </div>
          </div>
          <div className="qform-footer">
            <Button onClick={() => { setDrawerNuevo(false); form.resetFields() }}>Cancelar</Button>
            <Button type="primary" htmlType="submit">Crear orden</Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}
