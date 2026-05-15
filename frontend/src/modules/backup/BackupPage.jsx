import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Badge, Card, Statistic, Row, Col,
  Tabs, Drawer, Form, Input, Select, Modal, Tooltip,
  Typography, message, Alert, Progress, Divider, Switch,
} from 'antd'
import {
  ReloadOutlined, ExportOutlined, CheckCircleOutlined,
  CloseCircleOutlined, CloudServerOutlined, PlusOutlined,
  SafetyOutlined, WarningOutlined,
} from '@ant-design/icons'
import KpiStrip from '../../components/common/KpiStrip'
import dayjs from 'dayjs'
import {
  backupService, ESTADOS_BACKUP, TIPOS_BACKUP, FRECUENCIAS, getEstado,
} from '../../services/backupService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

// ── CELL RENDERERS ─────────────────────────────────────────────────────────────
const EstadoRenderer = ({ value }) => {
  const e = getEstado(value)
  return e ? <Badge status={e.color} text={e.label} /> : value
}

const TamanioRenderer = ({ value }) =>
  value ? <Text>{value} GB</Text> : <Text type="secondary">—</Text>

const DuracionRenderer = ({ data }) => {
  if (!data?.duracion_minutos) return <Text type="secondary">—</Text>
  const h = Math.floor(data.duracion_minutos / 60)
  const m = data.duracion_minutos % 60
  return <Text>{h > 0 ? `${h}h ` : ''}{m}min</Text>
}

const VerificadoRenderer = ({ data }) => {
  if (!data) return null
  if (data.estado !== 'exitoso') return <Text type="secondary">N/A</Text>
  return data.verificado
    ? <Tag color="green" icon={<CheckCircleOutlined />}>Verificado</Tag>
    : <Tag color="orange">Pendiente</Tag>
}

const UltimoEstadoRenderer = ({ data }) => {
  if (!data?.ultimo_estado) return <Text type="secondary">Sin ejecuciones</Text>
  const e = getEstado(data.ultimo_estado)
  return (
    <Space>
      <Badge status={e?.color} />
      <Text>{e?.label}</Text>
      {data.ultima_ejecucion && (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {dayjs(data.ultima_ejecucion).fromNow()}
        </Text>
      )}
    </Space>
  )
}

