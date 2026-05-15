import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Badge, Tabs, Drawer, Form, Input, Select, DatePicker, InputNumber,
  Tooltip, Popconfirm, Modal, Timeline, Typography, message, Alert, Progress, Divider,
  Upload, Row, Col,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, ExportOutlined,
  SwapOutlined, DeleteOutlined, HistoryOutlined, WarningOutlined,
  LaptopOutlined, FileTextOutlined, SafetyOutlined, SearchOutlined,
  CameraOutlined,
} from '@ant-design/icons'
import KpiStrip from '../../components/common/KpiStrip'
import dayjs from 'dayjs'
import {
  inventarioService, TIPOS_EQUIPO, ESTADOS_EQUIPO, TIPOS_LICENCIA,
  getTipoEquipo, getEstadoEquipo, formatCurrency,
} from '../../services/inventarioService'
import { configuracionService } from '../../services/configuracionService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'

const { Title, Text } = Typography
const { Option } = Select

// ── CELL RENDERERS ────────────────────────────────────────────────────────────
const TipoRenderer = ({ value }) => {
  const t = getTipoEquipo(value)
  return t ? <span>{t.icon} {t.label}</span> : value
}

const EstadoEquipoRenderer = ({ value }) => {
  const e = getEstadoEquipo(value)
  return e ? <Badge status={e.color} text={e.label} /> : value
}

const GarantiaRenderer = ({ data }) => {
  if (!data?.garantia_hasta) return <Text type="secondary">—</Text>
  const dias = dayjs(data.garantia_hasta).diff(dayjs(), 'day')
  if (dias < 0)   return <Tag color="red">Vencida</Tag>
  if (dias <= 30) return <Tag color="orange">{dias}d restantes</Tag>
  return <Tag color="green">{dayjs(data.garantia_hasta).format('DD/MM/YYYY')}</Tag>
}

