import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Badge, Card, Statistic, Row, Col,
  Drawer, Form, Input, Select, DatePicker, Checkbox,
  Tooltip, Typography, message, Divider, Timeline,
  Alert, Progress, Modal, Popconfirm,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, ExportOutlined,
  ToolOutlined, CheckCircleOutlined, PlayCircleOutlined,
  ThunderboltOutlined, CalendarOutlined, WarningOutlined, SearchOutlined,
} from '@ant-design/icons'
import KpiStrip from '../../components/common/KpiStrip'
import dayjs from 'dayjs'
import {
  mantenimientoService, TIPOS_MANTENIMIENTO, ESTADOS_ORDEN, getTipo, getEstado,
} from '../../services/mantenimientoService'
import { inventarioService } from '../../services/inventarioService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

// ── CELL RENDERERS ─────────────────────────────────────────────────────────────
const TipoRenderer = ({ value }) => {
  const t = getTipo(value)
  return t ? <Tag color={t.color}>{t.label}</Tag> : value
}

const EstadoRenderer = ({ value }) => {
  const e = getEstado(value)
  return e ? <Badge status={e.color} text={e.label} /> : value
}

const FechaRenderer = ({ value, data }) => {
  if (!value) return <Text type="secondary">—</Text>
  const fecha = dayjs(value)
  const hoy   = dayjs()
  const vencida = fecha.isBefore(hoy, 'day') && data?.estado === 'programado'
  return (
    <Text style={{ color: vencida ? '#ff4d4f' : undefined }}>
      {vencida && <WarningOutlined style={{ marginRight: 4 }} />}
      {fecha.format('DD/MM/YYYY')}
    </Text>
  )
}

const ChecklistRenderer = ({ data }) => {
  if (!data?.checklist?.length) return <Text type="secondary">—</Text>
  const total     = data.checklist.length
  const completados = data.checklist.filter(c => c.completado).length
  const pct = Math.round((completados / total) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Progress percent={pct} size="small" showInfo={false}
        strokeColor={pct === 100 ? '#52c41a' : '#1677ff'}
        style={{ width: 60, margin: 0 }} />
      <Text style={{ fontSize: 11 }}>{completados}/{total}</Text>
    </div>
  )
}

