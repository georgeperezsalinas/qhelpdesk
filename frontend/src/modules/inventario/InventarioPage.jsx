// ─────────────────────────────────────────────────────────────────────
// src/modules/inventario/InventarioPage.jsx
// Rediseño v2 — Inventario TI (Equipos + Licencias)
// Drop-in: mantiene inventarioService, AG Grid, forwardRef tabs,
// upload de foto, historial de movimientos, asignaciones.
// Requiere: qmodules.css y qhelpers.jsx cargados.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tabs, Drawer, Form, Input, Select, DatePicker, InputNumber,
  Tooltip, Popconfirm, Modal, Timeline, Avatar, message, Alert, Upload, Row, Col,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, ExportOutlined,
  SwapOutlined, DeleteOutlined, HistoryOutlined, WarningOutlined,
  LaptopOutlined, FileTextOutlined, SearchOutlined, CameraOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  inventarioService, TIPOS_EQUIPO, ESTADOS_EQUIPO, TIPOS_LICENCIA,
  getTipoEquipo, getEstadoEquipo, formatCurrency,
} from '../../services/inventarioService'
import { configuracionService } from '../../services/configuracionService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import {
  QPageHeader, QKpiRow, QPill, QProgress, QDrawerTitle,
} from '../../components/common/qhelpers'

const { Option } = Select

// Mapeo de estados a tono de pill
const ESTADO_TONE = {
  activo:       'ok',
  asignado:     'info',
  almacen:      'muted',
  mantenimiento:'warn',
  reparacion:   'warn',
  de_baja:      'crit',
  perdido:      'crit',
  obsoleto:     'muted',
}

// ── Foto upload (estilo nuevo) ─────────────────────────────────────────
function FotoEquipoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const { data } = await configuracionService.subirArchivo(file)
      onChange(data.url); onSuccess(data); message.success('Foto subida')
    } catch (err) { onError(err); message.error('Error al subir la foto') }
    finally { setUploading(false) }
  }
  return (
    <Upload accept="image/*" showUploadList={false} customRequest={handleUpload}
      beforeUpload={(file) => {
        if (!file.type.startsWith('image/')) { message.error('Solo imágenes'); return false }
        if (file.size > 5 * 1024 * 1024)    { message.error('Máx. 5 MB'); return false }
        return true
      }}>
      <div style={{
        width: 96, height: 96, borderRadius: 12, cursor: 'pointer',
        background: value ? 'var(--bg-surface)' : 'var(--bg-tinted)',
        border: '1.5px dashed var(--acc-line)',
        overflow: 'hidden', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {value
          ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{ textAlign: 'center', color: 'var(--acc-ink)' }}>
              <CameraOutlined style={{ fontSize: 22 }} />
              <div style={{ fontSize: 10, marginTop: 4, fontWeight: 500 }}>
                {uploading ? 'Subiendo…' : 'Foto del equipo'}
              </div>
            </div>
          )
        }
      </div>
    </Upload>
  )
}

