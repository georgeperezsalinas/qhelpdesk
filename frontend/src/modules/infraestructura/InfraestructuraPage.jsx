import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Badge, Card, Statistic, Row, Col,
  Tabs, Drawer, Form, Input, Select, InputNumber,
  Tooltip, Typography, message, Alert, Table, Divider,
} from 'antd'
import {
  ReloadOutlined, PlusOutlined, EditOutlined, ExportOutlined,
  DatabaseOutlined, WifiOutlined, HddOutlined, WarningOutlined,
} from '@ant-design/icons'
import KpiStrip from '../../components/common/KpiStrip'
import dayjs from 'dayjs'
import {
  infraestructuraService, ESTADOS_SERVICIO, TIPOS_SERVIDOR,
  TIPOS_DISPOSITIVO, getEstado,
} from '../../services/infraestructuraService'
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

const TipoServidorRenderer = ({ value }) => {
  const colores = { fisico: 'blue', virtual: 'purple', nube: 'cyan' }
  return <Tag color={colores[value] || 'default'}>{value}</Tag>
}

// ── TAB SERVIDORES ────────────────────────────────────────────────────────────
function TabServidores({ tecnicos, sedes }) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [servidores,  setServidores]  = useState([])
  const [loading,     setLoading]     = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [drawerForm,  setDrawerForm]  = useState(false)
  const [drawerDetalle, setDrawerDetalle] = useState(false)
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await infraestructuraService.listarServidores()
      setServidores(data)
    } catch { message.error('Error al cargar servidores') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => {
    setSelected(null)
    form.resetFields()
    form.setFieldsValue({ tipo: 'fisico', estado: 'operativo' })
    setDrawerForm(true)
  }

  const abrirEditar = (s) => {
    setSelected(s)
    form.setFieldsValue(s)
    setDrawerForm(true)
  }

  const guardar = async (values) => {
    try {
      if (selected) {
        await infraestructuraService.actualizarServidor(selected.id, values)
        message.success('Servidor actualizado')
      } else {
        await infraestructuraService.crearServidor(values)
        message.success('Servidor registrado')
      }
      setDrawerForm(false)
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const columnDefs = useMemo(() => [
    { headerName: 'Nombre', field: 'nombre', minWidth: 200, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <a onClick={() => { setSelected(data); setDrawerDetalle(true) }}
           style={{ fontWeight: 500 }}>{value}</a>
      )},
    { headerName: 'Hostname', field: 'hostname', minWidth: 160,
      filter: 'agTextColumnFilter',
      cellRenderer: ({ data }) => (
        <div>
          <Text code style={{ fontSize: 11 }}>{data?.hostname || '—'}</Text>
          {data?.ip_gestion && (
            <div style={{ fontSize: 11, color: '#888' }}>{data.ip_gestion}</div>
          )}
        </div>
      )},
    { headerName: 'Tipo', field: 'tipo', width: 100,
      filter: 'agSetColumnFilter', cellRenderer: TipoServidorRenderer,
      filterParams: { values: TIPOS_SERVIDOR.map(t => t.value) } },
    { headerName: 'SO', field: 'sistema_operativo', minWidth: 140,
      filter: 'agTextColumnFilter',
      valueGetter: p => `${p.data?.sistema_operativo || ''} ${p.data?.version_so || ''}`.trim() },
    { headerName: 'CPU/RAM', field: 'cpu_nucleos', width: 110,
      filter: false,
      valueGetter: p => `${p.data?.cpu_nucleos || '—'} núcleos / ${p.data?.ram_gb || '—'} GB` },
    { headerName: 'Disco', field: 'disco_total_tb', width: 90,
      filter: 'agNumberColumnFilter',
      valueFormatter: p => p.value ? `${p.value} TB` : '—' },
    { headerName: 'Servicios', field: 'servicios', minWidth: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => value
        ? <Text style={{ fontSize: 11 }}>{value}</Text>
        : <Text type="secondary">—</Text> },
    { headerName: 'Estado', field: 'estado', width: 140,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      filterParams: { values: ESTADOS_SERVICIO.map(e => e.value) } },
    { headerName: 'Sede', field: 'sede', width: 140,
      filter: 'agSetColumnFilter',
      valueGetter: p => p.data?.sede?.nombre || '—' },
    { headerName: 'BDs', field: 'bases_datos', width: 70,
      filter: false,
      valueGetter: p => p.data?.bases_datos?.length || 0,
      cellRenderer: ({ value }) => (
        <Tag color={value > 0 ? 'blue' : 'default'}>{value}</Tag>
      )},
    { headerName: 'Acciones', width: 90, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Editar estado">
          <Button size="small" type="text" icon={<EditOutlined />}
            onClick={() => abrirEditar(data)} disabled={!esJefe} />
        </Tooltip>
      )},
  ], [esJefe])

  const defaultColDef = useMemo(() => ({
  }), [])

  // Columnas de bases de datos para el detalle
  const colsBD = [
    { title: 'Base de datos', dataIndex: 'nombre', key: 'n',
      render: (v, r) => <><Text strong>{v}</Text><br/>
        <Text type="secondary" style={{ fontSize: 11 }}>{r.sistema_info}</Text></> },
    { title: 'Motor', dataIndex: 'motor', width: 110, key: 'm',
      render: v => <Tag color="blue">{v}</Tag> },
    { title: 'Puerto', dataIndex: 'puerto', width: 80, key: 'p' },
    { title: 'Tamaño', dataIndex: 'tamanio_gb', width: 90, key: 't',
      render: v => v ? `${v} GB` : '—' },
    { title: 'Estado', dataIndex: 'activa', width: 90, key: 'e',
      render: v => <Badge status={v ? 'success' : 'error'} text={v ? 'Activa' : 'Inactiva'} /> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading} />
          <Button icon={<ExportOutlined />}
            onClick={() => gridRef.current?.api.exportDataAsCsv({ fileName: 'servidores.csv' })}>
            CSV
          </Button>
          {esJefe && (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Registrar servidor
            </Button>
          )}
        </Space>
      </div>

      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef} rowData={servidores} columnDefs={columnDefs}
          defaultColDef={defaultColDef} {...defaultGridOptions}
          loading={loading} rowHeight={52} headerHeight={40}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.estado === 'fuera')    return { background: '#fff1f0' }
            if (data?.estado === 'degradado') return { background: '#fffbe6' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Drawer Detalle */}
      <Drawer
        title={selected?.nombre}
        open={drawerDetalle} onClose={() => setDrawerDetalle(false)} width={620}
      >
        {selected && (
          <div>
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Estado"
                    value={getEstado(selected.estado)?.label || selected.estado}
                    valueStyle={{ fontSize: 14,
                      color: selected.estado === 'fuera' ? '#ff4d4f' :
                             selected.estado === 'degradado' ? '#fa8c16' : '#52c41a' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="CPU / RAM"
                    value={`${selected.cpu_nucleos || '—'} núcleos / ${selected.ram_gb || '—'} GB`}
                    valueStyle={{ fontSize: 12 }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Disco total"
                    value={selected.disco_total_tb ? `${selected.disco_total_tb} TB` : '—'}
                    valueStyle={{ fontSize: 14 }} />
                </Card>
              </Col>
            </Row>

            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Hostname</Text>
                  <div><Text code>{selected.hostname || '—'}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>IP de gestión</Text>
                  <div><Text code>{selected.ip_gestion || '—'}</Text></div>
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Sistema operativo</Text>
                  <div>{selected.sistema_operativo} {selected.version_so}</div>
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Rack / Ubicación</Text>
                  <div>{selected.rack || '—'}</div>
                </Col>
                <Col span={24} style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Servicios activos</Text>
                  <div>{selected.servicios || '—'}</div>
                </Col>
              </Row>
            </Card>

            {selected.bases_datos?.length > 0 && (
              <>
                <Divider>Bases de datos ({selected.bases_datos.length})</Divider>
                <Table
                  dataSource={selected.bases_datos} columns={colsBD}
                  rowKey="id" size="small" pagination={false} />
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* Drawer Crear/Editar */}
      <Drawer
        title={selected ? `Editar: ${selected.nombre}` : 'Registrar servidor'}
        open={drawerForm} onClose={() => setDrawerForm(false)} width={520}
        extra={<Button type="primary" onClick={() => form.submit()}>
          {selected ? 'Guardar' : 'Registrar'}
        </Button>}
      >
        <Form form={form} layout="vertical" onFinish={guardar}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Servidor BD Principal" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="hostname" label="Hostname">
                <Input placeholder="SRV-BD-01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ip_gestion" label="IP de gestión">
                <Input placeholder="192.168.1.10" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo">
                <Select>
                  {TIPOS_SERVIDOR.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estado" label="Estado">
                <Select>
                  {ESTADOS_SERVICIO.map(e => <Option key={e.value} value={e.value}>{e.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sistema_operativo" label="Sistema operativo">
                <Input placeholder="Ubuntu Server" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="version_so" label="Versión">
                <Input placeholder="22.04 LTS" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="cpu_nucleos" label="CPU (núcleos)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ram_gb" label="RAM (GB)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="disco_total_tb" label="Disco (TB)">
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sede_id" label="Sede">
                <Select allowClear>
                  {sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rack" label="Rack">
                <Input placeholder="RACK-A-01" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="servicios" label="Servicios activos">
            <Input placeholder="PostgreSQL, Apache, Exchange..." />
          </Form.Item>
          <Form.Item name="responsable_id" label="Responsable">
            <Select allowClear>
              {tecnicos.map(t => <Option key={t.id} value={t.id}>{t.nombre} {t.apellido}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

// ── TAB DISPOSITIVOS DE RED ───────────────────────────────────────────────────
function TabDispositivos({ sedes }) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [dispositivos, setDispositivos] = useState([])
  const [loading,      setLoading]      = useState(false)
  const [drawerForm,   setDrawerForm]   = useState(false)
  const [editando,     setEditando]     = useState(null)
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await infraestructuraService.listarDispositivos()
      setDispositivos(data)
    } catch { message.error('Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async (values) => {
    try {
      if (editando) {
        await infraestructuraService.actualizarDispositivo(editando.id, values)
        message.success('Actualizado')
      } else {
        await infraestructuraService.crearDispositivo(values)
        message.success('Registrado')
      }
      setDrawerForm(false)
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const columnDefs = useMemo(() => [
    { headerName: 'Nombre', field: 'nombre', minWidth: 200, pinned: 'left',
      filter: 'agTextColumnFilter' },
    { headerName: 'Tipo', field: 'tipo', width: 120,
      filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => {
        const colores = { switch:'blue', router:'green', firewall:'red',
                          access_point:'cyan', vpn:'purple', otro:'default' }
        return <Tag color={colores[value] || 'default'}>{value}</Tag>
      },
      filterParams: { values: TIPOS_DISPOSITIVO.map(t => t.value) } },
    { headerName: 'Marca / Modelo', field: 'marca', minWidth: 160,
      filter: 'agTextColumnFilter',
      valueGetter: p => `${p.data?.marca || ''} ${p.data?.modelo || ''}`.trim() },
    { headerName: 'IP gestión', field: 'ip_gestion', width: 140,
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => value ? <Text code style={{ fontSize: 11 }}>{value}</Text> : '—' },
    { headerName: 'Firmware', field: 'firmware', width: 100,
      filter: 'agTextColumnFilter' },
    { headerName: 'Ubicación', field: 'ubicacion', minWidth: 160,
      filter: 'agTextColumnFilter' },
    { headerName: 'Estado', field: 'estado', width: 140,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      filterParams: { values: ESTADOS_SERVICIO.map(e => e.value) } },
    { headerName: 'Sede', field: 'sede', width: 140,
      filter: 'agSetColumnFilter',
      valueGetter: p => p.data?.sede?.nombre || '—' },
    { headerName: 'Acciones', width: 90, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Button size="small" type="text" icon={<EditOutlined />}
          onClick={() => { setEditando(data); form.setFieldsValue(data); setDrawerForm(true) }}
          disabled={!esJefe} />
      )},
  ], [esJefe])

  const defaultColDef = useMemo(() => ({
  }), [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading} />
          {esJefe && (
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditando(null); form.resetFields();
                form.setFieldsValue({ tipo: 'switch', estado: 'operativo' });
                setDrawerForm(true) }}>
              Registrar dispositivo
            </Button>
          )}
        </Space>
      </div>

      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef} rowData={dispositivos} columnDefs={columnDefs}
          defaultColDef={defaultColDef} {...defaultGridOptions}
          loading={loading} rowHeight={44} headerHeight={40}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.estado === 'fuera')    return { background: '#fff1f0' }
            if (data?.estado === 'degradado') return { background: '#fffbe6' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      <Drawer
        title={editando ? `Editar: ${editando.nombre}` : 'Registrar dispositivo'}
        open={drawerForm} onClose={() => setDrawerForm(false)} width={480}
        extra={<Button type="primary" onClick={() => form.submit()}>
          {editando ? 'Guardar' : 'Registrar'}
        </Button>}
      >
        <Form form={form} layout="vertical" onFinish={guardar}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Firewall perimetral" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  {TIPOS_DISPOSITIVO.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estado" label="Estado">
                <Select>
                  {ESTADOS_SERVICIO.map(e => <Option key={e.value} value={e.value}>{e.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="marca" label="Marca">
                <Input placeholder="Cisco, Fortinet..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="modelo" label="Modelo">
                <Input placeholder="ASA 5506-X" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ip_gestion" label="IP gestión">
                <Input placeholder="192.168.1.1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="firmware" label="Firmware">
                <Input placeholder="7.4.1" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sede_id" label="Sede">
                <Select allowClear>
                  {sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ubicacion" label="Ubicación">
                <Input placeholder="Rack-A, Piso 1" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="serie" label="N° de serie">
            <Input />
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function InfraestructuraPage() {
  const [stats,   setStats]   = useState({})
  const [tecnicos, setTecnicos] = useState([])
  const [sedes,   setSedes]   = useState([])

  useEffect(() => {
    infraestructuraService.dashboard().then(({ data }) => setStats(data))
    usuarioService.listarTecnicos().then(({ data }) => setTecnicos(data))
    import('../../services/api').then(({ default: api }) =>
      api.get('/sedes/').then(({ data }) => setSedes(data)).catch(() => {})
    )
  }, [])

  const tabs = [
    {
      key: 'servidores',
      label: <span><HddOutlined /> Servidores ({stats.total_servidores || 0})</span>,
      children: <TabServidores tecnicos={tecnicos} sedes={sedes} />,
    },
    {
      key: 'dispositivos',
      label: <span><WifiOutlined /> Red ({stats.total_dispositivos || 0})</span>,
      children: <TabDispositivos sedes={sedes} />,
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <DatabaseOutlined style={{ marginRight: 8 }} />Infraestructura
      </Title>

      {/* Alertas */}
      {(stats.servidores_fuera > 0 || stats.dispositivos_con_problema > 0) && (
        <Alert type="error" showIcon icon={<WarningOutlined />} style={{ marginBottom: 12 }}
          message={`Problema detectado: ${stats.servidores_fuera || 0} servidor(es) fuera de línea, ${stats.dispositivos_con_problema || 0} dispositivo(s) con problema`} />
      )}

      {/* Stats */}
      <KpiStrip items={[
        { label: 'Servidores',      value: stats.total_servidores,         color: '#64748b'  },
        { label: 'Operativos',      value: stats.servidores_operativos,    color: '#22c55e'  },
        { label: 'Degradados',      value: stats.servidores_degradados,    color: '#f59e0b'  },
        { label: 'Fuera',           value: stats.servidores_fuera,         color: stats.servidores_fuera > 0 ? '#ef4444' : '#22c55e' },
        { label: 'Dispositivos red',value: stats.total_dispositivos,       color: '#64748b'  },
        { label: 'Red operativa',   value: stats.dispositivos_operativos,  color: '#22c55e'  },
        { label: 'Red con problema',value: stats.dispositivos_con_problema,color: stats.dispositivos_con_problema > 0 ? '#ef4444' : '#22c55e' },
        { label: 'Bases de datos',  value: stats.bases_datos_activas,      color: '#1677ff'  },
      ]} />

      <Tabs items={tabs} defaultActiveKey="servidores" />
    </div>
  )
}
