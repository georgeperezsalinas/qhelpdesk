// ─────────────────────────────────────────────────────────────────────
// src/modules/telefonia/TelefoniaPage.jsx
// Rediseño v2 — Telefonía
// Drop-in: mantiene telefoniaService, switch directivos, drawer.
// Requiere: qmodules.css y qhelpers.jsx cargados.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Drawer, Form, Input, Select, DatePicker, InputNumber,
  Switch, Tooltip, message, Row, Col,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, ExportOutlined,
  PhoneOutlined, CrownOutlined, SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  telefoniaService, TIPOS_LINEA, getTipo, formatCurrency,
} from '../../services/telefoniaService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import { QPageHeader, QKpiRow, QPill, QDrawerTitle } from '../../components/common/qhelpers'

const { Option } = Select

const TIPO_TONE = {
  fija: 'info', celular: 'ok', voip: 'plum', anexo: 'info', otro: 'muted',
}

export default function TelefoniaPage() {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [lineas, setLineas] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [usuarios, setUsuarios] = useState([])
  const [sedes, setSedes] = useState([])
  const [selected, setSelected] = useState(null)
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
      setLineas(ls); setStats(dash)
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
    setSelected(null); form.resetFields()
    form.setFieldsValue({ tipo: 'celular', activa: true, es_directivo: false })
    setDrawerOpen(true)
  }
  const abrirEditar = (l) => {
    setSelected(l)
    form.setFieldsValue({
      ...l,
      fecha_asignacion: l.fecha_asignacion ? dayjs(l.fecha_asignacion) : null,
      fecha_vencimiento: l.fecha_vencimiento ? dayjs(l.fecha_vencimiento) : null,
    })
    setDrawerOpen(true)
  }
  const guardar = async (values) => {
    const payload = {
      ...values,
      fecha_asignacion: values.fecha_asignacion?.format('YYYY-MM-DD') || null,
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
      setDrawerOpen(false); form.resetFields(); cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }
  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `telefonia_${dayjs().format('YYYYMMDD')}.csv`,
  })

  const lineasFiltradas = filtroDirectivo ? lineas.filter(l => l.es_directivo) : lineas

  const columnDefs = useMemo(() => [
    { headerName: '', width: 38, checkboxSelection: true, headerCheckboxSelection: true,
      pinned: 'left', suppressMenu: true, sortable: false, filter: false },
    { headerName: 'Número', field: 'numero', width: 170, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <Space size={6}>
          {data?.es_directivo && <CrownOutlined style={{ color: '#C28A00', fontSize: 13 }} />}
          <span className="qmono" style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{value}</span>
        </Space>
      )},
    { headerName: 'Tipo', field: 'tipo', width: 120, filter: 'agSetColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => {
        const t = getTipo(value); if (!t) return value
        return <QPill tone={TIPO_TONE[value] || 'muted'}>{t.label}</QPill>
      },
      filterParams: { values: TIPOS_LINEA.map(t => t.value) } },
    { headerName: 'Asignado a', field: 'asignado_a', minWidth: 220, filter: 'agTextColumnFilter',
      valueGetter: p => p.data?.asignado_a
        ? `${p.data.asignado_a.nombre} ${p.data.asignado_a.apellido}` : '—',
      cellRenderer: ({ data }) => {
        if (!data?.asignado_a) return <span className="qmuted">Sin asignar</span>
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 500, color: 'var(--ink-1)' }}>
              {data.asignado_a.nombre} {data.asignado_a.apellido}
            </div>
            {data.asignado_a.cargo && (
              <div className="qmuted" style={{ fontSize: 10.5 }}>{data.asignado_a.cargo}</div>
            )}
          </div>
        )
      }},
    { headerName: 'Operador', field: 'operador', width: 120, filter: 'agSetColumnFilter' },
    { headerName: 'Plan', field: 'plan', minWidth: 160, filter: 'agTextColumnFilter' },
    { headerName: 'Costo/mes', field: 'costo_mensual', width: 120, filter: 'agNumberColumnFilter',
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontSize: 11.5 }}>{formatCurrency(value)}</span> },
    { headerName: 'Equipo', field: 'equipo_celular', minWidth: 160, filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span style={{ fontSize: 12 }}>{value}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Sede', field: 'sede', width: 150, filter: 'agSetColumnFilter',
      valueGetter: p => p.data?.sede?.nombre || '—' },
    { headerName: 'F. Asignación', field: 'fecha_asignacion', width: 130, filter: 'agDateColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11.5 }}>{dayjs(value).format('DD/MM/YY')}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Vencimiento', field: 'fecha_vencimiento', width: 130, filter: 'agDateColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => {
        if (!value) return <span className="qmuted">—</span>
        const dias = dayjs(value).diff(dayjs(), 'day')
        if (dias < 0)   return <QPill tone="crit">Vencido</QPill>
        if (dias <= 30) return <QPill tone="warn">{dias}d</QPill>
        return <span className="qmono" style={{ fontSize: 11.5 }}>{dayjs(value).format('DD/MM/YY')}</span>
      }},
    { headerName: 'Estado', field: 'activa', width: 100, filter: 'agSetColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => <QPill tone={value ? 'ok' : 'muted'}>{value ? 'Activa' : 'Inactiva'}</QPill> },
    { headerName: '', width: 60, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Editar">
          <Button size="small" type="text" icon={<EditOutlined />}
            style={{ color: 'var(--ink-2)' }} onClick={() => abrirEditar(data)} disabled={!esJefe} />
        </Tooltip>
      )},
  ], [esJefe])

  const costoDirectivos = lineas
    .filter(l => l.es_directivo && l.activa)
    .reduce((acc, l) => acc + (l.costo_mensual || 0), 0)

  return (
    <div>
      <QPageHeader
        eyebrow="Administración · telefonía"
        title="Líneas"
        titleEm="telefónicas"
        subtitle={`${stats.total_lineas ?? 0} líneas registradas · ${stats.lineas_activas ?? 0} activas · costo mensual ${formatCurrency(stats.costo_mensual_total)}`}
        actions={
          <Space>
            <Switch checked={filtroDirectivo} onChange={setFiltroDirectivo}
              checkedChildren={<><CrownOutlined /> Directivos</>} unCheckedChildren="Todas" />
            <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading}>Actualizar</Button>
            <Button icon={<ExportOutlined />} onClick={exportar}>CSV</Button>
            {esJefe && (
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                Nueva línea
              </Button>
            )}
          </Space>
        }
      />

      <QKpiRow items={[
        { lbl: 'Total líneas',     val: stats.total_lineas ?? 0 },
        { lbl: 'Activas',          val: stats.lineas_activas ?? 0,     tone: 'ok' },
        { lbl: 'Fijas',            val: stats.fijas ?? 0,              tone: 'info' },
        { lbl: 'Celulares',        val: stats.celulares ?? 0,          tone: 'ok' },
        { lbl: 'VoIP',             val: stats.voip ?? 0,               tone: 'plum' },
        { lbl: 'Directivos',       val: stats.directivos ?? 0,         tone: 'warn' },
        { lbl: 'Costo mensual',    val: formatCurrency(stats.costo_mensual_total), tone: 'info' },
        { lbl: 'Costo directivos', val: formatCurrency(costoDirectivos),           tone: 'warn' },
      ]} />

      {/* Distribución por operador */}
      {Object.keys(stats.por_operador || {}).length > 0 && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--line-1)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)',
          }}>Por operador</span>
          {Object.entries(stats.por_operador || {}).map(([op, cnt]) => (
            <span key={op} style={{ fontSize: 12, color: 'var(--ink-1)' }}>
              {op}: <span className="qmono" style={{ fontWeight: 600 }}>{cnt}</span>
            </span>
          ))}
        </div>
      )}

      <div className="qtoolbar">
        <div className="qinput-wrap">
          <SearchOutlined />
          <input className="qinput" placeholder="Buscar en todos los campos…"
            onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)} />
        </div>
        <span style={{ marginLeft: 'auto' }} className="qmuted qmono">
          {lineasFiltradas.length} líneas{filtroDirectivo ? ' (solo directivos)' : ''}
        </span>
      </div>

      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef}
          rowData={lineasFiltradas}
          columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={46} headerHeight={36}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.es_directivo) return { background: 'rgba(194,138,0,0.06)' }
            if (!data?.activa)      return { background: 'var(--bg-tinted)', opacity: 0.65 }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Drawer Crear/Editar */}
      <Drawer
        title={<QDrawerTitle icon={<PhoneOutlined />}>
          {selected ? `Editar ${selected.numero}` : 'Nueva línea telefónica'}
        </QDrawerTitle>}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields() }}
        width={560}
        styles={{
          body: { padding: 0, background: 'var(--bg-canvas)' },
          header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={guardar}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="qform-section-h"><PhoneOutlined /> Datos de la línea</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="numero" label="Número" rules={[{ required: true }]}>
                    <Input placeholder="01-4271200 / 999100001" disabled={!!selected} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                    <Select>{TIPOS_LINEA.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}</Select>
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
            </div>

            <div className="qform-section-h">Asignación</div>
            <div className="qform-section-b">
              <Form.Item name="asignado_a_id" label="Asignado a">
                <Select allowClear showSearch optionFilterProp="children" placeholder="Sin asignar">
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
                    <Select allowClear>{sedes.map(s => <Option key={s.id} value={s.id}>{s.nombre}</Option>)}</Select>
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
            </div>

            <div className="qform-section-h">Equipo celular (si aplica)</div>
            <div className="qform-section-b">
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
              <Form.Item name="fecha_vencimiento" label="Vencimiento del plan / contrato">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item name="observaciones" label="Observaciones" style={{ marginBottom: 6 }}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </div>
          </div>
          <div className="qform-footer">
            <Button onClick={() => { setDrawerOpen(false); form.resetFields() }}>Cancelar</Button>
            <Button type="primary" htmlType="submit">
              {selected ? 'Guardar cambios' : 'Registrar línea'}
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}