// ─────────────────────────────────────────────────────────────────────
// TAB EQUIPOS
// ─────────────────────────────────────────────────────────────────────
const TabEquipos = forwardRef(function TabEquipos({ usuarios, sedes }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe','especialista'].includes(usuario?.rol)

  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerForm, setDrawerForm] = useState(false)
  const [drawerAsignar, setDrawerAsignar] = useState(false)
  const [drawerHistorial, setDrawerHistorial] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [fotoUrl, setFotoUrl] = useState(null)
  const [form] = Form.useForm()
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

  const abrirNuevo = () => { setSeleccionado(null); setFotoUrl(null); form.resetFields(); setDrawerForm(true) }
  const abrirEditar = (eq) => {
    setSeleccionado(eq); setFotoUrl(eq.foto_url || null)
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
  useImperativeHandle(ref, () => ({ reload: cargar, exportar, openNew: abrirNuevo }), [cargar])

  const abrirAsignar = (eq) => {
    setSeleccionado(eq); formAsig.resetFields()
    formAsig.setFieldsValue({
      usuario_id: eq.usuario_asignado_id, sede_id: eq.sede_id,
      ubicacion_fisica: eq.ubicacion_fisica,
    })
    setDrawerAsignar(true)
  }
  const abrirHistorial = async (eq) => {
    setSeleccionado(eq)
    const { data } = await inventarioService.historialEquipo(eq.id)
    setHistorial(data); setDrawerHistorial(true)
  }
  const guardar = async (values) => {
    const payload = {
      ...values, foto_url: fotoUrl,
      fecha_compra:   values.fecha_compra?.format('YYYY-MM-DD')   || null,
      garantia_hasta: values.garantia_hasta?.format('YYYY-MM-DD') || null,
    }
    try {
      if (seleccionado) {
        await inventarioService.actualizarEquipo(seleccionado.id, payload)
        message.success('Equipo actualizado')
      } else {
        await inventarioService.crearEquipo(payload)
        message.success('Equipo registrado')
      }
      setDrawerForm(false); cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error al guardar') }
  }
  const guardarAsignacion = async (values) => {
    try {
      await inventarioService.asignarEquipo(seleccionado.id, values)
      message.success('Asignación registrada'); setDrawerAsignar(false); cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }
  const darBaja = (eq) => {
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
        message.success('Equipo dado de baja'); cargar()
      },
    })
  }

  const columnDefs = useMemo(() => [
    { headerName: '', width: 38, checkboxSelection: true, headerCheckboxSelection: true,
      pinned: 'left', suppressMenu: true, sortable: false, filter: false },
    { headerName: '', field: 'foto_url', width: 52, pinned: 'left',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ value }) => value
        ? <img src={value} alt=""
            style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--line-1)' }} />
        : <span style={{
            width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-sunken)', borderRadius: 4, color: 'var(--ink-4)', fontSize: 14,
          }}>{getTipoEquipo(null)?.icon || '📦'}</span> },
    { headerName: 'Código', field: 'codigo_inventario', width: 150, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{value}</span> },
    { headerName: 'Tipo', field: 'tipo', width: 130, filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => {
        const t = getTipoEquipo(value)
        return t ? <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t.icon} {t.label}</span> : value
      },
      filterParams: { values: TIPOS_EQUIPO.map(t => t.value) } },
    { headerName: 'Marca / Modelo', field: 'marca', minWidth: 200, filter: 'agTextColumnFilter',
      valueGetter: p => `${p.data?.marca || ''} ${p.data?.modelo || ''}`,
      cellRenderer: ({ data }) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 500, color: 'var(--ink-1)' }}>{data?.marca} {data?.modelo}</div>
          <div className="qmono qmuted" style={{ fontSize: 10.5 }}>{data?.serie || '—'}</div>
        </div>
      )},
    { headerName: 'Estado', field: 'estado', width: 130, filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => {
        const e = getEstadoEquipo(value)
        return e ? <QPill tone={ESTADO_TONE[value] || 'muted'}>{e.label}</QPill> : value
      },
      cellStyle: { overflow: 'visible' },
      filterParams: { values: ESTADOS_EQUIPO.map(e => e.value) } },
    { headerName: 'Usuario asignado', field: 'usuario_asignado', minWidth: 170, filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.usuario_asignado
        ? `${p.data.usuario_asignado.nombre} ${p.data.usuario_asignado.apellido}` : '—',
      cellRenderer: ({ data }) => data?.usuario_asignado
        ? <span style={{ fontSize: 12 }}>{data.usuario_asignado.nombre} {data.usuario_asignado.apellido}</span>
        : <span className="qmuted" style={{ fontSize: 11.5 }}>Sin asignar</span> },
    { headerName: 'Sede', field: 'sede', width: 140, filter: 'agSetColumnFilter',
      valueGetter: p => p.data?.sede?.nombre || '—' },
    { headerName: 'SO', field: 'sistema_operativo', width: 130, filter: 'agTextColumnFilter' },
    { headerName: 'RAM', field: 'ram_gb', width: 80, filter: 'agNumberColumnFilter',
      valueFormatter: p => p.value ? `${p.value} GB` : '—' },
    { headerName: 'V. Compra', field: 'valor_compra', width: 120, filter: 'agNumberColumnFilter',
      valueFormatter: p => formatCurrency(p.value),
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontSize: 11.5 }}>{formatCurrency(value)}</span> },
    { headerName: 'V. Actual', field: 'valor_actual', width: 120, filter: 'agNumberColumnFilter',
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontSize: 11.5 }}>{formatCurrency(value)}</span> },
    { headerName: 'Depreciación', field: 'depreciacion_anual', width: 150, filter: false,
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ data }) => {
        if (!data?.valor_compra || !data?.valor_actual) return <span className="qmuted">—</span>
        const pct = Math.min(100, Math.round((1 - data.valor_actual / data.valor_compra) * 100))
        return <QProgress value={pct} tone={pct > 80 ? 'crit' : pct > 50 ? 'warn' : 'ok'} />
      }},
    { headerName: 'Garantía', field: 'garantia_hasta', width: 130, filter: 'agDateColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ data }) => {
        if (!data?.garantia_hasta) return <span className="qmuted">—</span>
        const dias = dayjs(data.garantia_hasta).diff(dayjs(), 'day')
        if (dias < 0)   return <QPill tone="crit">Vencida</QPill>
        if (dias <= 30) return <QPill tone="warn">{dias}d</QPill>
        return <span className="qmono" style={{ fontSize: 11.5 }}>{dayjs(data.garantia_hasta).format('DD/MM/YY')}</span>
      }},
    { headerName: 'IP', field: 'ip_asignada', width: 130, filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11 }}>{value}</span>
        : <span className="qmuted">—</span> },
    { headerName: '', width: 130, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Space size={2}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} type="text"
              style={{ color: 'var(--ink-2)' }} onClick={() => abrirEditar(data)} disabled={!esJefe} />
          </Tooltip>
          <Tooltip title="Asignar">
            <Button size="small" icon={<SwapOutlined />} type="text"
              style={{ color: 'var(--acc)' }} onClick={() => abrirAsignar(data)} disabled={!esJefe} />
          </Tooltip>
          <Tooltip title="Historial">
            <Button size="small" icon={<HistoryOutlined />} type="text"
              style={{ color: 'var(--ink-2)' }} onClick={() => abrirHistorial(data)} />
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
      <div className="qtoolbar">
        <div className="qinput-wrap">
          <SearchOutlined />
          <input className="qinput" placeholder="Buscar en todos los campos…"
            onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)} />
        </div>
        <span style={{ marginLeft: 'auto' }} className="qmuted qmono">{equipos.length} equipos</span>
      </div>

      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef} rowData={equipos} columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={48} headerHeight={36}
          getRowId={p => String(p.data.id)}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* DRAWER FORM equipo */}
      <Drawer
        title={
          <QDrawerTitle icon={seleccionado ? <EditOutlined /> : <LaptopOutlined />}>
            {seleccionado ? `Editar ${seleccionado.codigo_inventario}` : 'Registrar equipo'}
          </QDrawerTitle>
        }
        open={drawerForm} onClose={() => setDrawerForm(false)} width={680}
        styles={{
          body: { padding: 0, background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={guardar}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>

            <div className="qform-section-h"><CameraOutlined /> Foto y código</div>
            <div className="qform-section-b">
              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                <FotoEquipoUpload value={fotoUrl} onChange={setFotoUrl} />
                <div style={{ flex: 1 }}>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="codigo_inventario" label="Código de inventario" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                        <Input disabled={!!seleccionado} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="codigo_patrimonial" label="Código patrimonial" style={{ marginBottom: 14 }}>
                        <Input placeholder="PAT-2024-0001" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              </div>
            </div>

            <div className="qform-section-h"><LaptopOutlined /> Identificación</div>
            <div className="qform-section-b">
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
                  <Form.Item name="serie" label="N° de serie"><Input /></Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="estado" label="Estado" initialValue="activo">
                    <Select>
                      {ESTADOS_EQUIPO.map(e => <Option key={e.value} value={e.value}>{e.label}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="qform-section-h">Especificaciones técnicas</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="procesador" label="Procesador"><Input placeholder="Intel Core i5-1235U" /></Form.Item></Col>
                <Col span={6}><Form.Item name="ram_gb" label="RAM (GB)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item name="disco_gb" label="Disco (GB)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="sistema_operativo" label="Sistema operativo"><Input placeholder="Windows 11 Pro" /></Form.Item></Col>
                <Col span={12}><Form.Item name="office_version" label="Office / Suite"><Input placeholder="Microsoft 365" /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="mac_address" label="MAC Address"><Input placeholder="AA:BB:CC:DD:EE:FF" /></Form.Item></Col>
                <Col span={12}><Form.Item name="ip_asignada" label="IP asignada"><Input placeholder="192.168.1.100" /></Form.Item></Col>
              </Row>
            </div>

            <div className="qform-section-h">Datos financieros</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="fecha_compra" label="Fecha de compra"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                <Col span={12}><Form.Item name="valor_compra" label="Valor de compra (S/)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}><Form.Item name="vida_util_anios" label="Vida útil (años)" initialValue={4}><InputNumber min={1} max={20} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item name="garantia_hasta" label="Garantía hasta"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                <Col span={8}><Form.Item name="proveedor_id" label="Proveedor (ID)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
            </div>

            <div className="qform-section-h">Ubicación</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="sede_id" label="Sede">
                    <Select allowClear placeholder="Seleccionar sede">
                      {sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}><Form.Item name="ubicacion_fisica" label="Ubicación física"><Input placeholder="Piso 2 – Oficina 201" /></Form.Item></Col>
              </Row>
              <Form.Item name="observaciones" label="Observaciones" style={{ marginBottom: 6 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </div>
          </div>
          <div className="qform-footer">
            <Button onClick={() => setDrawerForm(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit">
              {seleccionado ? 'Guardar cambios' : 'Registrar equipo'}
            </Button>
          </div>
        </Form>
      </Drawer>

      {/* DRAWER ASIGNAR */}
      <Drawer
        title={<QDrawerTitle icon={<SwapOutlined />}>Asignar {seleccionado?.codigo_inventario}</QDrawerTitle>}
        open={drawerAsignar} onClose={() => setDrawerAsignar(false)} width={480}
        styles={{ body: { padding: '20px 24px', background: 'var(--bg-canvas)' } }}
      >
        <Alert className="qalert" type="info" showIcon
          message="Se generará un acta de movimiento automáticamente." />
        <Form form={formAsig} layout="vertical" onFinish={guardarAsignacion} style={{ marginTop: 16 }}>
          <Form.Item name="usuario_id" label="Asignar a usuario">
            <Select allowClear showSearch optionFilterProp="children" placeholder="Sin asignar (bodega)">
              {usuarios.map(u => (
                <Option key={u.id} value={u.id}>{u.nombre} {u.apellido} – {u.area || '—'}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="sede_id" label="Sede destino">
            <Select allowClear>{sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}</Select>
          </Form.Item>
          <Form.Item name="ubicacion_fisica" label="Ubicación física">
            <Input placeholder="Piso 3 – Of. 301" />
          </Form.Item>
          <Form.Item name="motivo" label="Motivo" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Ej: Asignación inicial, reemplazo por falla…" />
          </Form.Item>
          <Form.Item name="acta_numero" label="N° de acta">
            <Input placeholder="ACTA-2024-0001" />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDrawerAsignar(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit">Confirmar asignación</Button>
          </div>
        </Form>
      </Drawer>

      {/* DRAWER HISTORIAL */}
      <Drawer
        title={<QDrawerTitle icon={<HistoryOutlined />}>Historial {seleccionado?.codigo_inventario}</QDrawerTitle>}
        open={drawerHistorial} onClose={() => setDrawerHistorial(false)} width={500}
        styles={{ body: { padding: '20px 24px', background: 'var(--bg-canvas)' } }}
      >
        {historial.length === 0
          ? <span className="qmuted">Sin movimientos registrados.</span>
          : <Timeline items={historial.map(h => ({
              color: h.tipo === 'baja' ? '#A8201A' : h.tipo === 'asignacion' ? '#B45309' : '#15633F',
              children: (
                <div>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--ink-1)' }}>{h.tipo}</div>
                  <div className="qmuted qmono" style={{ fontSize: 11 }}>
                    {dayjs(h.fecha).format('DD/MM/YYYY HH:mm')}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>{h.motivo}</div>
                  {h.acta_numero && <QPill tone="muted">Acta {h.acta_numero}</QPill>}
                </div>
              )
            }))} />
        }
      </Drawer>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────
// TAB LICENCIAS
// ─────────────────────────────────────────────────────────────────────
const TabLicencias = forwardRef(function TabLicencias({ stats }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe','especialista'].includes(usuario?.rol)

  const [licencias, setLicencias] = useState([])
  const [loading, setLoading]     = useState(false)
  const [drawerForm, setDrawerForm] = useState(false)
  const [editando, setEditando] = useState(null)
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

  const abrirNuevo = () => { setEditando(null); form.resetFields(); setDrawerForm(true) }
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
      setDrawerForm(false); cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const columnDefs = useMemo(() => [
    { headerName: '', width: 38, checkboxSelection: true, headerCheckboxSelection: true,
      pinned: 'left', suppressMenu: true, sortable: false, filter: false },
    { headerName: 'Software', field: 'software', minWidth: 220, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ data }) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 500, color: 'var(--ink-1)' }}>{data?.software}</div>
          <div className="qmono qmuted" style={{ fontSize: 10.5 }}>
            {data?.fabricante} · v{data?.version || '—'}
          </div>
        </div>
      )},
    { headerName: 'Tipo', field: 'tipo_licencia', width: 130, filter: 'agSetColumnFilter',
      cellRenderer: ({ value }) => <QPill tone="muted">{value}</QPill>,
      cellStyle: { overflow: 'visible' } },
    { headerName: 'Stock', field: 'cantidad_usada', width: 160, filter: false,
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ data }) => {
        if (!data) return null
        const { cantidad_usada, cantidad_total } = data
        return <QProgress value={cantidad_usada} max={cantidad_total}
          label={`${cantidad_usada}/${cantidad_total}`} />
      }},
    { headerName: 'Disponibles', field: 'disponibles', width: 110, filter: 'agNumberColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => (
        <QPill tone={value <= 0 ? 'crit' : value <= 2 ? 'warn' : 'ok'}>{value}</QPill>
      )},
    { headerName: 'Vencimiento', field: 'fecha_vencimiento', width: 140, filter: 'agDateColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ data }) => {
        const { estado_vencimiento, dias_para_vencer, fecha_vencimiento } = data || {}
        if (!fecha_vencimiento) return <QPill tone="muted">Sin vencimiento</QPill>
        const tone = { vencida:'crit', critico:'crit', urgente:'warn', alerta:'warn', vigente:'ok' }
        const lbl = estado_vencimiento === 'vencida' ? 'Vencida'
          : estado_vencimiento === 'vigente' ? dayjs(fecha_vencimiento).format('DD/MM/YY')
          : `${dias_para_vencer}d`
        return <QPill tone={tone[estado_vencimiento] || 'muted'}>{lbl}</QPill>
      }},
    { headerName: 'Valor', field: 'valor', width: 120, filter: 'agNumberColumnFilter',
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontSize: 11.5 }}>{formatCurrency(value)}</span> },
    { headerName: 'Estado', field: 'activa', width: 100, filter: 'agSetColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => <QPill tone={value ? 'ok' : 'muted'}>{value ? 'Activa' : 'Inactiva'}</QPill> },
    { headerName: '', width: 70, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Editar">
          <Button size="small" icon={<EditOutlined />} type="text"
            style={{ color: 'var(--ink-2)' }} onClick={() => abrirEditar(data)} disabled={!esJefe} />
        </Tooltip>
      )},
  ], [esJefe])

  return (
    <div>
      {stats?.licencias_vencidas > 0 && (
        <Alert className="qalert" type="error" showIcon icon={<WarningOutlined />}
          message={`${stats.licencias_vencidas} licencia(s) vencida(s) — requieren renovación urgente`} />
      )}
      {stats?.licencias_por_vencer > 0 && (
        <Alert className="qalert" type="warning" showIcon
          message={`${stats.licencias_por_vencer} licencia(s) vencen en los próximos 30 días`} />
      )}

      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef} rowData={licencias} columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={44} headerHeight={36}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.estado_vencimiento === 'vencida') return { background: 'rgba(168,32,26,0.05)' }
            if (data?.estado_vencimiento === 'critico') return { background: 'rgba(180,83,9,0.05)' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      <Drawer
        title={<QDrawerTitle icon={<FileTextOutlined />}>{editando ? `Editar ${editando.software}` : 'Registrar licencia'}</QDrawerTitle>}
        open={drawerForm} onClose={() => setDrawerForm(false)} width={560}
        styles={{
          body: { padding: 0, background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={guardar}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="qform-section-h">Software</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={16}>
                  <Form.Item name="software" label="Nombre del software" rules={[{ required: true }]}>
                    <Input placeholder="Microsoft 365, AutoCAD…" />
                  </Form.Item>
                </Col>
                <Col span={8}><Form.Item name="version" label="Versión"><Input placeholder="2024" /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="fabricante" label="Fabricante"><Input placeholder="Microsoft, Autodesk…" /></Form.Item></Col>
                <Col span={12}>
                  <Form.Item name="tipo_licencia" label="Tipo" rules={[{ required: true }]}>
                    <Select>{TIPOS_LICENCIA.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}</Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="qform-section-h">Licenciamiento</div>
            <div className="qform-section-b">
              <Form.Item name="cantidad_total" label="Cantidad de licencias" initialValue={1}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="clave" label="Clave / Número de serie">
                <Input.TextArea rows={2} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" />
              </Form.Item>
            </div>

            <div className="qform-section-h">Vigencia y costo</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}><Form.Item name="fecha_compra" label="Fecha de compra"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                <Col span={12}><Form.Item name="fecha_vencimiento" label="Fecha de vencimiento"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="valor" label="Valor (S/)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="proveedor_id" label="Proveedor (ID)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item name="observaciones" label="Observaciones" style={{ marginBottom: 6 }}>
                <Input.TextArea rows={2} />
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
export default function InventarioPage() {
  const { usuario } = useAuthStore()
  const esJefe = ['jefe','especialista'].includes(usuario?.rol)

  const [usuarios, setUsuarios] = useState([])
  const [sedes, setSedes]       = useState([])
  const [stats, setStats]       = useState({})
  const [activeTab, setActiveTab] = useState('equipos')
  const [loading, setLoading]   = useState(false)

  const equiposRef = useRef()
  const licenciasRef = useRef()
  const activeRef = activeTab === 'equipos' ? equiposRef : licenciasRef

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

  return (
    <div>
      <QPageHeader
        eyebrow="Activos TI · inventario"
        title="Inventario"
        titleEm="de activos"
        subtitle={`${stats.total_equipos ?? 0} equipos registrados · valor de inventario ${formatCurrency(stats.valor_total_inventario)}`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>Actualizar</Button>
            {activeTab === 'equipos' && <Button icon={<ExportOutlined />} onClick={handleExport}>Exportar CSV</Button>}
            {esJefe && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>
                {activeTab === 'equipos' ? 'Registrar equipo' : 'Registrar licencia'}
              </Button>
            )}
          </Space>
        }
      />

      <QKpiRow items={[
        { lbl: 'Total equipos',     val: stats.total_equipos ?? 0 },
        { lbl: 'Activos',           val: stats.activos ?? 0,            tone: 'ok' },
        { lbl: 'En mantenimiento',  val: stats.en_mantenimiento ?? 0,   tone: 'warn' },
        { lbl: 'De baja',           val: stats.de_baja ?? 0,            tone: 'crit' },
        { lbl: 'Garantía x vencer', val: stats.garantia_por_vencer ?? 0,tone: 'warn' },
        { lbl: 'Valor inventario',  val: formatCurrency(stats.valor_total_inventario),  tone: 'info' },
        { lbl: 'Valor depreciado',  val: formatCurrency(stats.valor_depreciado_total),  tone: 'plum' },
      ]} />

      <Tabs
        className="qtabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
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
                  <span style={{ marginLeft: 6 }}>
                    <QPill tone="crit">{stats.licencias_vencidas} vencidas</QPill>
                  </span>
                )}
              </span>
            ),
            children: <TabLicencias ref={licenciasRef} stats={stats} />,
          },
        ]}
      />
    </div>
  )
}
