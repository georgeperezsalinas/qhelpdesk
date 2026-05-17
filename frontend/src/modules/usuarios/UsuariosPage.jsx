// ─────────────────────────────────────────────────────────────────────
// src/modules/usuarios/UsuariosPage.jsx
// Rediseño v2 — Gestión de usuarios
// Drop-in: mantiene usuarioService, AG Grid, drawer crear/editar,
// upload de foto, reset de contraseña y permisos por rol.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Modal, Form, Input, Select, Switch,
  Tooltip, Popconfirm, Typography, message, Drawer, Divider,
  Upload, Row, Col,
} from 'antd'
import {
  PlusOutlined, EditOutlined, ReloadOutlined,
  KeyOutlined, UserOutlined,
  CheckCircleOutlined, StopOutlined, ExportOutlined,
  CameraOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { usuarioService, ROLES, TURNOS, getRolLabel, getRolColor } from '../../services/usuarioService'
import { configuracionService } from '../../services/configuracionService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import './UsuariosPage.css'

const { Text } = Typography
const { Option } = Select

// ── Util ────────────────────────────────────────────────────────────────
function initials(n, a) {
  return `${(n || '')[0] || ''}${(a || '')[0] || ''}`.toUpperCase() || '—'
}

// Color de avatar por rol — paleta del nuevo sistema
const ROL_COLOR = {
  jefe:            '#7C2D12',
  especialista:    '#0E5460',
  mesa_ayuda:      '#6B21A8',
  alta_direccion:  '#A8201A',
  usuario_final:   '#3C3933',
  usuario_externo: '#9A4708',
}
const ROL_CLS = {
  jefe:            'plum',
  especialista:    'info',
  mesa_ayuda:      'plum',
  alta_direccion:  'crit',
  usuario_final:   'muted',
  usuario_externo: 'warn',
}

// ── Cell renderers ──────────────────────────────────────────────────────
const NombreRenderer = ({ data }) => (
  <div className="qu-cell">
    <span className="qu-av" style={{ background: ROL_COLOR[data?.rol] || 'var(--ink-2)' }}>
      {data?.foto_url
        ? <img src={data.foto_url} alt="" />
        : initials(data?.nombre, data?.apellido)}
    </span>
    <div className="qu-cell-text">
      <div className="qu-cell-name">{data?.nombre} {data?.apellido}</div>
      <div className="qu-cell-sub qmono">@{data?.username}</div>
    </div>
  </div>
)

const RolRenderer = ({ value }) => (
  <span className={`qpill ${ROL_CLS[value] || 'muted'}`}>
    <span className="qpill-dot" />{getRolLabel(value)}
  </span>
)

const EstadoRenderer = ({ value }) =>
  value
    ? <span className="qpill ok"><span className="qpill-dot" />Activo</span>
    : <span className="qpill muted"><span className="qpill-dot" />Inactivo</span>

const FechaRenderer = ({ value }) =>
  value
    ? <span className="qmono qmuted" style={{ fontSize: 11 }}>{dayjs(value).format('DD/MM/YY HH:mm')}</span>
    : <span className="qmuted">—</span>

const EmailRenderer = ({ value }) => value
  ? <span className="qmono" style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{value}</span>
  : <span className="qmuted">—</span>

// ── Foto upload ────────────────────────────────────────────────────────
function FotoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const { data } = await configuracionService.subirArchivo(file)
      onChange(data.url)
      onSuccess(data)
      message.success('Foto subida')
    } catch (err) { onError(err); message.error('Error al subir la foto') }
    finally { setUploading(false) }
  }

  return (
    <Upload
      accept="image/*"
      showUploadList={false}
      customRequest={handleUpload}
      beforeUpload={(file) => {
        if (!file.type.startsWith('image/')) { message.error('Solo imágenes'); return false }
        if (file.size > 2 * 1024 * 1024) { message.error('Máx. 2 MB'); return false }
        return true
      }}
    >
      <div className={`qu-foto ${value ? 'has-img' : ''}`}>
        {value
          ? <img src={value} alt="foto" />
          : <div className="qu-foto-empty">
              <CameraOutlined style={{ fontSize: 22, color: 'var(--acc)' }} />
              <span>{uploading ? 'Subiendo…' : 'Agregar foto'}</span>
            </div>
        }
        {value && (
          <div className="qu-foto-hover">
            <CameraOutlined /> Cambiar
          </div>
        )}
      </div>
    </Upload>
  )
}