// ── TAB POLÍTICAS ──────────────────────────────────────────────────────────────
const TabPoliticas = forwardRef(function TabPoliticas({ tecnicos, onSeleccionarPolitica }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [politicas,  setPoliticas]  = useState([])
  const [loading,    setLoading]    = useState(false)
  const [drawerForm, setDrawerForm] = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await backupService.listarPoliticas()
      setPoliticas(data)
    } catch { message.error('Error al cargar políticas') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => {
    setEditando(null)
    form.resetFields()
    form.setFieldsValue({ retencion_dias: 30, tipo: 'full', frecuencia: 'diario' })
    setDrawerForm(true)
  }

  useImperativeHandle(ref, () => ({ reload: cargar, openNew: abrirNuevo }), [cargar])

  const abrirEditar = (p) => {
    setEditando(p)
    form.setFieldsValue({
      ...p,
      hora_ejecucion: p.hora_ejecucion ? dayjs(`2000-01-01T${p.hora_ejecucion}`) : null,
    })
    setDrawerForm(true)
  }

  const guardar = async (values) => {
    const payload = {
      ...values,
      hora_ejecucion: values.hora_ejecucion
        ? dayjs(values.hora_ejecucion).format('HH:mm:ss')
        : null,
    }
    try {
      if (editando) {
        await backupService.actualizarPolitica(editando.id, payload)
        message.success('Política actualizada')
      } else {
        await backupService.crearPolitica(payload)
        message.success('Política creada')
      }
      setDrawerForm(false)
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const toggleActiva = async (p) => {
    try {
      await backupService.actualizarPolitica(p.id, { activa: !p.activa })
      message.success(p.activa ? 'Política desactivada' : 'Política activada')
      cargar()
    } catch { message.error('Error') }
  }

  const columnDefs = useMemo(() => [
    { headerName: 'Nombre', field: 'nombre', minWidth: 220, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <a onClick={() => onSeleccionarPolitica(data)}
           style={{ fontWeight: 500 }}>{value}</a>
      )},
    { headerName: 'Servidor', field: 'servidor', minWidth: 160,
      filter: 'agTextColumnFilter' },
    { headerName: 'Tipo', field: 'tipo', width: 120,
      filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => <Tag>{value}</Tag>,
      filterParams: { values: TIPOS_BACKUP.map(t => t.value) } },
    { headerName: 'Frecuencia', field: 'frecuencia', width: 110,
      filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => <Tag color="blue">{value}</Tag> },
    { headerName: 'Retención', field: 'retencion_dias', width: 100,
      filter: 'agNumberColumnFilter',
      valueFormatter: p => `${p.value} días` },
    { headerName: 'Total', field: 'total_ejecuciones', width: 80,
      filter: 'agNumberColumnFilter' },
    { headerName: 'Exitosas', field: 'exitosas', width: 90,
      filter: 'agNumberColumnFilter',
      cellRenderer: ({ value, data }) => {
        const total = data?.total_ejecuciones || 0
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return (
          <Space>
            <Text style={{ color: '#52c41a' }}>{value}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>({pct}%)</Text>
          </Space>
        )
      }},
    { headerName: 'Fallidas', field: 'fallidas', width: 90,
      filter: 'agNumberColumnFilter',
      cellRenderer: ({ value }) => (
        <Text style={{ color: value > 0 ? '#ff4d4f' : undefined }}>{value}</Text>
      )},
    { headerName: 'Última ejecución', field: 'ultimo_estado', minWidth: 200,
      filter: false, cellRenderer: UltimoEstadoRenderer },
    { headerName: 'Activa', field: 'activa', width: 90,
      filter: 'agSetColumnFilter',
      cellRenderer: ({ data }) => (
        <Switch checked={data?.activa} size="small"
          onChange={() => toggleActiva(data)} disabled={!esJefe} />
      )},
    { headerName: 'Acciones', width: 90, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Editar">
          <Button size="small" type="text" onClick={() => abrirEditar(data)}
            disabled={!esJefe}>✏️</Button>
        </Tooltip>
      )},
  ], [esJefe])

  const defaultColDef = useMemo(() => ({
  }), [])

  return (
    <div>
      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef} rowData={politicas} columnDefs={columnDefs}
          defaultColDef={defaultColDef} {...defaultGridOptions}
          loading={loading} rowHeight={44} headerHeight={40}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.fallidas > 0 && data?.ultimo_estado === 'fallido')
              return { background: '#fff1f0' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      <Drawer
        title={editando ? `Editar: ${editando.nombre}` : 'Nueva política de backup'}
        open={drawerForm} onClose={() => setDrawerForm(false)} width={520}
        extra={<Button type="primary" onClick={() => form.submit()}>
          {editando ? 'Guardar' : 'Crear'}
        </Button>}
      >
        <Form form={form} layout="vertical" onFinish={guardar}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Backup BD SIAF – diario" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="servidor" label="Servidor origen" rules={[{ required: true }]}>
                <Input placeholder="SRV-BD-01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  {TIPOS_BACKUP.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="ruta_origen" label="Ruta origen" rules={[{ required: true }]}>
            <Input placeholder="/var/lib/postgresql/siaf" />
          </Form.Item>
          <Form.Item name="ruta_destino" label="Ruta destino" rules={[{ required: true }]}>
            <Input placeholder="//NAS-BACKUP/siaf/daily" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="frecuencia" label="Frecuencia" rules={[{ required: true }]}>
                <Select>
                  {FRECUENCIAS.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="retencion_dias" label="Retención (días)" initialValue={30}>
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="responsable_id" label="Responsable">
            <Select allowClear placeholder="Sin asignar">
              {tecnicos.map(t => (
                <Option key={t.id} value={t.id}>{t.nombre} {t.apellido}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
})

// ── TAB EJECUCIONES ────────────────────────────────────────────────────────────
const TabEjecuciones = forwardRef(function TabEjecuciones({ politicaFiltro }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [ejecuciones, setEjecuciones] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [modalVerif,  setModalVerif]  = useState(null)
  const [formVerif]   = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 200 }
      if (politicaFiltro) params.politica_id = politicaFiltro
      const { data } = await backupService.listarEjecuciones(params)
      setEjecuciones(data)
    } catch { message.error('Error al cargar ejecuciones') }
    finally  { setLoading(false) }
  }, [politicaFiltro])

  useEffect(() => { cargar() }, [cargar])

  const verificar = async (values) => {
    try {
      await backupService.verificar(modalVerif.id, {
        resultado: values.resultado,
        exitosa:   values.exitosa,
      })
      message.success('Verificación registrada')
      setModalVerif(null)
      formVerif.resetFields()
      cargar()
    } catch { message.error('Error') }
  }

  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `ejecuciones_backup_${dayjs().format('YYYYMMDD')}.csv`,
  })

  useImperativeHandle(ref, () => ({ reload: cargar, exportar }), [cargar])

  const columnDefs = useMemo(() => [
    { headerName: 'Estado', field: 'estado', width: 130,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      filterParams: { values: ESTADOS_BACKUP.map(e => e.value) }, pinned: 'left' },
    { headerName: 'Inicio', field: 'inicio', minWidth: 160,
      filter: 'agDateColumnFilter', sort: 'desc',
      valueFormatter: p => p.value ? dayjs(p.value).format('DD/MM/YY HH:mm') : '—' },
    { headerName: 'Fin', field: 'fin', width: 140,
      filter: 'agDateColumnFilter',
      valueFormatter: p => p.value ? dayjs(p.value).format('DD/MM/YY HH:mm') : '—' },
    { headerName: 'Duración', field: 'duracion_minutos', width: 100,
      filter: false, cellRenderer: DuracionRenderer },
    { headerName: 'Tamaño', field: 'tamanio_gb', width: 100,
      filter: 'agNumberColumnFilter', cellRenderer: TamanioRenderer },
    { headerName: 'Archivos', field: 'archivos_total', width: 100,
      filter: 'agNumberColumnFilter',
      valueFormatter: p => p.value ? p.value.toLocaleString() : '—' },
    { headerName: 'Verificación', field: 'verificado', width: 140,
      filter: false, cellRenderer: VerificadoRenderer },
    { headerName: 'Log', field: 'log', minWidth: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => (
        <Tooltip title={value}>
          <Text ellipsis style={{ fontSize: 11, color: '#888' }}>{value}</Text>
        </Tooltip>
      )},
    { headerName: 'Acciones', width: 110, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        data?.estado === 'exitoso' && !data?.verificado && esJefe
          ? <Button size="small" icon={<SafetyOutlined />} type="primary" ghost
              onClick={() => { setModalVerif(data); formVerif.setFieldsValue({ exitosa: true }) }}>
              Verificar
            </Button>
          : data?.verificado
            ? <Tag color="green" style={{ fontSize: 10 }}>✓ Verificado</Tag>
            : null
      )},
  ], [esJefe])

  const defaultColDef = useMemo(() => ({
  }), [])

  return (
    <div>
      {politicaFiltro && (
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="Filtrando por política seleccionada"
          action={<Button size="small" onClick={() => {}}>Ver todas</Button>} />
      )}

      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef} rowData={ejecuciones} columnDefs={columnDefs}
          defaultColDef={defaultColDef} {...defaultGridOptions}
          loading={loading} rowHeight={44} headerHeight={40}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.estado === 'fallido') return { background: '#fff1f0' }
            if (data?.estado === 'exitoso' && !data?.verificado) return { background: '#fffbe6' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Modal verificación */}
      <Modal
        title="Registrar verificación de backup"
        open={!!modalVerif}
        onCancel={() => { setModalVerif(null); formVerif.resetFields() }}
        onOk={() => formVerif.submit()}
        okText="Registrar verificación"
      >
        {modalVerif && (
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message={`Backup del ${dayjs(modalVerif.inicio).format('DD/MM/YYYY HH:mm')}`}
            description={`Tamaño: ${modalVerif.tamanio_gb} GB · Archivos: ${modalVerif.archivos_total?.toLocaleString()}`}
          />
        )}
        <Form form={formVerif} layout="vertical" onFinish={verificar}>
          <Form.Item name="exitosa" label="Resultado de la verificación"
            valuePropName="checked" initialValue={true}>
            <Select>
              <Option value={true}>✅ Verificación exitosa – datos íntegros</Option>
              <Option value={false}>❌ Verificación fallida – datos corruptos o incompletos</Option>
            </Select>
          </Form.Item>
          <Form.Item name="resultado" label="Observaciones"
            rules={[{ required: true, message: 'Describe el resultado' }]}>
            <TextArea rows={3}
              placeholder="Ej: Restauración de prueba exitosa en servidor de testing. 1,250 archivos verificados." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
})

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function BackupPage() {
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [stats,          setStats]          = useState({})
  const [tecnicos,       setTecnicos]       = useState([])
  const [politicaFiltro, setPoliticaFiltro] = useState(null)
  const [tabActiva,      setTabActiva]      = useState('politicas')
  const [loading,        setLoading]        = useState(false)

  const politicasRef   = useRef()
  const ejecucionesRef = useRef()
  const activeRef = tabActiva === 'politicas' ? politicasRef : ejecucionesRef

  useEffect(() => {
    backupService.dashboard().then(({ data }) => setStats(data))
    usuarioService.listarTecnicos().then(({ data }) => setTecnicos(data))
  }, [])

  const verEjecucionesDe = (politica) => {
    setPoliticaFiltro(politica.id)
    setTabActiva('ejecuciones')
  }

  const handleReload = () => { activeRef.current?.reload(); setLoading(true); setTimeout(() => setLoading(false), 800) }
  const handleExport = () => activeRef.current?.exportar?.()
  const handleNew    = () => activeRef.current?.openNew?.()

  const tabs = [
    {
      key: 'politicas',
      label: <span><CloudServerOutlined /> Políticas ({stats.total_politicas || 0})</span>,
      children: <TabPoliticas ref={politicasRef} tecnicos={tecnicos} onSeleccionarPolitica={verEjecucionesDe} />,
    },
    {
      key: 'ejecuciones',
      label: (
        <span>
          📋 Ejecuciones
          {stats.fallidas_semana > 0 && (
            <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>
              {stats.fallidas_semana} fallidas
            </Tag>
          )}
        </span>
      ),
      children: <TabEjecuciones ref={ejecucionesRef} politicaFiltro={politicaFiltro} />,
    },
  ]

  return (
    <div>
      {/* Header con botones al mismo nivel que el título */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          <CloudServerOutlined style={{ marginRight: 8 }} />Backup y continuidad
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            Actualizar
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Exportar CSV
          </Button>
          {esJefe && tabActiva === 'politicas' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>
              Nueva política
            </Button>
          )}
        </Space>
      </div>

      {/* Alertas */}
      {stats.fallidas_semana > 0 && (
        <Alert type="error" showIcon icon={<WarningOutlined />} style={{ marginBottom: 12 }}
          message={`${stats.fallidas_semana} backup(s) fallido(s) en los últimos 7 días`} />
      )}
      {stats.sin_verificar > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          message={`${stats.sin_verificar} backup(s) exitoso(s) sin verificar`} />
      )}

      {/* KPI Strip */}
      <KpiStrip items={[
        { label: 'Políticas activas', value: stats.politicas_activas,  color: '#64748b'  },
        { label: 'Ejecuciones hoy',   value: stats.ejecuciones_hoy,    color: '#64748b'  },
        { label: 'Exitosas hoy',      value: stats.exitosas_hoy,        color: '#22c55e'  },
        { label: 'Fallidas hoy',      value: stats.fallidas_hoy,        color: stats.fallidas_hoy > 0 ? '#ef4444' : '#22c55e' },
        { label: 'Fallidas 7 días',   value: stats.fallidas_semana,     color: stats.fallidas_semana > 0 ? '#ef4444' : '#22c55e' },
        { label: 'Sin verificar',     value: stats.sin_verificar,       color: stats.sin_verificar > 0 ? '#f59e0b' : '#22c55e' },
        { label: 'Total almacenado',  value: `${stats.tamanio_total_gb || 0} GB`, color: '#1677ff' },
        { label: 'Tasa éxito 7d',     value: `${stats.tasa_exito_7d || 0}%`,
          color: (stats.tasa_exito_7d || 0) >= 95 ? '#22c55e' : '#ef4444' },
      ]} />

      <Tabs
        activeKey={tabActiva}
        onChange={k => { setTabActiva(k); if (k !== 'ejecuciones') setPoliticaFiltro(null) }}
        items={tabs}
      />
    </div>
  )
}