// ── DRAWER DETALLE / EJECUCIÓN ─────────────────────────────────────────────────
function DrawerDetalle({ orden, onClose, onActualizar, tecnicos }) {
  const [formUpdate] = Form.useForm()
  const [guardando,  setGuardando] = useState(false)

  useEffect(() => {
    if (orden) {
      formUpdate.setFieldsValue({
        estado:    orden.estado,
        tecnico_id: orden.tecnico_id,
        trabajos_realizados: orden.trabajos_realizados,
        repuestos_usados:    orden.repuestos_usados,
        costo: orden.costo,
        proxima_fecha: orden.proxima_fecha ? dayjs(orden.proxima_fecha) : null,
      })
    }
  }, [orden])

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

  if (!orden) return null

  const t = getTipo(orden.tipo)
  const e = getEstado(orden.estado)
  const puedeIniciar   = orden.estado === 'programado'
  const puedeCompletar = orden.estado === 'en_proceso'
  const totalTareas    = orden.checklist?.length || 0
  const completadas    = orden.checklist?.filter(c => c.completado).length || 0

  return (
    <div>
      {/* Cabecera */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text code style={{ fontSize: 12 }}>{orden.numero}</Text>
          <Tag color={t?.color}>{t?.label}</Tag>
          <Badge status={e?.color} text={e?.label} />
        </Space>
        <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500 }}>{orden.descripcion}</div>
      </div>

      {/* Info equipo */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 11 }}>Equipo</Text>
            <div style={{ fontWeight: 500 }}>
              {orden.equipo?.marca} {orden.equipo?.modelo}
            </div>
            <Text code style={{ fontSize: 11 }}>{orden.equipo?.codigo_inventario}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 11 }}>Técnico asignado</Text>
            <div style={{ fontWeight: 500 }}>
              {orden.tecnico
                ? `${orden.tecnico.nombre} ${orden.tecnico.apellido}`
                : <Text type="secondary">Sin asignar</Text>
              }
            </div>
          </Col>
        </Row>
        <Row gutter={12} style={{ marginTop: 8 }}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 11 }}>Fecha programada</Text>
            <div>{dayjs(orden.fecha_programada).format('DD/MM/YYYY')}</div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 11 }}>Duración</Text>
            <div>{orden.duracion_minutos ? `${orden.duracion_minutos} min` : '—'}</div>
          </Col>
        </Row>
      </Card>

      {/* Acciones rápidas */}
      <Space style={{ marginBottom: 16 }}>
        {puedeIniciar && (
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={iniciar}>
            Iniciar mantenimiento
          </Button>
        )}
      </Space>

      {/* Checklist */}
      {totalTareas > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong>Checklist de tareas</Text>
            <Text type="secondary">{completadas}/{totalTareas} completadas</Text>
          </div>
          <Progress
            percent={Math.round((completadas / totalTareas) * 100)}
            style={{ marginBottom: 12 }}
            strokeColor={completadas === totalTareas ? '#52c41a' : '#1677ff'}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {orden.checklist?.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 12px',
                background: item.completado ? '#f6ffed' : '#fafafa',
                borderRadius: 6, border: `1px solid ${item.completado ? '#b7eb8f' : '#f0f0f0'}`,
              }}>
                <Checkbox
                  checked={item.completado}
                  disabled={!puedeCompletar && !puedeIniciar}
                  onChange={e => toggleChecklist(item, e.target.checked)}
                />
                <div style={{ flex: 1 }}>
                  <Text style={{
                    textDecoration: item.completado ? 'line-through' : 'none',
                    color: item.completado ? '#8c8c8c' : undefined,
                  }}>
                    {item.tarea}
                  </Text>
                  {item.observacion && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {item.observacion}
                    </div>
                  )}
                </div>
                {item.completado && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Formulario de cierre */}
      {puedeCompletar && (
        <>
          <Divider>Completar orden</Divider>
          <Form form={formUpdate} layout="vertical" onFinish={completar}>
            <Form.Item name="trabajos_realizados" label="Trabajos realizados"
              rules={[{ required: true, message: 'Describe los trabajos realizados' }]}>
              <TextArea rows={3} placeholder="Describe detalladamente los trabajos realizados..." />
            </Form.Item>
            <Form.Item name="repuestos_usados" label="Repuestos / insumos utilizados">
              <TextArea rows={2} placeholder="Ej: Pasta térmica, ventilador, memoria RAM..." />
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

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function MantenimientoPage() {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [ordenes,    setOrdenes]   = useState([])
  const [loading,    setLoading]   = useState(false)
  const [stats,      setStats]     = useState({})
  const [equipos,    setEquipos]   = useState([])
  const [tecnicos,   setTecnicos]  = useState([])
  const [cronogramas, setCronogramas] = useState([])
  const [selected,   setSelected]  = useState(null)
  const [drawerDetalle, setDrawerDetalle] = useState(false)
  const [drawerNuevo,   setDrawerNuevo]   = useState(false)
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ords }, { data: dash }] = await Promise.all([
        mantenimientoService.listar({ limit: 500 }),
        mantenimientoService.dashboard(),
      ])
      setOrdenes(ords)
      setStats(dash)
    } catch { message.error('Error al cargar órdenes') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    cargar()
    inventarioService.listarEquipos({ limit: 500 }).then(({ data }) => setEquipos(data))
    usuarioService.listarTecnicos().then(({ data }) => setTecnicos(data))
    mantenimientoService.cronogramas().then(({ data }) => setCronogramas(data))
  }, [cargar])

  const verDetalle = (orden) => {
    setSelected(orden)
    setDrawerDetalle(true)
  }

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
        ...values,
        fecha_programada: values.fecha_programada.format('YYYY-MM-DD'),
      })
      message.success('Orden de mantenimiento creada')
      setDrawerNuevo(false)
      form.resetFields()
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const generarPreventivos = async () => {
    try {
      const { data } = await mantenimientoService.generarPreventivos()
      message.success(data.message)
      cargar()
    } catch { message.error('Error al generar preventivos') }
  }

  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `mantenimiento_${dayjs().format('YYYYMMDD')}.csv`,
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
    { headerName: 'Tipo', field: 'tipo', width: 120,
      filter: 'agSetColumnFilter', cellRenderer: TipoRenderer,
      filterParams: { values: TIPOS_MANTENIMIENTO.map(t => t.value) } },
    { headerName: 'Estado', field: 'estado', width: 140,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      filterParams: { values: ESTADOS_ORDEN.map(e => e.value) } },
    { headerName: 'Equipo', field: 'equipo', minWidth: 200,
      filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.equipo
        ? `${p.data.equipo.marca} ${p.data.equipo.modelo} (${p.data.equipo.codigo_inventario})` : '—',
      cellRenderer: ({ data }) => data?.equipo ? (
        <div>
          <div style={{ fontWeight: 500 }}>{data.equipo.marca} {data.equipo.modelo}</div>
          <Text code style={{ fontSize: 10 }}>{data.equipo.codigo_inventario}</Text>
        </div>
      ) : '—'},
    { headerName: 'Técnico', field: 'tecnico', minWidth: 150,
      filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.tecnico
        ? `${p.data.tecnico.nombre} ${p.data.tecnico.apellido}` : '—' },
    { headerName: 'F. Programada', field: 'fecha_programada', width: 150,
      filter: 'agDateColumnFilter', cellRenderer: FechaRenderer },
    { headerName: 'Checklist', field: 'checklist', width: 130,
      filter: false, cellRenderer: ChecklistRenderer },
    { headerName: 'Origen', field: 'origen', width: 110,
      filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => (
        <Tag color={value === 'automatico' ? 'purple' : value === 'ticket' ? 'cyan' : 'default'}>
          {value === 'automatico' ? 'Auto' : value === 'ticket' ? 'Ticket' : 'Manual'}
        </Tag>
      )},
    { headerName: 'Acciones', width: 90, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Ver / Ejecutar">
          <Button size="small" icon={<EditOutlined />} type="text"
            onClick={() => verDetalle(data)} />
        </Tooltip>
      )},
  ], [])

  const defaultColDef = useMemo(() => ({
  }), [])

  const getRowStyle = ({ data }) => {
    if (data?.estado === 'programado' && dayjs(data.fecha_programada).isBefore(dayjs(), 'day'))
      return { background: '#fff1f0' }
    if (data?.estado === 'en_proceso')
      return { background: '#e6f4ff' }
    return {}
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ToolOutlined style={{ marginRight: 8 }} />Mantenimiento
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading} />
          <Button icon={<ExportOutlined />} onClick={exportar}>CSV</Button>
          {esJefe && (
            <Popconfirm
              title="¿Generar órdenes preventivas automáticas para todos los equipos activos?"
              onConfirm={generarPreventivos}
            >
              <Button icon={<ThunderboltOutlined />}>Generar preventivos</Button>
            </Popconfirm>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerNuevo(true)}>
            Nueva orden
          </Button>
        </Space>
      </div>

      {/* Alertas */}
      {stats.vencidos > 0 && (
        <Alert type="error" showIcon style={{ marginBottom: 12 }}
          message={`${stats.vencidos} orden(es) vencidas sin ejecutar`} />
      )}

      {/* Stats */}
      <KpiStrip items={[
        { label: 'Total',          value: stats.total,           color: '#64748b'  },
        { label: 'Programados',    value: stats.programados,     color: '#1677ff'  },
        { label: 'En proceso',     value: stats.en_proceso,      color: '#f59e0b'  },
        { label: 'Completados mes',value: stats.completados_mes, color: '#22c55e'  },
        { label: 'Próximos 7 días',value: stats.proximos_7_dias, color: '#7c3aed'  },
        { label: 'Preventivos',    value: stats.preventivos,     color: '#1677ff'  },
        { label: 'Correctivos',    value: stats.correctivos,     color: '#f59e0b'  },
        { label: 'Vencidos',       value: stats.vencidos,        color: '#ef4444'  },
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
          ref={gridRef} rowData={ordenes} columnDefs={columnDefs}
          defaultColDef={defaultColDef} {...defaultGridOptions}
          loading={loading} rowHeight={50} headerHeight={40}
          getRowId={p => String(p.data.id)}
          getRowStyle={getRowStyle}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Drawer Detalle / Ejecución */}
      <Drawer
        title={selected ? `${selected.numero} – ${selected.tipo}` : 'Detalle'}
        open={drawerDetalle} onClose={() => setDrawerDetalle(false)} width={600}
        styles={{ body: { paddingTop: 16 } }}
      >
        <DrawerDetalle
          orden={selected}
          onClose={() => setDrawerDetalle(false)}
          onActualizar={onActualizar}
          tecnicos={tecnicos}
        />
      </Drawer>

      {/* Drawer Nueva Orden */}
      <Drawer
        title="Nueva orden de mantenimiento"
        open={drawerNuevo}
        onClose={() => { setDrawerNuevo(false); form.resetFields() }}
        width={520}
        extra={<Button type="primary" onClick={() => form.submit()}>Crear orden</Button>}
      >
        <Form form={form} layout="vertical" onFinish={crearOrden}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  {TIPOS_MANTENIMIENTO.map(t => (
                    <Option key={t.value} value={t.value}>
                      <Tag color={t.color} style={{ margin: 0 }}>{t.label}</Tag>
                    </Option>
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
              placeholder="Buscar por código o modelo...">
              {equipos.map(e => (
                <Option key={e.id} value={e.id}>
                  {e.codigo_inventario} – {e.marca} {e.modelo}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="tecnico_id" label="Técnico responsable">
            <Select allowClear placeholder="Sin asignar">
              {tecnicos.map(t => (
                <Option key={t.id} value={t.id}>{t.nombre} {t.apellido}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción / motivo" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Describe el trabajo a realizar..." />
          </Form.Item>
          <Form.Item name="cronograma_id" label="Cronograma base (opcional)">
            <Select allowClear placeholder="Sin cronograma">
              {cronogramas.map(c => (
                <Option key={c.id} value={c.id}>{c.nombre}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
