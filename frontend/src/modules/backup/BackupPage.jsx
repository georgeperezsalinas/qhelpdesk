// ─────────────────────────────────────────────────────────────────────
// src/modules/backup/BackupPage.jsx
// Rediseño v2 — Backup y continuidad (Políticas + Ejecuciones)
// Drop-in: mantiene backupService, modal verificación, tabs forwardRef.
// Requiere: qmodules.css y qhelpers.jsx cargados.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tabs, Drawer, Form, Input, Select, Modal,
  Tooltip, message, Alert, Switch, Row, Col,
} from 'antd'
import {
  ReloadOutlined, ExportOutlined, CheckCircleOutlined,
  CloudServerOutlined, PlusOutlined, SafetyOutlined,
  WarningOutlined, FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import {
  backupService, ESTADOS_BACKUP, TIPOS_BACKUP, FRECUENCIAS, getEstado,
} from '../../services/backupService'
import { usuarioService } from '../../services/usuarioService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import { QPageHeader, QKpiRow, QPill, QDrawerTitle } from '../../components/common/qhelpers'

dayjs.extend(relativeTime); dayjs.locale('es')

const { Option } = Select
const { TextArea } = Input

const ESTADO_TONE = {
  exitoso: 'ok', fallido: 'crit', en_proceso: 'info',
  programado: 'muted', parcial: 'warn',
}

// ── Renderers ─────────────────────────────────────────────────────────
const EstadoRenderer = ({ value }) => {
  const e = getEstado(value); if (!e) return value
  return <QPill tone={ESTADO_TONE[value] || 'muted'}>{e.label}</QPill>
}
const TamanioRenderer = ({ value }) =>
  value
    ? <span className="qmono" style={{ fontSize: 11.5 }}>{value} GB</span>
    : <span className="qmuted">—</span>
const DuracionRenderer = ({ data }) => {
  if (!data?.duracion_minutos) return <span className="qmuted">—</span>
  const h = Math.floor(data.duracion_minutos / 60)
  const m = data.duracion_minutos % 60
  return <span className="qmono" style={{ fontSize: 11.5 }}>{h > 0 ? `${h}h ` : ''}{m}min</span>
}
const VerificadoRenderer = ({ data }) => {
  if (!data) return null
  if (data.estado !== 'exitoso') return <span className="qmuted">N/A</span>
  return data.verificado
    ? <QPill tone="ok" icon={<CheckCircleOutlined style={{ fontSize: 10 }} />}>Verificado</QPill>
    : <QPill tone="warn">Pendiente</QPill>
}
const UltimoEstadoRenderer = ({ data }) => {
  if (!data?.ultimo_estado) return <span className="qmuted">Sin ejecuciones</span>
  const e = getEstado(data.ultimo_estado)
  return (
    <Space size={6}>
      <QPill tone={ESTADO_TONE[data.ultimo_estado] || 'muted'}>{e?.label}</QPill>
      {data.ultima_ejecucion && (
        <span className="qmuted qmono" style={{ fontSize: 10.5 }}>
          {dayjs(data.ultima_ejecucion).fromNow()}
        </span>
      )}
    </Space>
  )
}

// ─────────────────────────────────────────────────────────────────────
// TAB POLÍTICAS
// ─────────────────────────────────────────────────────────────────────
const TabPoliticas = forwardRef(function TabPoliticas({ tecnicos, onSeleccionarPolitica }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [politicas, setPoliticas] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerForm, setDrawerForm] = useState(false)
  const [editando, setEditando] = useState(null)
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
    setEditando(null); form.resetFields()
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
      hora_ejecucion: values.hora_ejecucion ? dayjs(values.hora_ejecucion).format('HH:mm:ss') : null,
    }
    try {
      if (editando) {
        await backupService.actualizarPolitica(editando.id, payload)
        message.success('Política actualizada')
      } else {
        await backupService.crearPolitica(payload)
        message.success('Política creada')
      }
      setDrawerForm(false); cargar()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }
  const toggleActiva = async (p) => {
    try {
      await backupService.actualizarPolitica(p.id, { activa: !p.activa })
      message.success(p.activa ? 'Política desactivada' : 'Política activada'); cargar()
    } catch { message.error('Error') }
  }

  const columnDefs = useMemo(() => [
    { headerName: 'Nombre', field: 'nombre', minWidth: 220, pinned: 'left',
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value, data }) => (
        <a onClick={() => onSeleccionarPolitica(data)}
           style={{ fontWeight: 500, color: 'var(--ink-1)' }}>{value}</a>
      )},
    { headerName: 'Servidor', field: 'servidor', minWidth: 160,
      filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11.5 }}>{value}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Tipo', field: 'tipo', width: 110, filter: 'agSetColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => <QPill tone="muted">{value}</QPill>,
      filterParams: { values: TIPOS_BACKUP.map(t => t.value) } },
    { headerName: 'Frecuencia', field: 'frecuencia', width: 110, filter: 'agSetColumnFilter',
      cellStyle: { overflow: 'visible' },
      cellRenderer: ({ value }) => <QPill tone="info">{value}</QPill> },
    { headerName: 'Retención', field: 'retencion_dias', width: 110, filter: 'agNumberColumnFilter',
      valueFormatter: p => `${p.value} días`,
      cellRenderer: ({ value }) => <span className="qmono" style={{ fontSize: 11.5 }}>{value} días</span> },
    { headerName: 'Total', field: 'total_ejecuciones', width: 80, filter: 'agNumberColumnFilter' },
    { headerName: 'Exitosas', field: 'exitosas', width: 100, filter: 'agNumberColumnFilter',
      cellRenderer: ({ value, data }) => {
        const total = data?.total_ejecuciones || 0
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return (
          <span style={{ fontSize: 11.5 }}>
            <span style={{ color: 'var(--ok)', fontWeight: 600 }}>{value}</span>
            <span className="qmuted qmono" style={{ marginLeft: 4 }}>({pct}%)</span>
          </span>
        )
      }},
    { headerName: 'Fallidas', field: 'fallidas', width: 90, filter: 'agNumberColumnFilter',
      cellRenderer: ({ value }) => (
        <span style={{ color: value > 0 ? 'var(--crit)' : 'var(--ink-1)', fontWeight: value > 0 ? 600 : 400 }}>
          {value}
        </span>
      )},
    { headerName: 'Última ejecución', field: 'ultimo_estado', minWidth: 220,
      filter: false, cellStyle: { overflow: 'visible' },
      cellRenderer: UltimoEstadoRenderer },
    { headerName: 'Activa', field: 'activa', width: 90, filter: 'agSetColumnFilter',
      cellRenderer: ({ data }) => (
        <Switch checked={data?.activa} size="small"
          onChange={() => toggleActiva(data)} disabled={!esJefe} />
      )},
    { headerName: '', width: 60, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Tooltip title="Editar">
          <Button size="small" type="text" onClick={() => abrirEditar(data)}
            disabled={!esJefe} style={{ color: 'var(--ink-2)' }}>✏️</Button>
        </Tooltip>
      )},
  ], [esJefe])

  return (
    <div>
      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef} rowData={politicas} columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={40} headerHeight={36}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.fallidas > 0 && data?.ultimo_estado === 'fallido')
              return { background: 'rgba(168,32,26,0.05)' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      <Drawer
        title={<QDrawerTitle icon={<CloudServerOutlined />}>
          {editando ? `Editar ${editando.nombre}` : 'Nueva política de backup'}
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
            <div className="qform-section-h">Política</div>
            <div className="qform-section-b">
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
                    <Select>{TIPOS_BACKUP.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}</Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="qform-section-h">Rutas</div>
            <div className="qform-section-b">
              <Form.Item name="ruta_origen" label="Ruta origen" rules={[{ required: true }]}>
                <Input placeholder="/var/lib/postgresql/siaf" />
              </Form.Item>
              <Form.Item name="ruta_destino" label="Ruta destino" rules={[{ required: true }]}>
                <Input placeholder="//NAS-BACKUP/siaf/daily" />
              </Form.Item>
            </div>

            <div className="qform-section-h">Programación</div>
            <div className="qform-section-b">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="frecuencia" label="Frecuencia" rules={[{ required: true }]}>
                    <Select>{FRECUENCIAS.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}</Select>
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
            <Button type="primary" htmlType="submit">{editando ? 'Guardar' : 'Crear'}</Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────
// TAB EJECUCIONES
// ─────────────────────────────────────────────────────────────────────
const TabEjecuciones = forwardRef(function TabEjecuciones({ politicaFiltro, onLimpiarFiltro }, ref) {
  const gridRef = useRef()
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [ejecuciones, setEjecuciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVerif, setModalVerif] = useState(null)
  const [formVerif] = Form.useForm()

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
        exitosa: values.exitosa,
      })
      message.success('Verificación registrada')
      setModalVerif(null); formVerif.resetFields(); cargar()
    } catch { message.error('Error') }
  }
  const exportar = () => gridRef.current?.api.exportDataAsCsv({
    fileName: `ejecuciones_backup_${dayjs().format('YYYYMMDD')}.csv`,
  })
  useImperativeHandle(ref, () => ({ reload: cargar, exportar }), [cargar])

  const columnDefs = useMemo(() => [
    { headerName: 'Estado', field: 'estado', width: 130,
      filter: 'agSetColumnFilter', cellRenderer: EstadoRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: { values: ESTADOS_BACKUP.map(e => e.value) }, pinned: 'left' },
    { headerName: 'Inicio', field: 'inicio', minWidth: 170,
      filter: 'agDateColumnFilter', sort: 'desc',
      valueFormatter: p => p.value ? dayjs(p.value).format('DD/MM/YY HH:mm') : '—',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11.5 }}>{dayjs(value).format('DD/MM/YY HH:mm')}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Fin', field: 'fin', width: 140,
      filter: 'agDateColumnFilter',
      valueFormatter: p => p.value ? dayjs(p.value).format('DD/MM/YY HH:mm') : '—',
      cellRenderer: ({ value }) => value
        ? <span className="qmono qmuted" style={{ fontSize: 11 }}>{dayjs(value).format('DD/MM/YY HH:mm')}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Duración', field: 'duracion_minutos', width: 100,
      filter: false, cellRenderer: DuracionRenderer },
    { headerName: 'Tamaño', field: 'tamanio_gb', width: 100,
      filter: 'agNumberColumnFilter', cellRenderer: TamanioRenderer },
    { headerName: 'Archivos', field: 'archivos_total', width: 110, filter: 'agNumberColumnFilter',
      valueFormatter: p => p.value ? p.value.toLocaleString() : '—',
      cellRenderer: ({ value }) => value
        ? <span className="qmono" style={{ fontSize: 11.5 }}>{value.toLocaleString()}</span>
        : <span className="qmuted">—</span> },
    { headerName: 'Verificación', field: 'verificado', width: 140,
      filter: false, cellStyle: { overflow: 'visible' },
      cellRenderer: VerificadoRenderer },
    { headerName: 'Log', field: 'log', minWidth: 220, filter: 'agTextColumnFilter',
      cellRenderer: ({ value }) => (
        <Tooltip title={value}>
          <span style={{
            fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--f-mono)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'block',
          }}>{value}</span>
        </Tooltip>
      )},
    { headerName: '', width: 120, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        data?.estado === 'exitoso' && !data?.verificado && esJefe
          ? <Button size="small" icon={<SafetyOutlined />} type="primary" ghost
              onClick={() => { setModalVerif(data); formVerif.setFieldsValue({ exitosa: true }) }}>
              Verificar
            </Button>
          : data?.verificado
            ? <QPill tone="ok">✓ Verificado</QPill>
            : null
      )},
  ], [esJefe])

  return (
    <div>
      {politicaFiltro && (
        <Alert className="qalert" type="info" showIcon
          message="Filtrando por política seleccionada"
          action={<Button size="small" onClick={onLimpiarFiltro}>Ver todas</Button>} />
      )}

      <div className={`${AG_THEME_CLASS} qgrid`}>
        <AgGridReact
          ref={gridRef} rowData={ejecuciones} columnDefs={columnDefs}
          {...defaultGridOptions}
          loading={loading} rowHeight={40} headerHeight={36}
          getRowId={p => String(p.data.id)}
          getRowStyle={({ data }) => {
            if (data?.estado === 'fallido') return { background: 'rgba(168,32,26,0.05)' }
            if (data?.estado === 'exitoso' && !data?.verificado) return { background: 'rgba(180,83,9,0.04)' }
            return {}
          }}
          onGridReady={p => p.api.sizeColumnsToFit()}
          onFirstDataRendered={p => p.api.sizeColumnsToFit()}
        />
      </div>

      <Modal
        title={<QDrawerTitle icon={<SafetyOutlined />}>Registrar verificación</QDrawerTitle>}
        open={!!modalVerif}
        onCancel={() => { setModalVerif(null); formVerif.resetFields() }}
        onOk={() => formVerif.submit()}
        okText="Registrar verificación"
        width={520}
      >
        {modalVerif && (
          <Alert className="qalert" type="info" showIcon
            message={`Backup del ${dayjs(modalVerif.inicio).format('DD/MM/YYYY HH:mm')}`}
            description={`Tamaño: ${modalVerif.tamanio_gb} GB · Archivos: ${modalVerif.archivos_total?.toLocaleString()}`} />
        )}
        <Form form={formVerif} layout="vertical" onFinish={verificar} style={{ marginTop: 16 }}>
          <Form.Item name="exitosa" label="Resultado de la verificación" initialValue={true}>
            <Select>
              <Option value={true}>✅ Verificación exitosa — datos íntegros</Option>
              <Option value={false}>❌ Verificación fallida — datos corruptos o incompletos</Option>
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

// ─────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────
export default function BackupPage() {
  const { usuario } = useAuthStore()
  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const [stats, setStats] = useState({})
  const [tecnicos, setTecnicos] = useState([])
  const [politicaFiltro, setPoliticaFiltro] = useState(null)
  const [tabActiva, setTabActiva] = useState('politicas')
  const [loading, setLoading] = useState(false)

  const politicasRef = useRef()
  const ejecucionesRef = useRef()
  const activeRef = tabActiva === 'politicas' ? politicasRef : ejecucionesRef

  useEffect(() => {
    backupService.dashboard().then(({ data }) => setStats(data))
    usuarioService.listarTecnicos().then(({ data }) => setTecnicos(data))
  }, [])

  const verEjecucionesDe = (politica) => {
    setPoliticaFiltro(politica.id); setTabActiva('ejecuciones')
  }
  const handleReload = () => { activeRef.current?.reload(); setLoading(true); setTimeout(() => setLoading(false), 800) }
  const handleExport = () => activeRef.current?.exportar?.()
  const handleNew    = () => activeRef.current?.openNew?.()

  return (
    <div>
      <QPageHeader
        eyebrow="Infraestructura · backup y continuidad"
        title="Backup &"
        titleEm="continuidad"
        subtitle={`${stats.politicas_activas ?? 0} políticas activas · ${stats.tamanio_total_gb ?? 0} GB almacenados · tasa de éxito ${stats.tasa_exito_7d ?? 0}% en los últimos 7 días`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>Actualizar</Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>CSV</Button>
            {esJefe && tabActiva === 'politicas' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}>
                Nueva política
              </Button>
            )}
          </Space>
        }
      />

      {stats.fallidas_semana > 0 && (
        <Alert className="qalert" type="error" showIcon icon={<WarningOutlined />}
          message={`${stats.fallidas_semana} backup(s) fallido(s) en los últimos 7 días`} />
      )}
      {stats.sin_verificar > 0 && (
        <Alert className="qalert" type="warning" showIcon
          message={`${stats.sin_verificar} backup(s) exitoso(s) sin verificar`} />
      )}

      <QKpiRow items={[
        { lbl: 'Políticas activas', val: stats.politicas_activas ?? 0 },
        { lbl: 'Ejecuciones hoy',   val: stats.ejecuciones_hoy ?? 0 },
        { lbl: 'Exitosas hoy',      val: stats.exitosas_hoy ?? 0,     tone: 'ok' },
        { lbl: 'Fallidas hoy',      val: stats.fallidas_hoy ?? 0,
          tone: stats.fallidas_hoy > 0 ? 'crit' : 'ok' },
        { lbl: 'Fallidas 7 días',   val: stats.fallidas_semana ?? 0,
          tone: stats.fallidas_semana > 0 ? 'crit' : 'ok' },
        { lbl: 'Sin verificar',     val: stats.sin_verificar ?? 0,
          tone: stats.sin_verificar > 0 ? 'warn' : 'ok' },
        { lbl: 'Total almacenado',  val: `${stats.tamanio_total_gb ?? 0} GB`, tone: 'info' },
        { lbl: 'Tasa éxito 7d',     val: `${stats.tasa_exito_7d ?? 0}%`,
          tone: (stats.tasa_exito_7d ?? 0) >= 95 ? 'ok' : 'crit' },
      ]} />

      <Tabs
        className="qtabs"
        activeKey={tabActiva}
        onChange={k => { setTabActiva(k); if (k !== 'ejecuciones') setPoliticaFiltro(null) }}
        items={[
          {
            key: 'politicas',
            label: <span><CloudServerOutlined /> Políticas ({stats.total_politicas || 0})</span>,
            children: <TabPoliticas ref={politicasRef} tecnicos={tecnicos} onSeleccionarPolitica={verEjecucionesDe} />,
          },
          {
            key: 'ejecuciones',
            label: (
              <span>
                <FileTextOutlined /> Ejecuciones
                {stats.fallidas_semana > 0 && (
                  <span style={{ marginLeft: 6 }}>
                    <QPill tone="crit">{stats.fallidas_semana} fallidas</QPill>
                  </span>
                )}
              </span>
            ),
            children: <TabEjecuciones ref={ejecucionesRef}
              politicaFiltro={politicaFiltro}
              onLimpiarFiltro={() => setPoliticaFiltro(null)} />,
          },
        ]}
      />
    </div>
  )
}
