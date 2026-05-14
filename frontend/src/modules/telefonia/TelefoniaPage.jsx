import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Badge, Card, Statistic, Row, Col,
  Drawer, Form, Input, Select, DatePicker, InputNumber,
  Switch, Tooltip, Typography, message, Alert, Divider,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, ExportOutlined,
  PhoneOutlined, CrownOutlined, StarOutlined, SearchOutlined,
} from '@ant-design/icons'
import KpiStrip from '../../components/common/KpiStrip'
import dayjs from 'dayjs'
import {
  telefoniaService, TIPOS_LINEA, getTipo, formatCurrency,
} from '../../services/telefoniaService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'

const { Title, Text } = Typography
const { Option } = Select

// ── CELL RENDERERS ─────────────────────────────────────────────────────────────
const TipoRenderer = ({ value }) => {
  const t = getTipo(value)
  return t ? <Tag color={t.color}>{t.icon} {t.label}</Tag> : value
}

const DirectivoRenderer = ({ value }) =>
  value ? <Tag color="gold" icon={<CrownOutlined />}>Directivo</Tag> : null

const AsignadoRenderer = ({ data }) => {
  if (!data?.asignado_a) return <Text type="secondary">Sin asignar</Text>
  return (
    <div>
      <div style={{ fontWeight: 500, fontSize: 13 }}>
        {data.asignado_a.nombre} {data.asignado_a.apellido}
      </div>
      {data.asignado_a.cargo && (
        <div style={{ fontSize: 11, color: '#888' }}>{data.asignado_a.cargo}</div>
      )}
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function TelefoniaPage() {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [lineas,    setLineas]    = useState([])
  const [loading,   setLoading]   = useState(false)
  const [stats,     setStats]     = useState({})
  const [usuarios,  setUsuarios]  = useState([])
  const [sedes,     setSedes]     = useState([])
  const [selected,  setSelected]  = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filtroDirectivo, setFiltroDirectivo] = useState(false)
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ls }, { data: dash }] = await Promise.all([
        telefoniaService.listar({ limit: 500 }),
        telefoniaService.dashboard(),
      ])
      setLineas(ls)
      setStats(dash)
    } catch { message.error('Error al cargar líneas') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    cargar()
    usuarioService.listar({ limit: 200 }).then(({ data }) => setUsuarios(data))
    import('../../services/api').then(({ default: api }) =>
      api.get('/sedes/').then(({ data }) => setSedes(data)).catch(() => {})
    )
  }, [cargar])

  const abrirNuevo = () => {
    setSelected(null)
    form.resetFields()
    form.setFieldsValue({ tipo: 'celular', activa: true, es_directivo: false })
    setDrawerOpen(true)
  }

  const abrirEditar = (l) => {
    setSelected(l)
    form.setFieldsValue({
      ...l,
      fecha_asignacion:  l.fecha_asignacion  ? dayjs(l.fecha_asignacion)  : null,
      fecha_vencimiento: l.fecha_vencimiento ? dayjs(l.fecha_vencimiento) : null,
    })
    setDrawerOpen(true)
  }

  const guardar = async (values) => {
    const payload = {
      ...values,
      fecha_asignacion:  values.fecha_asignacion?.format('YYYY-MM-DD')  || null,
      fecha_vencimiento: values.fecha_vencimiento?.format('YYYY-MM-DD') || null,
    }
    try {
      if (selected) {
        await telefoniaService.actualizar(selected.id, payload)
        message.success('Línea actualizada')
      } else {
        await telefoniaService.crear(payload)
        message.success('Línea registrada')
      }
      setDrawerOpen(false)
      form.resetFields()
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `telefonia_${dayjs().format('YYYYMMDD')}.csv`,
  })

  // Líneas filtradas
  const lineasFiltradas = filtroDirectivo
    ? lineas.filter(l => l.es_directivo)
    : lineas

  const columnDefs = useMemo(() => [
    { headerName: '', width: 44, checkboxSelection: true,
      headerCheckboxSelection: true, pinned: 'left',
      suppressMenu: true, sortable: false, filter: false },
    { headerName: 'Número', field: 'numero', width: 150, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <Space>
          {data?.es_directivo && <CrownOutlined style={{ color: '#faad14' }} />}
          <Text strong style={{ fontFamily: 'monospace' }}>{value}</Text>
        </Space>
      )},
    { headerName: 'Tipo', field: 'tipo', width: 120,
      filter: 'agSetColumnFilter', cellRenderer: TipoRenderer,
      filterParams: { values: TIPOS_LINEA.map(t => t.value) } },
    { headerName: 'Asignado a', field: 'asignado_a', minWidth: 200,
      filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.asignado_a
        ? `${p.data.asignado_a.nombre} ${p.data.asignado_a.apellido}` : '—',
      cellRenderer: AsignadoRenderer },
    { headerName: 'Operador', field: 'operador', width: 120,
      filter: 'agSetColumnFilter' },
    { headerName: 'Plan', field: 'plan', minWidth: 160,
      filter: 'agTextColumnFilter' },
    { headerName: 'Costo/mes', field: 'costo_mensual', width: 120,
      filter: 'agNumberColumnFilter',
      valueFormatter: p => formatCurrency(p.value) },
    { headerName: 'Equipo', field: 'equipo_celular', minWidth: 150,
      filter: 'agTextColumnFilter',
      valueFormatter: p => p.value || '—' },
    { headerName: 'Sede', field: 'sede', width: 150,
      filter: 'agSetColumnFilter',
      valueGetter: p => p.data?.sede?.nombre || '—' },
    { headerName: 'F. Asignación', field: 'fecha_asignacion', width: 130,
      filter: 'agDateColumnFilter',
      valueFormatter: p => p.value ? dayjs(p.value).format('DD/MM/YYYY') : '—' },
    { headerName: 'Vencimiento', field: 'fecha_vencimiento', width: 130,
      filter: 'agDateColumnFilter',
      cellRenderer: ({ value }) => {
        if (!value) return <Text type="secondary">—</Text>
        const dias = dayjs(value).diff(dayjs(), 'day')
        if (dias < 0)   return <Tag color="red">Vencido</Tag>
        if (dias <= 30) return <Tag color="orange">{dias}d</Tag>
        return <Text style={{ fontSize: 12 }}>{dayjs(value).format('DD/MM/YYYY')}</Text>
      }},
    { headerName: 'Estado', field: 'activa', width: 100,
      filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => (
        <Badge status={value ? 'success' : 'error'} text={value ? 'Activa' : 'Inactiva'} />
      )},
    { headerName: 'Acciones', width: 90, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Editar">
          <Button size="small" type="text" icon={<EditOutlined />}
            onClick={() => abrirEditar(data)} disabled={!esJefe} />
        </Tooltip>
      )},
  ], [esJefe])

  const defaultColDef = useMemo(() => ({
  }), [])

  // Costo total de directivos
  const costoDirectivos = lineas
    .filter(l => l.es_directivo && l.activa)
    .reduce((acc, l) => acc + (l.costo_mensual || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <PhoneOutlined style={{ marginRight: 8 }} />Telefonía
        </Title>
        <Space>
          <Switch
            checked={filtroDirectivo}
            onChange={setFiltroDirectivo}
            checkedChildren={<><CrownOutlined /> Directivos</>}
            unCheckedChildren="Todas"
          />
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading} />
          <Button icon={<ExportOutlined />} onClick={exportar}>CSV</Button>
          {esJefe && (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nueva línea
            </Button>
          )}
        </Space>
      </div>

      {/* Stats */}
      <KpiStrip items={[
        { label: 'Total líneas',    value: stats.total_lineas,        color: '#64748b'  },
        { label: 'Activas',         value: stats.lineas_activas,      color: '#22c55e'  },
        { label: 'Fijas',           value: stats.fijas,               color: '#1677ff'  },
        { label: 'Celulares',       value: stats.celulares,           color: '#22c55e'  },
        { label: 'VoIP',            value: stats.voip,                color: '#7c3aed'  },
        { label: 'Directivos',      value: stats.directivos,          color: '#f59e0b'  },
        { label: 'Costo mensual',   value: formatCurrency(stats.costo_mensual_total), color: '#1677ff' },
        { label: 'Costo directivos',value: formatCurrency(costoDirectivos), color: '#f59e0b' },
      ]} />

      {/* Distribución por operador */}
      {Object.keys(stats.por_operador || {}).length > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>Por operador:</Text>
            {Object.entries(stats.por_operador || {}).map(([op, cnt]) => (
              <Tag key={op}>{op}: <strong>{cnt}</strong></Tag>
            ))}
          </Space>
        </Card>
      )}

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
          ref={gridRef}
          rowData={lineasFiltradas}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          {...defaultGridOptions}
          loading={loading}
          rowHeight={52}
          headerHeight={40}

          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.es_directivo) return { background: '#fffbe6' }
            if (!data?.activa)      return { background: '#fafafa', opacity: 0.7 }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Drawer Crear/Editar */}
      <Drawer
        title={selected ? `Editar: ${selected.numero}` : 'Nueva línea telefónica'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields() }}
        width={520}
        extra={
          <Button type="primary" onClick={() => form.submit()}>
            {selected ? 'Guardar cambios' : 'Registrar'}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={guardar}>
          <Divider orientation="left" plain>Datos de la línea</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="numero" label="Número" rules={[{ required: true }]}>
                <Input placeholder="01-4271200 / 999100001" disabled={!!selected} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  {TIPOS_LINEA.map(t => (
                    <Option key={t.value} value={t.value}>{t.icon} {t.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="operador" label="Operador">
                <Select allowClear showSearch>
                  {['Claro', 'Movistar', 'Entel', 'Bitel', 'Otro'].map(o => (
                    <Option key={o} value={o}>{o}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="plan" label="Plan">
                <Input placeholder="Empresarial Ilimitado" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="costo_mensual" label="Costo mensual (S/)">
            <InputNumber min={0} style={{ width: '100%' }} prefix="S/" />
          </Form.Item>

          <Divider orientation="left" plain>Asignación</Divider>
          <Form.Item name="asignado_a_id" label="Asignado a">
            <Select allowClear showSearch optionFilterProp="children"
              placeholder="Sin asignar">
              {usuarios.map(u => (
                <Option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} – {u.cargo || u.area || '—'}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sede_id" label="Sede">
                <Select allowClear>
                  {sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fecha_asignacion" label="Fecha de asignación">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="es_directivo" label="¿Es de directivo?" valuePropName="checked">
                <Switch checkedChildren={<><CrownOutlined /> Sí</>} unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="activa" label="Estado" valuePropName="checked">
                <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Equipo celular (si aplica)</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="equipo_celular" label="Modelo del equipo">
                <Input placeholder="Samsung Galaxy S24" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="imei" label="IMEI">
                <Input placeholder="356938035643809" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="fecha_vencimiento" label="Vencimiento del plan/contrato">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
