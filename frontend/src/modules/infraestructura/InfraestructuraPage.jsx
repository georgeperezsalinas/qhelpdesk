// ─────────────────────────────────────────────────────────────────────
// src/modules/infraestructura/InfraestructuraPage.jsx
// Rediseño v2 — Servidores y Red
// Drop-in: mantiene infraestructuraService, tabs forwardRef, drawer
// detalle servidor con bases de datos, drawer crear/editar.
// Requiere: qmodules.css y qhelpers.jsx cargados.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tabs, Drawer, Form, Input, Select, InputNumber,
  Tooltip, message, Alert, Table, Row, Col,
} from 'antd'
import {
  ReloadOutlined, PlusOutlined, EditOutlined, ExportOutlined,
  DatabaseOutlined, WifiOutlined, HddOutlined, WarningOutlined, SearchOutlined,
} from '@ant-design/icons'
import {
  infraestructuraService, ESTADOS_SERVICIO, TIPOS_SERVIDOR,
  TIPOS_DISPOSITIVO, getEstado,
} from '../../services/infraestructuraService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import {
  QPageHeader, QKpiRow, QPill, QDrawerTitle,
} from '../../components/common/qhelpers'

const { Option } = Select
const { TextArea } = Input

const ESTADO_TONE = {
  operativo: 'ok', degradado: 'warn', fuera: 'crit',
  mantenimiento: 'info', desconocido: 'muted',
}
const TIPO_SRV_TONE = { fisico: 'info', virtual: 'plum', nube: 'info' }
const TIPO_DISP_TONE = {
  switch: 'info', router: 'ok', firewall: 'crit',
  access_point: 'plum', vpn: 'plum', otro: 'muted',
}

const EstadoRenderer = ({ value }) => {
  const e = getEstado(value); if (!e) return value
  return <QPill tone={ESTADO_TONE[value] || 'muted'}>{e.label}</QPill>
}