// ── Componente principal ───────────────────────────────────────────────
export default function UsuariosPage() {
  const gridRef = useRef()
  const { usuario: usuarioActual } = useAuthStore()
  const esJefe = usuarioActual?.rol === 'jefe'

  const [usuarios, setUsuarios]         = useState([])
  const [loading, setLoading]           = useState(false)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [editando, setEditando]         = useState(null)
  const [filtroActivo, setFiltroActivo] = useState(true)
  const [stats, setStats]               = useState({})
  const [fotoUrl, setFotoUrl]           = useState(null)
  const [form] = Form.useForm()

  const cargarUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await usuarioService.listar({ activo: filtroActivo, limit: 200 })
      setUsuarios(data)
      const s = { total: data.length }
      ROLES.forEach(r => { s[r.value] = data.filter(u => u.rol === r.value).length })
      setStats(s)
    } catch { message.error('Error al cargar usuarios') }
    finally  { setLoading(false) }
  }, [filtroActivo])

  useEffect(() => { cargarUsuarios() }, [cargarUsuarios])

  const abrirNuevo = () => {
    setEditando(null); setFotoUrl(null); form.resetFields()
    form.setFieldsValue({ activo: true, carga_maxima: 10 })
    setDrawerOpen(true)
  }
  const abrirEditar = (u) => {
    setEditando(u); setFotoUrl(u.foto_url || null)
    form.setFieldsValue({ ...u })
    setDrawerOpen(true)
  }

  const guardar = async (values) => {
    try {
      const payload = { ...values, foto_url: fotoUrl }
      if (editando) {
        const { password, ...resto } = payload
        await usuarioService.actualizar(editando.id, resto)
        message.success('Usuario actualizado')
      } else {
        await usuarioService.crear(payload)
        message.success('Usuario creado correctamente')
      }
      setDrawerOpen(false)
      cargarUsuarios()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al guardar')
    }
  }

  const desactivar = async (id) => {
    try { await usuarioService.desactivar(id); message.success('Usuario desactivado'); cargarUsuarios() }
    catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const resetearPw = async (id, username) => {
    try {
      const { data } = await usuarioService.resetearPassword(id)
      Modal.success({
        title: 'Contraseña reseteada',
        content: (
          <div>
            <p style={{ marginBottom: 8 }}>
              La contraseña temporal de <strong>{username}</strong> es:
            </p>
            <div style={{
              background: 'var(--bg-tinted)', padding: '10px 14px',
              borderRadius: 6, fontFamily: 'var(--f-mono)', fontSize: 15,
              border: '1px solid var(--line-1)', userSelect: 'all',
            }}>
              {data.message.split(': ')[1]}
            </div>
            <p style={{ marginTop: 10, color: 'var(--ink-3)', fontSize: 12 }}>
              El usuario deberá cambiarla en su primer acceso.
            </p>
          </div>
        ),
      })
    } catch { message.error('Error al resetear contraseña') }
  }

  const exportarCSV = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `usuarios_${dayjs().format('YYYYMMDD')}.csv`,
    })
  }

  // ── Columnas ────────────────────────────────────────────────────────
  const columnDefs = useMemo(() => [
    { headerName: '', width: 40, checkboxSelection: true,
      headerCheckboxSelection: true, pinned: 'left',
      suppressMenu: true, sortable: false, filter: false },
    { headerName: 'Usuario', field: 'nombre', minWidth: 230,
      pinned: 'left', filter: 'agTextColumnFilter',
      cellRenderer: NombreRenderer,
      valueGetter: (p) => `${p.data?.nombre} ${p.data?.apellido}` },
    { headerName: 'Correo', field: 'email', minWidth: 220,
      filter: 'agTextColumnFilter', cellRenderer: EmailRenderer },
    { headerName: 'Rol', field: 'rol', width: 160,
      filter: 'agSetColumnFilter', cellRenderer: RolRenderer,
      cellStyle: { overflow: 'visible' },
      filterParams: {
        values: ROLES.map(r => r.value),
        valueFormatter: (p) => getRolLabel(p.value),
      }},
    { headerName: 'Área', field: 'area', minWidth: 180,
      filter: 'agTextColumnFilter' },
    { headerName: 'Estado', field: 'activo', width: 110,
      filter: 'agSetColumnFilter',
      cellRenderer: EstadoRenderer, cellStyle: { overflow: 'visible' }},
    { headerName: 'Último acceso', field: 'ultimo_acceso', width: 160,
      filter: 'agDateColumnFilter',
      cellRenderer: FechaRenderer, sort: 'desc' },
    { headerName: '', width: 130, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Space size={2}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} type="text"
              style={{ color: 'var(--ink-2)' }}
              onClick={() => abrirEditar(data)} disabled={!esJefe} />
          </Tooltip>
          <Tooltip title="Resetear contraseña">
            <Button size="small" icon={<KeyOutlined />} type="text"
              style={{ color: 'var(--acc)' }}
              onClick={() => resetearPw(data.id, data.username)} disabled={!esJefe} />
          </Tooltip>
          <Tooltip title={data.activo ? 'Desactivar' : 'Activar'}>
            <Popconfirm
              title={`¿${data.activo ? 'Desactivar' : 'Activar'} a ${data.nombre}?`}
              onConfirm={() => desactivar(data.id)}
              disabled={!esJefe || data.id === usuarioActual?.id}
            >
              <Button size="small"
                icon={data.activo ? <StopOutlined /> : <CheckCircleOutlined />}
                type="text" danger={data.activo}
                disabled={!esJefe || data.id === usuarioActual?.id} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )},
  ], [esJefe, usuarioActual])

  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true, filter: true }), [])

  return (
    <div className="qusuarios">

      {/* Header editorial */}
      <div className="qph" style={{ marginBottom: 22 }}>
        <div className="qph-eyebrow"><span className="qph-dot" />Administración · usuarios y roles</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="qph-title">Gestión de <em>usuarios</em></h1>
            <p className="qph-sub" style={{ marginTop: 8 }}>
              {stats.total ?? 0} cuentas {filtroActivo ? 'activas' : 'inactivas'} · administra accesos, roles, áreas y skills técnicos.
            </p>
          </div>
          <Space>
            <Switch
              checked={filtroActivo}
              onChange={setFiltroActivo}
              checkedChildren="Activos"
              unCheckedChildren="Inactivos"
            />
            <Button icon={<ReloadOutlined />} onClick={cargarUsuarios} loading={loading}>Actualizar</Button>
            <Button icon={<ExportOutlined />} onClick={exportarCSV}>Exportar CSV</Button>
            {esJefe && (
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                Nuevo usuario
              </Button>
            )}
          </Space>
        </div>
        <span className="qph-rule" />
      </div>

      {/* KPI strip por rol */}
      <div className="qkpi-row qu-kpi">
        {[
          { lbl: 'Total',           val: stats.total ?? 0 },
          { lbl: 'Jefes',           val: stats.jefe ?? 0,             tone: 'plum' },
          { lbl: 'Especialistas',   val: stats.especialista ?? 0,     tone: 'info' },
          { lbl: 'Mesa de ayuda',   val: stats.mesa_ayuda ?? 0,       tone: 'plum' },
          { lbl: 'Alta dirección',  val: stats.alta_direccion ?? 0,   tone: 'crit' },
          { lbl: 'Usuarios finales',val: stats.usuario_final ?? 0 },
          { lbl: 'Externos',        val: stats.usuario_externo ?? 0,  tone: 'warn' },
        ].map((k, i, arr) => (
          <div key={k.lbl} className="qkpi-cell" style={{
            borderRight: i < arr.length - 1 ? '1px solid var(--line-2)' : 'none',
          }}>
            <div className="qkpi-lbl">{k.lbl}</div>
            <div className={`qkpi-cell-val tone-${k.tone || 'neutral'}`}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="qtoolbar">
        <span className="qmuted qmono" style={{ fontSize: 11 }}>
          {usuarios.length} registros · {filtroActivo ? 'mostrando solo activos' : 'mostrando solo inactivos'}
        </span>
      </div>

      {/* Grid */}
      <div className={`${AG_THEME_CLASS} qgrid qu-grid`}>
        <AgGridReact
          ref={gridRef}
          rowData={usuarios}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          {...defaultGridOptions}
          loading={loading}
          rowHeight={56}
          headerHeight={36}
          getRowId={(p) => String(p.data.id)}
          onGridReady={(p) => p.api.sizeColumnsToFit()}
          onFirstDataRendered={(p) => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* Drawer crear/editar */}
      <Drawer
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--acc-soft)', color: 'var(--acc-ink)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {editando ? <EditOutlined /> : <PlusOutlined />}
            </span>
            <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontSize: 22 }}>
              {editando ? `Editar usuario` : 'Nuevo usuario'}
            </span>
          </span>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={620}
        styles={{
          body:   { padding: 0, background: 'var(--bg-canvas)' },
          header: { borderBottom: '1px solid var(--line-1)', background: 'var(--bg-canvas)' },
        }}
        extra={
          <Button type="primary" onClick={() => form.submit()}>
            {editando ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={guardar}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* Foto + datos personales */}
            <div className="qform-section-h">
              <UserOutlined /> Datos personales
            </div>
            <div className="qform-section-b">
              <div className="qu-foto-row">
                <Form.Item name="foto_url" noStyle>
                  <FotoUpload value={fotoUrl} onChange={setFotoUrl} />
                </Form.Item>
                <div className="qu-foto-hint">
                  <div className="qmono" style={{ color: 'var(--ink-2)', fontWeight: 500, marginBottom: 4 }}>
                    Foto de perfil
                  </div>
                  <div className="qmuted" style={{ fontSize: 11.5, lineHeight: 1.55 }}>
                    Sube una imagen cuadrada (JPG o PNG, máx. 2 MB).
                    Si no agregas foto, mostraremos las iniciales del usuario.
                  </div>
                </div>
              </div>

              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="apellido" label="Apellido" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="email" label="Correo electrónico"
                rules={[{ required: true }, { type: 'email' }]}>
                <Input />
              </Form.Item>

              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item name="telefono" label="Teléfono">
                    <Input placeholder="01-XXXXXXX" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="celular" label="Celular">
                    <Input placeholder="9XXXXXXXX" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Cuenta y acceso */}
            <div className="qform-section-h">
              <KeyOutlined /> Cuenta y acceso
            </div>
            <div className="qform-section-b">
              <Form.Item name="username" label="Usuario (login)"
                rules={[{ required: true }]}
                extra={editando ? 'El nombre de usuario no se puede cambiar' : ''}>
                <Input disabled={!!editando} />
              </Form.Item>

              {!editando && (
                <Form.Item name="password" label="Contraseña inicial"
                  rules={[{ required: true }, { min: 8 }]}>
                  <Input.Password />
                </Form.Item>
              )}

              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item name="rol" label="Rol" rules={[{ required: true }]}>
                    <Select>
                      {ROLES.map(r => (
                        <Option key={r.value} value={r.value}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ROL_COLOR[r.value] || r.color }} />
                            {r.label}
                          </span>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="turno" label="Turno">
                    <Select allowClear placeholder="Sin turno asignado">
                      {TURNOS.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Organización */}
            <div className="qform-section-h">
              <UserOutlined /> Organización
            </div>
            <div className="qform-section-b">
              <Row gutter={14}>
                <Col span={12}>
                  <Form.Item name="cargo" label="Cargo">
                    <Input placeholder="Ej: Especialista en Redes" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="area" label="Área">
                    <Input placeholder="Ej: Oficina de Sistemas" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="skills" label="Skills técnicos"
                extra="Separados por coma">
                <Input placeholder="redes,servidores,windows,office" />
              </Form.Item>
              <Form.Item name="carga_maxima" label="Carga máxima de tickets simultáneos">
                <Input type="number" min={1} max={100} />
              </Form.Item>

              {editando && (
                <Form.Item name="activo" label="Estado de la cuenta" valuePropName="checked">
                  <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                </Form.Item>
              )}
            </div>
          </div>

          <div className="qform-footer">
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit"
              icon={editando ? <EditOutlined /> : <PlusOutlined />}>
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}