const DepreciacionRenderer = ({ data }) => {
  if (!data?.valor_compra || !data?.valor_actual) return <Text type="secondary">—</Text>
  const pct = Math.min(100, Math.round((1 - data.valor_actual / data.valor_compra) * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Progress percent={pct} size="small" showInfo={false}
        strokeColor={pct > 80 ? '#ff4d4f' : pct > 50 ? '#fa8c16' : '#52c41a'}
        style={{ width: 60, margin: 0 }} />
      <Text style={{ fontSize: 11 }}>{pct}%</Text>
    </div>
  )
}

const LicenciaVencimientoRenderer = ({ data }) => {
  const { estado_vencimiento, dias_para_vencer, fecha_vencimiento } = data || {}
  if (!fecha_vencimiento) return <Tag>Sin vencimiento</Tag>
  const colores = { vencida: 'red', critico: 'red', urgente: 'orange', alerta: 'gold', vigente: 'green' }
  const labels  = { vencida: 'Vencida', critico: `${dias_para_vencer}d`, urgente: `${dias_para_vencer}d`,
                    alerta: `${dias_para_vencer}d`, vigente: dayjs(fecha_vencimiento).format('DD/MM/YY') }
  return <Tag color={colores[estado_vencimiento]}>{labels[estado_vencimiento]}</Tag>
}

const StockRenderer = ({ data }) => {
  if (!data) return null
  const { cantidad_usada, cantidad_total } = data
  const pct = Math.round((cantidad_usada / cantidad_total) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Progress percent={pct} size="small" showInfo={false}
        strokeColor={pct >= 100 ? '#ff4d4f' : pct >= 80 ? '#fa8c16' : '#52c41a'}
        style={{ width: 60, margin: 0 }} />
      <Text style={{ fontSize: 11 }}>{cantidad_usada}/{cantidad_total}</Text>
    </div>
  )
}

// ── FOTO UPLOAD INLINE ────────────────────────────────────────────────────────
function FotoEquipoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const { data } = await configuracionService.subirArchivo(file)
      onChange(data.url)
      onSuccess(data)
      message.success('Foto subida')
    } catch (err) {
      onError(err)
      message.error('Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Upload
      accept="image/*"
      showUploadList={false}
      customRequest={handleUpload}
      beforeUpload={(file) => {
        if (!file.type.startsWith('image/')) { message.error('Solo imágenes'); return false }
        if (file.size > 5 * 1024 * 1024)    { message.error('Máx. 5 MB'); return false }
        return true
      }}
    >
      <div style={{
        width: 80, height: 80, borderRadius: 8, cursor: 'pointer',
        background: value ? 'transparent' : '#f8fafc',
        border: '2px dashed #cbd5e1', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {value
          ? <img src={value} alt="foto equipo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Space direction="vertical" align="center" size={0}>
              <CameraOutlined style={{ fontSize: 20, color: '#94a3b8' }} />
              <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                {uploading ? 'Subiendo...' : 'Foto (opcional)'}
              </Text>
            </Space>
        }
        {value && (
          <div style={{
            position: 'absolute', bottom: 0, width: '100%',
            background: 'rgba(0,0,0,0.4)', textAlign: 'center', padding: '2px 0',
          }}>
            <CameraOutlined style={{ color: '#fff', fontSize: 11 }} />
          </div>
        )}
      </div>
    </Upload>
  )
}

// ── TAB EQUIPOS (forwardRef) ──────────────────────────────────────────────────
const TabEquipos = forwardRef(function TabEquipos({ usuarios, sedes }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe','especialista'].includes(usuario?.rol)

  const [equipos,         setEquipos]       = useState([])
  const [loading,         setLoading]       = useState(false)
  const [drawerForm,      setDrawerForm]    = useState(false)
  const [drawerAsignar,   setDrawerAsignar] = useState(false)
  const [drawerHistorial, setDrawerHistorial] = useState(false)
  const [seleccionado,    setSeleccionado]  = useState(null)
  const [historial,       setHistorial]     = useState([])
  const [fotoUrl,         setFotoUrl]       = useState(null)
  const [form]     = Form.useForm()
  const [formAsig] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data: eqs } = await inventarioService.listarEquipos({ limit: 500 })
      setEquipos(eqs)
    } catch { message.error('Error al cargar equipos') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => {
    setSeleccionado(null)
    setFotoUrl(null)
    form.resetFields()
    setDrawerForm(true)
  }

  const abrirEditar = (eq) => {
    setSeleccionado(eq)
    setFotoUrl(eq.foto_url || null)
    form.setFieldsValue({
      ...eq,
      fecha_compra:   eq.fecha_compra   ? dayjs(eq.fecha_compra)   : null,
      garantia_hasta: eq.garantia_hasta ? dayjs(eq.garantia_hasta) : null,
    })
    setDrawerForm(true)
  }

  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `inventario_equipos_${dayjs().format('YYYYMMDD')}.csv`,
  })

  // Exponer acciones al padre
  useImperativeHandle(ref, () => ({ reload: cargar, exportar, openNew: abrirNuevo }), [cargar])

  const abrirAsignar = (eq) => {
    setSeleccionado(eq)
    formAsig.resetFields()
    formAsig.setFieldsValue({
      usuario_id: eq.usuario_asignado_id,
      sede_id:    eq.sede_id,
      ubicacion_fisica: eq.ubicacion_fisica,
    })
    setDrawerAsignar(true)
  }

  const abrirHistorial = async (eq) => {
    setSeleccionado(eq)
    const { data } = await inventarioService.historialEquipo(eq.id)
    setHistorial(data)
    setDrawerHistorial(true)
  }

  const guardar = async (values) => {
    const payload = {
      ...values,
      foto_url:       fotoUrl,
      fecha_compra:   values.fecha_compra   ? values.fecha_compra.format('YYYY-MM-DD')   : null,
      garantia_hasta: values.garantia_hasta ? values.garantia_hasta.format('YYYY-MM-DD') : null,
    }
    try {
      if (seleccionado) {
        await inventarioService.actualizarEquipo(seleccionado.id, payload)
        message.success('Equipo actualizado')
      } else {
        await inventarioService.crearEquipo(payload)
        message.success('Equipo registrado')
      }
      setDrawerForm(false)
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error al guardar') }
  }

  const guardarAsignacion = async (values) => {
    try {
      await inventarioService.asignarEquipo(seleccionado.id, values)
      message.success('Asignación registrada')
      setDrawerAsignar(false)
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const darBaja = async (eq) => {
    Modal.confirm({
      title: `¿Dar de baja ${eq.codigo_inventario}?`,
      content: (
        <Form.Item label="Motivo de baja" required>
          <Input.TextArea id="motivo-baja" rows={3} />
        </Form.Item>
      ),
      onOk: async () => {
        const motivo = document.getElementById('motivo-baja')?.value || 'Sin especificar'
        await inventarioService.darDeBaja(eq.id, motivo)
        message.success('Equipo dado de baja')
        cargar()
      },
    })
  }

  const columnDefs = useMemo(() => [
    { headerName: '', width: 44, checkboxSelection: true, headerCheckboxSelection: true,
      pinned: 'left', suppressMenu: true, sortable: false, filter: false },
    { headerName: '', field: 'foto_url', width: 52, pinned: 'left',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ value }) => value
        ? <img src={value} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, marginTop: 6 }} />
        : null },
    { headerName: 'Código', field: 'codigo_inventario', width: 140, pinned: 'left',
      filter: 'agTextColumnFilter' },
    { headerName: 'Tipo', field: 'tipo', width: 140,
      filter: 'agSetColumnFilter', cellRenderer: TipoRenderer,
      filterParams: { values: TIPOS_EQUIPO.map(t => t.value) } },
    { headerName: 'Marca / Modelo', field: 'marca', minWidth: 180,
      filter: 'agTextColumnFilter',
      valueGetter: p => `${p.data?.marca || ''} ${p.data?.modelo || ''}`,
      cellRenderer: ({ data }) => (
        <div>
          <div style={{ fontWeight: 500 }}>{data?.marca} {data?.modelo}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{data?.serie || '—'}</div>
        </div>
      )},
    { headerName: 'Estado', field: 'estado', width: 150,
      filter: 'agSetColumnFilter', cellRenderer: EstadoEquipoRenderer,
      filterParams: { values: ESTADOS_EQUIPO.map(e => e.value) } },
    { headerName: 'Usuario asignado', field: 'usuario_asignado', minWidth: 160,
      filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.usuario_asignado
        ? `${p.data.usuario_asignado.nombre} ${p.data.usuario_asignado.apellido}` : '—' },
    { headerName: 'Sede', field: 'sede', width: 140,
      filter: 'agSetColumnFilter',
      valueGetter: p => p.data?.sede?.nombre || '—' },
    { headerName: 'SO', field: 'sistema_operativo', width: 130,
      filter: 'agTextColumnFilter' },
    { headerName: 'RAM', field: 'ram_gb', width: 80,
      filter: 'agNumberColumnFilter',
      valueFormatter: p => p.value ? `${p.value} GB` : '—' },
    { headerName: 'Valor compra', field: 'valor_compra', width: 130,
      filter: 'agNumberColumnFilter', valueFormatter: p => formatCurrency(p.value) },
    { headerName: 'Valor actual', field: 'valor_actual', width: 130,
      filter: 'agNumberColumnFilter', valueFormatter: p => formatCurrency(p.value) },
    { headerName: 'Depreciación', field: 'depreciacion_anual', width: 130,
      filter: false, cellRenderer: DepreciacionRenderer },
    { headerName: 'Garantía', field: 'garantia_hasta', width: 140,
      filter: 'agDateColumnFilter', cellRenderer: GarantiaRenderer },
    { headerName: 'IP', field: 'ip_asignada', width: 120,
      filter: 'agTextColumnFilter' },
    { headerName: 'Acciones', width: 130, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Space size={2}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} type="text"
              onClick={() => abrirEditar(data)} disabled={!esJefe} />
          </Tooltip>
          <Tooltip title="Asignar">
            <Button size="small" icon={<SwapOutlined />} type="text"
              onClick={() => abrirAsignar(data)} disabled={!esJefe} />
          </Tooltip>
          <Tooltip title="Historial">
            <Button size="small" icon={<HistoryOutlined />} type="text"
              onClick={() => abrirHistorial(data)} />
          </Tooltip>
          <Tooltip title="Dar de baja">
            <Popconfirm title="¿Confirmar baja?" onConfirm={() => darBaja(data)} disabled={!esJefe}>
              <Button size="small" icon={<DeleteOutlined />} type="text" danger disabled={!esJefe} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )},
  ], [esJefe])

  return (
    <div>
      {/* Búsqueda rápida */}
      <div style={{ marginBottom: 8 }}>
        <Input prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="Buscar en todos los campos..." allowClear size="small"
          style={{ width: 280, fontSize: 12 }}
          onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)} />
      </div>

      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef} rowData={equipos} columnDefs={columnDefs}
          defaultColDef={{}} {...defaultGridOptions}
          loading={loading} rowHeight={52} headerHeight={40}
          getRowId={p => String(p.data.id)}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Drawer Crear/Editar */}
      <Drawer
        title={seleccionado ? `Editar: ${seleccionado.codigo_inventario}` : 'Registrar equipo'}
        open={drawerForm} onClose={() => setDrawerForm(false)} width={640}
        extra={<Button type="primary" onClick={() => form.submit()}>
          {seleccionado ? 'Guardar cambios' : 'Registrar'}
        </Button>}
      >
        <Form form={form} layout="vertical" onFinish={guardar}>
          {/* Foto */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <FotoEquipoUpload value={fotoUrl} onChange={setFotoUrl} />
          </div>

          <Divider orientation="left" plain>Identificación</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="codigo_inventario" label="Código inventario" rules={[{ required: true }]}>
                <Input disabled={!!seleccionado} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="codigo_patrimonial" label="Código patrimonial">
                <Input placeholder="PAT-2024-0001" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  {TIPOS_EQUIPO.map(t => <Option key={t.value} value={t.value}>{t.icon} {t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="marca" label="Marca" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="modelo" label="Modelo" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="serie" label="Número de serie">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estado" label="Estado" initialValue="activo">
                <Select>
                  {ESTADOS_EQUIPO.map(e => <Option key={e.value} value={e.value}>{e.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Especificaciones técnicas</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="procesador" label="Procesador">
                <Input placeholder="Intel Core i5-1235U" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ram_gb" label="RAM (GB)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="disco_gb" label="Disco (GB)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sistema_operativo" label="Sistema operativo">
                <Input placeholder="Windows 11 Pro" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="office_version" label="Office / Suite">
                <Input placeholder="Microsoft 365" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="mac_address" label="MAC Address">
                <Input placeholder="AA:BB:CC:DD:EE:FF" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ip_asignada" label="IP asignada">
                <Input placeholder="192.168.1.100" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Datos financieros</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fecha_compra" label="Fecha de compra">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="valor_compra" label="Valor de compra (S/)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="vida_util_anios" label="Vida útil (años)" initialValue={4}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="garantia_hasta" label="Garantía hasta">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="proveedor_id" label="Proveedor">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="ID proveedor" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Ubicación</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sede_id" label="Sede">
                <Select allowClear placeholder="Seleccionar sede">
                  {sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ubicacion_fisica" label="Ubicación física">
                <Input placeholder="Piso 2 – Oficina 201" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Drawer Asignar */}
      <Drawer
        title={`Asignar: ${seleccionado?.codigo_inventario}`}
        open={drawerAsignar} onClose={() => setDrawerAsignar(false)} width={440}
        extra={<Button type="primary" onClick={() => formAsig.submit()}>Confirmar asignación</Button>}
      >
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          message="Se generará un acta de movimiento automáticamente." />
        <Form form={formAsig} layout="vertical" onFinish={guardarAsignacion}>
          <Form.Item name="usuario_id" label="Asignar a usuario">
            <Select allowClear placeholder="Sin asignar (bodega)">
              {usuarios.map(u => (
                <Option key={u.id} value={u.id}>{u.nombre} {u.apellido} – {u.area || '—'}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="sede_id" label="Sede destino">
            <Select allowClear>
              {sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="ubicacion_fisica" label="Ubicación física">
            <Input placeholder="Piso 3 – Of. 301" />
          </Form.Item>
          <Form.Item name="motivo" label="Motivo" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Ej: Asignación inicial, reemplazo por falla..." />
          </Form.Item>
          <Form.Item name="acta_numero" label="N° de acta">
            <Input placeholder="ACTA-2024-0001" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Drawer Historial */}
      <Drawer
        title={`Historial: ${seleccionado?.codigo_inventario}`}
        open={drawerHistorial} onClose={() => setDrawerHistorial(false)} width={480}
      >
        {historial.length === 0
          ? <Text type="secondary">Sin movimientos registrados.</Text>
          : <Timeline items={historial.map(h => ({
              color: h.tipo === 'baja' ? 'red' : h.tipo === 'asignacion' ? 'blue' : 'green',
              children: (
                <div>
                  <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{h.tipo}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {dayjs(h.fecha).format('DD/MM/YYYY HH:mm')}
                  </div>
                  <div style={{ fontSize: 12 }}>{h.motivo}</div>
                  {h.acta_numero && <Tag style={{ marginTop: 4 }}>Acta: {h.acta_numero}</Tag>}
                </div>
              )
            }))} />
        }
      </Drawer>
    </div>
  )
})

// ── TAB LICENCIAS (forwardRef) ────────────────────────────────────────────────
const TabLicencias = forwardRef(function TabLicencias({ stats }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe','especialista'].includes(usuario?.rol)

  const [licencias,  setLicencias] = useState([])
  const [loading,    setLoading]   = useState(false)
  const [drawerForm, setDrawerForm]= useState(false)
  const [editando,   setEditando]  = useState(null)
  const [form] = Form.useForm()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await inventarioService.listarLicencias({ limit: 500 })
      setLicencias(data)
    } catch { message.error('Error al cargar licencias') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => {
    setEditando(null)
    form.resetFields()
    setDrawerForm(true)
  }

  useImperativeHandle(ref, () => ({ reload: cargar, openNew: abrirNuevo }), [cargar])

  const abrirEditar = (lic) => {
    setEditando(lic)
    form.setFieldsValue({
      ...lic,
      fecha_compra: lic.fecha_compra ? dayjs(lic.fecha_compra) : null,
      fecha_vencimiento: lic.fecha_vencimiento ? dayjs(lic.fecha_vencimiento) : null,
    })
    setDrawerForm(true)
  }

  const guardar = async (values) => {
    const payload = {
      ...values,
      fecha_compra: values.fecha_compra?.format('YYYY-MM-DD') || null,
      fecha_vencimiento: values.fecha_vencimiento?.format('YYYY-MM-DD') || null,
    }
    try {
      if (editando) {
        await inventarioService.actualizarLicencia(editando.id, payload)
        message.success('Licencia actualizada')
      } else {
        await inventarioService.crearLicencia(payload)
        message.success('Licencia registrada')
      }
      setDrawerForm(false)
      cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const columnDefs = useMemo(() => [
    { headerName: '', width: 44, checkboxSelection: true,
      headerCheckboxSelection: true, pinned: 'left',
      suppressMenu: true, sortable: false, filter: false },
    { headerName: 'Software', field: 'software', minWidth: 200,
      pinned: 'left', filter: 'agTextColumnFilter',
      cellRenderer: ({ data }) => (
        <div>
          <div style={{ fontWeight: 500 }}>{data?.software}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{data?.fabricante} · v{data?.version || '—'}</div>
        </div>
      )},
    { headerName: 'Tipo', field: 'tipo_licencia', width: 120, filter: 'agSetColumnFilter' },
    { headerName: 'Stock', field: 'cantidad_usada', width: 140, filter: false, cellRenderer: StockRenderer },
    { headerName: 'Disponibles', field: 'disponibles', width: 110, filter: 'agNumberColumnFilter',
      cellRenderer: ({ value }) => (
        <Tag color={value <= 0 ? 'red' : value <= 2 ? 'orange' : 'green'}>{value}</Tag>
      )},
    { headerName: 'Vencimiento', field: 'fecha_vencimiento', width: 150,
      filter: 'agDateColumnFilter', cellRenderer: LicenciaVencimientoRenderer },
    { headerName: 'Valor', field: 'valor', width: 120,
      filter: 'agNumberColumnFilter', valueFormatter: p => formatCurrency(p.value) },
    { headerName: 'Estado', field: 'activa', width: 100, filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => (
        <Badge status={value ? 'success' : 'error'} text={value ? 'Activa' : 'Inactiva'} />
      )},
    { headerName: 'Acciones', width: 90, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Editar">
          <Button size="small" icon={<EditOutlined />} type="text"
            onClick={() => abrirEditar(data)} disabled={!esJefe} />
        </Tooltip>
      )},
  ], [esJefe])

  return (
    <div>
      {stats?.licencias_vencidas > 0 && (
        <Alert type="error" showIcon icon={<WarningOutlined />} style={{ marginBottom: 12 }}
          message={`${stats.licencias_vencidas} licencia(s) vencida(s) — requieren renovación urgente`} />
      )}
      {stats?.licencias_por_vencer > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }}
          message={`${stats.licencias_por_vencer} licencia(s) vencen en los próximos 30 días`} />
      )}

      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef} rowData={licencias} columnDefs={columnDefs}
          defaultColDef={{}} {...defaultGridOptions}
          loading={loading} rowHeight={50} headerHeight={40}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.estado_vencimiento === 'vencida') return { background: '#fff1f0' }
            if (data?.estado_vencimiento === 'critico') return { background: '#fff7e6' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      <Drawer
        title={editando ? `Editar: ${editando.software}` : 'Registrar licencia'}
        open={drawerForm} onClose={() => setDrawerForm(false)} width={520}
        extra={<Button type="primary" onClick={() => form.submit()}>
          {editando ? 'Guardar' : 'Registrar'}
        </Button>}
      >
        <Form form={form} layout="vertical" onFinish={guardar}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="software" label="Software" rules={[{ required: true }]}>
                <Input placeholder="Microsoft 365, AutoCAD, etc." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="version" label="Versión">
                <Input placeholder="2024" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fabricante" label="Fabricante">
                <Input placeholder="Microsoft, Autodesk..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tipo_licencia" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  {TIPOS_LICENCIA.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="cantidad_total" label="Cantidad de licencias" initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="clave" label="Clave / Número de serie">
            <Input.TextArea rows={2} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fecha_compra" label="Fecha de compra">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fecha_vencimiento" label="Fecha de vencimiento">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="valor" label="Valor (S/)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="proveedor_id" label="Proveedor (ID)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
})

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function InventarioPage() {
  const { usuario } = useAuthStore()
  const esJefe = ['jefe','especialista'].includes(usuario?.rol)

  const [usuarios,  setUsuarios]  = useState([])
  const [sedes,     setSedes]     = useState([])
  const [stats,     setStats]     = useState({})
  const [activeTab, setActiveTab] = useState('equipos')
  const [loading,   setLoading]   = useState(false)

  const equiposRef   = useRef()
  const licenciasRef = useRef()
  const activeRef    = activeTab === 'equipos' ? equiposRef : licenciasRef

  useEffect(() => {
    usuarioService.listar({ limit: 200 }).then(({ data }) => setUsuarios(data))
    inventarioService.dashboard().then(({ data }) => setStats(data)).catch(() => {})
    import('../../services/api').then(({ default: api }) =>
      api.get('/sedes/').then(({ data }) => setSedes(data)).catch(() => {})
    )
  }, [])

  const handleReload = () => { activeRef.current?.reload(); setLoading(true); setTimeout(() => setLoading(false), 800) }
  const handleExport = () => activeRef.current?.exportar?.()
  const handleNew    = () => activeRef.current?.openNew()

  const tabs = [
    {
      key: 'equipos',
      label: <span><LaptopOutlined /> Equipos ({stats.total_equipos || 0})</span>,
      children: <TabEquipos ref={equiposRef} usuarios={usuarios} sedes={sedes} />,
    },
    {
      key: 'licencias',
      label: (
        <span>
          <FileTextOutlined /> Licencias
          {stats.licencias_vencidas > 0 && (
            <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>
              {stats.licencias_vencidas} vencidas
            </Tag>
          )}
        </span>
      ),
      children: <TabLicencias ref={licenciasRef} stats={stats} />,
    },
  ]

  return (
    <div>
      {/* Header con botones al mismo nivel que el título */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          <SafetyOutlined style={{ marginRight: 8 }} />
          Inventario TI
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            Actualizar
          </Button>
          {activeTab === 'equipos' && (
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              Exportar CSV
            </Button>
          )}
          {esJefe && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>
              {activeTab === 'equipos' ? 'Registrar equipo' : 'Registrar licencia'}
            </Button>
          )}
        </Space>
      </div>

      {/* KPI Strip */}
      <KpiStrip items={[
        { label: 'Total equipos',     value: stats.total_equipos,             color: '#64748b' },
        { label: 'Activos',           value: stats.activos,                   color: '#22c55e' },
        { label: 'En mantenimiento',  value: stats.en_mantenimiento,          color: '#f59e0b' },
        { label: 'De baja',           value: stats.de_baja,                   color: '#ef4444' },
        { label: 'Garantía x vencer', value: stats.garantia_por_vencer,       color: '#f97316' },
        { label: 'Valor inventario',  value: formatCurrency(stats.valor_total_inventario), color: '#1677ff' },
        { label: 'Valor depreciado',  value: formatCurrency(stats.valor_depreciado_total), color: '#7c3aed' },
      ]} />

      <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
    </div>
  )
}