// ─────────────────────────────────────────────────────────────────────
// TAB SERVIDORES
// ─────────────────────────────────────────────────────────────────────
const TabServidores = forwardRef(function TabServidores({ tecnicos, sedes }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [servidores, setServidores] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [drawerForm, setDrawerForm] = useState(false)
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
    setSelected(null); form.resetFields()
    form.setFieldsValue({ tipo: 'fisico', estado: 'operativo' })
    setDrawerForm(true)
  }
  const exportar = () => gridRef.current?.api.exportDataAsCsv({ fileName: 'servidores.csv' })
  useImperativeHandle(ref, () => ({ reload: cargar, exportar, openNew: abrirNuevo }), [cargar])

  const abrirEditar = (s) => { setSelected(s); form.setFieldsValue(s); setDrawerForm(true) }
  const guardar = async (values) => {
    try {
      if (selected) {
        await infraestructuraService.actualizarServidor(selected.id, values)
        message.success('Servidor actualizado')
      } else {
        await infraestructuraService.crearServidor(values)
        message.success('Servidor registrado')
      }
      setDrawerForm(false); cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const columnDefs = useMemo(() => [
    { headerName: 'Nombre', field: 'nombre', minWidth: 200, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <a onClick={() => { setSelected(data); setDrawerDetalle(true) }}
           style={{ fontWeight: 500, color: 'var(--ink-1)' }}>{value}</a>
      )},
    { headerName: 'Hostname / IP', field: 'hostname', minWidth: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: ({ data }) => (
        <div style={{ lineHeight: 1.2 }}>
          <div className="qmono" style={{ fontSize: 11.5, color: 'var(--ink-1)' }}>{data?.hostname || '—'}</div>
          {data?.ip_gestion && (
            <div className="qmono qmuted" style={{ fontSize: 10.5 }}>{data.ip_gestion}</div>
          )}
        </div>
      )},
    { headerName: 'Tipo', field: 'tipo', width: 100,
      filter: 'agSetColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => <QPill tone={TIPO_SRV_TONE[value] || 'muted'}>{value}</QPill>,
      filterParams: { values: TIPOS_SERVIDOR.map(t => t.value) } },
    { headerName: 'SO', field: 'sistema_operativo', minWidth: 150,
      filter: 'agTextColumnFilter',
      valueGetter: p => `${p.data?.sistema_operativo || ''} ${p.data?.version_so || ''}`.trim() },
    { headerName: 'CPU / RAM', field: 'cpu_nucleos', width: 130, filter: false,
      valueGetter: p => `${p.data?.cpu_nucleos || '—'} · ${p.data?.ram_gb || '—'} GB`,
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontSize: 11 }}>{value}</span> },
    { headerName: 'Disco', field: 'disco_total_tb', width: 90, filter: 'agNumberColumnFilter',
      valueFormatter: p => p.value ? `${p.value} TB` : '—',
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontSize: 11.5 }}>
        {value ? `${value} TB` : '—'}
      </span> },
    { headerName: 'Servicios', field: 'servicios', minWidth: 200, filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{value}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Estado', field: 'estado', width: 130,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: { values: ESTADOS_SERVICIO.map(e => e.value) } },
    { headerName: 'Sede', field: 'sede', width: 140, filter: 'agSetColumnFilter',
      valueGetter: p => p.data?.sede?.nombre || '—' },
    { headerName: 'BDs', field: 'bases_datos', width: 70, filter: false,
      cellStyle: { overflow: 'visible' },
      valueGetter: p => p.data?.bases_datos?.length || 0,
      cellRenderer: ({ value }) => (
        <QPill tone={value > 0 ? 'info' : 'muted'}>{value}</QPill>
      )},
    { headerName: '', width: 60, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Editar">
          <Button size="small" type="text" icon={<EditOutlined />}
            style={{ color: 'var(--ink-2)' }} onClick={() => abrirEditar(data)} disabled={!esJefe} />
        </Tooltip>
      )},
  ], [esJefe])

  // Columnas de bases de datos (drawer detalle)
  const colsBD = [
    { title: 'Base de datos', dataIndex: 'nombre', key: 'n',
      render: (v, r) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 500 }}>{v}</div>
          <div className="qmuted qmono" style={{ fontSize: 10.5 }}>{r.sistema_info}</div>
        </div>
      )},
    { title: 'Motor', dataIndex: 'motor', width: 120, key: 'm',
      render: v => <QPill tone="info">{v}</QPill> },
    { title: 'Puerto', dataIndex: 'puerto', width: 80, key: 'p',
      render: v => <span className="qmono">{v}</span> },
    { title: 'Tamaño', dataIndex: 'tamanio_gb', width: 90, key: 't',
      render: v => v ? <span className="qmono">{v} GB</span> : '—' },
    { title: 'Estado', dataIndex: 'activa', width: 100, key: 'e',
      render: v => <QPill tone={v ? 'ok' : 'crit'}>{v ? 'Activa' : 'Inactiva'}</QPill> },
  ]

  return (
    <div>
      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef} rowData={servidores} columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={48} headerHeight={36}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.estado === 'fuera')    return { background: 'rgba(168,32,26,0.05)' }
            if (data?.estado === 'degradado') return { background: 'rgba(180,83,9,0.05)' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* DRAWER DETALLE servidor */}
      <Drawer
        title={selected ? <QDrawerTitle icon={<HddOutlined />}>{selected.nombre}</QDrawerTitle> : null}
        open={drawerDetalle} onClose={() => setDrawerDetalle(false)} width={680}
        styles={{
          body: { padding: '20px 26px', background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        {selected && (
          <div>
            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
              {[
                { k: 'Estado',     v: getEstado(selected.estado)?.label, tone: ESTADO_TONE[selected.estado] },
                { k: 'CPU · RAM',  v: `${selected.cpu_nucleos || '—'} núcleos · ${selected.ram_gb || '—'} GB` },
                { k: 'Disco total', v: selected.disco_total_tb ? `${selected.disco_total_tb} TB` : '—' },
              ].map((s, i) => (
                <div key={i} className="qstat-card">
                  <div className="qstat-card-k">{s.k}</div>
                  <div className="qstat-card-v" style={{
                    color: s.tone === 'crit' ? 'var(--crit)' : s.tone === 'warn' ? 'var(--warn)' :
                           s.tone === 'ok' ? 'var(--ok)' : 'var(--ink-1)',
                    fontSize: 18,
                  }}>
                    {s.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Meta */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1,
              background: 'var(--line-2)', border: '1px solid var(--line-1)',
              borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 18,
            }}>
              {[
                { k: 'Hostname', v: <span className="qmono">{selected.hostname || '—'}</span> },
                { k: 'IP de gestión', v: <span className="qmono">{selected.ip_gestion || '—'}</span> },
                { k: 'Sistema operativo', v: `${selected.sistema_operativo || ''} ${selected.version_so || ''}`.trim() || '—' },
                { k: 'Rack / Ubicación', v: selected.rack || '—' },
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

            {selected.servicios && (
              <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--line-1)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 18,
              }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6,
                }}>Servicios activos</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-1)' }}>{selected.servicios}</div>
              </div>
            )}

            {selected.bases_datos?.length > 0 && (
              <>
                <div className="qsec-h">
                  <div className="qsec-l">
                    <span className="qsec-num">01</span>
                    <em>Bases de datos ({selected.bases_datos.length})</em>
                  </div>
                </div>
                <Table dataSource={selected.bases_datos} columns={colsBD}
                  rowKey="id" size="small" pagination={false} />
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* DRAWER FORM servidor */}
      <Drawer
        title={<QDrawerTitle icon={<HddOutlined />}>
          {selected ? `Editar ${selected.nombre}` : 'Registrar servidor'}
        </QDrawerTitle>}
        open={drawerForm} onClose={() => setDrawerForm(false)} width={560}
        styles={{
          body: { padding: 0, background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={guardar}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="qform-section-h">Identificación</div>
            <div className="qform-section-b">
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                <Input placeholder="Servidor BD Principal" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="hostname" label="Hostname"><Input placeholder="SRV-BD-01" /></Form.Item></Col>
                <Col span={12}><Form.Item name="ip_gestion" label="IP de gestión"><Input placeholder="192.168.1.10" /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="tipo" label="Tipo">
                    <Select>{TIPOS_SERVIDOR.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}</Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="estado" label="Estado">
                    <Select>{ESTADOS_SERVICIO.map(e => <Option key={e.value} value={e.value}>{e.label}</Option>)}</Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="qform-section-h">Sistema y recursos</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="sistema_operativo" label="Sistema operativo"><Input placeholder="Ubuntu Server" /></Form.Item></Col>
                <Col span={12}><Form.Item name="version_so" label="Versión"><Input placeholder="22.04 LTS" /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}><Form.Item name="cpu_nucleos" label="CPU (núcleos)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="ram_gb" label="RAM (GB)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="disco_total_tb" label="Disco (TB)"><InputNumber min={0} step={0.5} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
            </div>

            <div className="qform-section-h">Ubicación y operación</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="sede_id" label="Sede">
                    <Select allowClear>{sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}</Select>
                  </Form.Item>
                </Col>
                <Col span={12}><Form.Item name="rack" label="Rack"><Input placeholder="RACK-A-01" /></Form.Item></Col>
              </Row>
              <Form.Item name="servicios" label="Servicios activos">
                <Input placeholder="PostgreSQL, Apache, Exchange…" />
              </Form.Item>
              <Form.Item name="responsable_id" label="Responsable">
                <Select allowClear>
                  {tecnicos.map(t => <Option key={t.id} value={t.id}>{t.nombre} {t.apellido}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="observaciones" label="Observaciones" style={{ marginBottom: 6 }}>
                <TextArea rows={2} />
              </Form.Item>
            </div>
          </div>
          <div className="qform-footer">
            <Button onClick={() => setDrawerForm(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit">{selected ? 'Guardar' : 'Registrar'}</Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────
// TAB DISPOSITIVOS DE RED
// ─────────────────────────────────────────────────────────────────────
const TabDispositivos = forwardRef(function TabDispositivos({ sedes }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [dispositivos, setDispositivos] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerForm, setDrawerForm] = useState(false)
  const [editando, setEditando] = useState(null)
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

  const abrirNuevo = () => {
    setEditando(null); form.resetFields()
    form.setFieldsValue({ tipo: 'switch', estado: 'operativo' })
    setDrawerForm(true)
  }
  useImperativeHandle(ref, () => ({ reload: cargar, openNew: abrirNuevo }), [cargar])

  const guardar = async (values) => {
    try {
      if (editando) {
        await infraestructuraService.actualizarDispositivo(editando.id, values)
        message.success('Actualizado')
      } else {
        await infraestructuraService.crearDispositivo(values)
        message.success('Registrado')
      }
      setDrawerForm(false); cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const columnDefs = useMemo(() => [
    { headerName: 'Nombre', field: 'nombre', minWidth: 200, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => <span style={{ fontWeight: 500, color: 'var(--ink-1)' }}>{value}</span> },
    { headerName: 'Tipo', field: 'tipo', width: 130, filter: 'agSetColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => <QPill tone={TIPO_DISP_TONE[value] || 'muted'}>{value}</QPill>,
      filterParams: { values: TIPOS_DISPOSITIVO.map(t => t.value) } },
    { headerName: 'Marca / Modelo', field: 'marca', minWidth: 180, filter: 'agTextColumnFilter',
      valueGetter: p => `${p.data?.marca || ''} ${p.data?.modelo || ''}`.trim() },
    { headerName: 'IP gestión', field: 'ip_gestion', width: 140, filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11 }}>{value}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Firmware', field: 'firmware', width: 100, filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11 }}>{value}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Ubicación', field: 'ubicacion', minWidth: 160, filter: 'agTextColumnFilter' },
    { headerName: 'Estado', field: 'estado', width: 130,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: { values: ESTADOS_SERVICIO.map(e => e.value) } },
    { headerName: 'Sede', field: 'sede', width: 140, filter: 'agSetColumnFilter',
      valueGetter: p => p.data?.sede?.nombre || '—' },
    { headerName: '', width: 60, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Button size="small" type="text" icon={<EditOutlined />}
          style={{ color: 'var(--ink-2)' }}
          onClick={() => { setEditando(data); form.setFieldsValue(data); setDrawerForm(true) }}
          disabled={!esJefe} />
      )},
  ], [esJefe])

  return (
    <div>
      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef} rowData={dispositivos} columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={40} headerHeight={36}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.estado === 'fuera')    return { background: 'rgba(168,32,26,0.05)' }
            if (data?.estado === 'degradado') return { background: 'rgba(180,83,9,0.05)' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      <Drawer
        title={<QDrawerTitle icon={<WifiOutlined />}>
          {editando ? `Editar ${editando.nombre}` : 'Registrar dispositivo'}
        </QDrawerTitle>}
        open={drawerForm} onClose={() => setDrawerForm(false)} width={520}
        styles={{
          body: { padding: 0, background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={guardar}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="qform-section-h">Datos del dispositivo</div>
            <div className="qform-section-b">
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                <Input placeholder="Firewall perimetral" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                    <Select>{TIPOS_DISPOSITIVO.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}</Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="estado" label="Estado">
                    <Select>{ESTADOS_SERVICIO.map(e => <Option key={e.value} value={e.value}>{e.label}</Option>)}</Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="marca" label="Marca"><Input placeholder="Cisco, Fortinet…" /></Form.Item></Col>
                <Col span={12}><Form.Item name="modelo" label="Modelo"><Input placeholder="ASA 5506-X" /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="ip_gestion" label="IP gestión"><Input placeholder="192.168.1.1" /></Form.Item></Col>
                <Col span={12}><Form.Item name="firmware" label="Firmware"><Input placeholder="7.4.1" /></Form.Item></Col>
              </Row>
            </div>

            <div className="qform-section-h">Ubicación</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="sede_id" label="Sede">
                    <Select allowClear>{sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}</Select>
                  </Form.Item>
                </Col>
                <Col span={12}><Form.Item name="ubicacion" label="Ubicación"><Input placeholder="Rack-A, Piso 1" /></Form.Item></Col>
              </Row>
              <Form.Item name="serie" label="N° de serie"><Input /></Form.Item>
              <Form.Item name="observaciones" label="Observaciones" style={{ marginBottom: 6 }}>
                <TextArea rows={2} />
              </Form.Item>
            </div>
          </div>
          <div className="qform-footer">
            <Button onClick={() => setDrawerForm(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit">{editando ? 'Guardar' : 'Registrar'}</Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────
export default function InfraestructuraPage() {
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [stats, setStats] = useState({})
  const [tecnicos, setTecnicos] = useState([])
  const [sedes, setSedes] = useState([])
  const [activeTab, setActiveTab] = useState('servidores')
  const [loading, setLoading] = useState(false)

  const servidoresRef = useRef()
  const dispositivosRef = useRef()
  const activeRef = activeTab === 'servidores' ? servidoresRef : dispositivosRef

  useEffect(() => {
    infraestructuraService.dashboard().then(({ data }) => setStats(data))
    usuarioService.listarTecnicos().then(({ data }) => setTecnicos(data))
    import('../../services/api').then(({ default: api }) =>
      api.get('/sedes/').then(({ data }) => setSedes(data)).catch(() => {})
    )
  }, [])

  const handleReload = () => { activeRef.current?.reload(); setLoading(true); setTimeout(() => setLoading(false), 800) }
  const handleExport = () => activeRef.current?.exportar?.()
  const handleNew    = () => activeRef.current?.openNew()

  const hayProblema = stats.servidores_fuera > 0 || stats.dispositivos_con_problema > 0

  return (
    <div>
      <QPageHeader
        eyebrow="Infraestructura · servidores y red"
        title="Servidores"
        titleEm="& red"
        subtitle={`${stats.total_servidores ?? 0} servidores · ${stats.total_dispositivos ?? 0} dispositivos de red · ${stats.bases_datos_activas ?? 0} bases de datos`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>Actualizar</Button>
            {activeTab === 'servidores' && (
              <Button icon={<ExportOutlined />} onClick={handleExport}>Exportar CSV</Button>
            )}
            {esJefe && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>
                {activeTab === 'servidores' ? 'Registrar servidor' : 'Registrar dispositivo'}
              </Button>
            )}
          </Space>
        }
      />

      {hayProblema && (
        <Alert className="qalert" type="error" showIcon icon={<WarningOutlined />}
          message={`Problema detectado: ${stats.servidores_fuera || 0} servidor(es) fuera de línea, ${stats.dispositivos_con_problema || 0} dispositivo(s) con problema`} />
      )}

      <QKpiRow items={[
        { lbl: 'Servidores',       val: stats.total_servidores ?? 0 },
        { lbl: 'Operativos',       val: stats.servidores_operativos ?? 0,     tone: 'ok' },
        { lbl: 'Degradados',       val: stats.servidores_degradados ?? 0,     tone: 'warn' },
        { lbl: 'Fuera',            val: stats.servidores_fuera ?? 0,
          tone: stats.servidores_fuera > 0 ? 'crit' : 'ok' },
        { lbl: 'Disp. de red',     val: stats.total_dispositivos ?? 0 },
        { lbl: 'Red operativa',    val: stats.dispositivos_operativos ?? 0,   tone: 'ok' },
        { lbl: 'Red c/ problema',  val: stats.dispositivos_con_problema ?? 0,
          tone: stats.dispositivos_con_problema > 0 ? 'crit' : 'ok' },
        { lbl: 'Bases de datos',   val: stats.bases_datos_activas ?? 0,       tone: 'info' },
      ]} />

      <Tabs
        className="qtabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'servidores',
            label: <span><HddOutlined /> Servidores ({stats.total_servidores || 0})</span>,
            children: <TabServidores ref={servidoresRef} tecnicos={tecnicos} sedes={sedes} />,
          },
          {
            key: 'dispositivos',
            label: <span><WifiOutlined /> Red ({stats.total_dispositivos || 0})</span>,
            children: <TabDispositivos ref={dispositivosRef} sedes={sedes} />,
          },
        ]}
      />
    </div>
  )
}
