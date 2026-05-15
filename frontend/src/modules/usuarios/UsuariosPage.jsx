import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  Button, Space, Tag, Modal, Form, Input, Select, Switch,
  Tooltip, Popconfirm, Typography, message, Drawer, Divider,
  Badge, Upload, Row, Col,
} from 'antd'
import {
  PlusOutlined, EditOutlined, ReloadOutlined,
  KeyOutlined, UserOutlined, TeamOutlined,
  CheckCircleOutlined, StopOutlined, ExportOutlined,
  CameraOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { usuarioService, ROLES, TURNOS, getRolLabel, getRolColor } from '../../services/usuarioService'
import { configuracionService } from '../../services/configuracionService'
import { defaultGridOptions, AG_THEME_CLASS } from '../../utils/agGridConfig'
import { useAuthStore } from '../../store/authStore'
import KpiStrip from '../../components/common/KpiStrip'

const { Title, Text } = Typography
const { Option } = Select

// ── CELL RENDERERS ────────────────────────────────────────────────────────────
const RolRenderer = ({ value }) => (
  <Tag color={getRolColor(value)} style={{ margin: 0 }}>
    {getRolLabel(value)}
  </Tag>
)

const EstadoRenderer = ({ value }) =>
  value
    ? <Badge status="success" text="Activo" />
    : <Badge status="error"   text="Inactivo" />

const FechaRenderer = ({ value }) =>
  value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—'

const NombreRenderer = ({ data }) => (
  <Space>
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: '#1677ff', color: '#fff', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 600,
    }}>
      {data?.foto_url
        ? <img src={data.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <>{data?.nombre?.[0]}{data?.apellido?.[0]}</>
      }
    </div>
    <div>
      <div style={{ fontWeight: 500, fontSize: 13 }}>{data?.nombre} {data?.apellido}</div>
      <div style={{ color: '#888', fontSize: 11 }}>{data?.username}</div>
    </div>
  </Space>
)

// ── COMPONENTE FOTO UPLOAD ────────────────────────────────────────────────────
function FotoUpload({ value, onChange }) {
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
        if (file.size > 2 * 1024 * 1024) { message.error('Máx. 2 MB'); return false }
        return true
      }}
    >
      <div style={{
        width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
        background: value ? 'transparent' : '#f0f5ff',
        border: '2px dashed #1677ff', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {value
          ? <img src={value} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Space direction="vertical" align="center" size={0}>
              <CameraOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <Text style={{ fontSize: 10, color: '#1677ff' }}>
                {uploading ? 'Subiendo...' : 'Foto'}
              </Text>
            </Space>
        }
        {value && (
          <div style={{
            position: 'absolute', bottom: 0, width: '100%',
            background: 'rgba(0,0,0,0.45)', textAlign: 'center',
            padding: '2px 0',
          }}>
            <CameraOutlined style={{ color: '#fff', fontSize: 12 }} />
          </div>
        )}
      </div>
    </Upload>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
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

  // ── Carga de datos ──────────────────────────────────────────────────────────
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

  // ── Abrir drawer ────────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setEditando(null)
    setFotoUrl(null)
    form.resetFields()
    form.setFieldsValue({ activo: true, carga_maxima: 10 })
    setDrawerOpen(true)
  }

  const abrirEditar = (usuario) => {
    setEditando(usuario)
    setFotoUrl(usuario.foto_url || null)
    form.setFieldsValue({ ...usuario })
    setDrawerOpen(true)
  }

  // ── Guardar ─────────────────────────────────────────────────────────────────
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

  // ── Acciones ────────────────────────────────────────────────────────────────
  const desactivar = async (id) => {
    try {
      await usuarioService.desactivar(id)
      message.success('Usuario desactivado')
      cargarUsuarios()
    } catch (err) { message.error(err.response?.data?.detail || 'Error') }
  }

  const resetearPw = async (id, username) => {
    try {
      const { data } = await usuarioService.resetearPassword(id)
      Modal.success({
        title: 'Contraseña reseteada',
        content: (
          <div>
            <p>La contraseña temporal de <strong>{username}</strong> es:</p>
            <div style={{
              background: '#f5f5f5', padding: '8px 12px',
              borderRadius: 6, fontFamily: 'monospace', fontSize: 16, marginTop: 8,
            }}>
              {data.message.split(': ')[1]}
            </div>
            <p style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
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

  // ── KPI items ───────────────────────────────────────────────────────────────
  const kpiItems = [
    { label: 'Total usuarios',   value: stats.total              || 0, color: '#64748b' },
    { label: 'Jefes',            value: stats.jefe               || 0, color: '#7c3aed' },
    { label: 'Especialistas',    value: stats.especialista        || 0, color: '#0e7490' },
    { label: 'Mesa de ayuda',    value: stats.mesa_ayuda          || 0, color: '#7e22ce' },
    { label: 'Alta dirección',   value: stats.alta_direccion      || 0, color: '#b91c1c' },
    { label: 'Usuarios finales', value: stats.usuario_final       || 0, color: '#475569' },
  ]

  // ── Columnas AG Grid ────────────────────────────────────────────────────────
  const columnDefs = useMemo(() => [
    {
      headerName: '', width: 44, checkboxSelection: true,
      headerCheckboxSelection: true, pinned: 'left',
      suppressMenu: true, sortable: false, filter: false,
    },
    {
      headerName: 'Usuario', field: 'nombre', minWidth: 220,
      pinned: 'left', filter: 'agTextColumnFilter',
      cellRenderer: NombreRenderer,
      valueGetter: (p) => `${p.data?.nombre} ${p.data?.apellido}`,
    },
    {
      headerName: 'Correo', field: 'email', minWidth: 220,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Rol', field: 'rol', width: 150,
      filter: 'agSetColumnFilter',
      cellRenderer: RolRenderer,
      filterParams: {
        values: ROLES.map(r => r.value),
        valueFormatter: (p) => getRolLabel(p.value),
      },
    },
    {
      headerName: 'Área', field: 'area', minWidth: 180,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Estado', field: 'activo', width: 110,
      filter: 'agSetColumnFilter',
      cellRenderer: EstadoRenderer,
    },
    {
      headerName: 'Último acceso', field: 'ultimo_acceso', width: 160,
      filter: 'agDateColumnFilter',
      cellRenderer: FechaRenderer,
      sort: 'desc',
    },
    {
      headerName: 'Acciones', width: 140, pinned: 'right',
      sortable: false, filter: false, suppressMenu: true,
      cellRenderer: ({ data }) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} type="text"
              onClick={() => abrirEditar(data)} disabled={!esJefe} />
          </Tooltip>
          <Tooltip title="Resetear contraseña">
            <Button size="small" icon={<KeyOutlined />} type="text"
              onClick={() => resetearPw(data.id, data.username)} disabled={!esJefe} />
          </Tooltip>
          <Tooltip title={data.activo ? 'Desactivar' : 'Activar'}>
            <Popconfirm
              title={`¿${data.activo ? 'Desactivar' : 'Activar'} a ${data.nombre}?`}
              onConfirm={() => desactivar(data.id)}
              disabled={!esJefe || data.id === usuarioActual?.id}
            >
              <Button
                size="small"
                icon={data.activo ? <StopOutlined /> : <CheckCircleOutlined />}
                type="text" danger={data.activo}
                disabled={!esJefe || data.id === usuarioActual?.id}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ], [esJefe, usuarioActual])

  const defaultColDef = useMemo(() => ({
    sortable: true, resizable: true, filter: true,
  }), [])

  return (
    <div>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          Gestión de usuarios
        </Title>
        <Space>
          <Switch
            checked={filtroActivo}
            onChange={setFiltroActivo}
            checkedChildren="Activos"
            unCheckedChildren="Inactivos"
          />
          <Button icon={<ReloadOutlined />} onClick={cargarUsuarios} loading={loading}>
            Actualizar
          </Button>
          <Button icon={<ExportOutlined />} onClick={exportarCSV}>
            Exportar CSV
          </Button>
          {esJefe && (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nuevo usuario
            </Button>
          )}
        </Space>
      </div>

      {/* ── KPI STRIP ──────────────────────────────────────────────────────── */}
      <KpiStrip items={kpiItems} />

      {/* ── AG GRID ────────────────────────────────────────────────────────── */}
      <div className={`${AG_THEME_CLASS} grid-container`}>
        <AgGridReact
          ref={gridRef}
          rowData={usuarios}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          {...defaultGridOptions}
          loading={loading}
          rowHeight={52}
          headerHeight={40}
          getRowId={(p) => String(p.data.id)}
          onGridReady={(p) => p.api.sizeColumnsToFit()}
          onFirstDataRendered={(p) => p.api.sizeColumnsToFit()}
        />
      </div>

      {/* ── DRAWER CREAR / EDITAR ───────────────────────────────────────────── */}
      <Drawer
        title={editando ? `Editar: ${editando.nombre} ${editando.apellido}` : 'Nuevo usuario'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={580}
        extra={
          <Button type="primary" onClick={() => form.submit()}>
            {editando ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={guardar}>

          {/* Foto */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Form.Item name="foto_url" noStyle>
              <FotoUpload value={fotoUrl} onChange={setFotoUrl} />
            </Form.Item>
          </div>

          <Divider orientation="left" plain>Datos personales</Divider>
          <Row gutter={12}>
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
          <Row gutter={12}>
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

          <Divider orientation="left" plain>Cuenta y acceso</Divider>
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

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="rol" label="Rol" rules={[{ required: true }]}>
                <Select>
                  {ROLES.map(r => (
                    <Option key={r.value} value={r.value}>
                      <Tag color={r.color} style={{ margin: 0 }}>{r.label}</Tag>
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

          <Divider orientation="left" plain>Organización</Divider>
          <Row gutter={12}>
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
            extra="Separados por coma: redes,servidores,impresoras">
            <Input placeholder="redes,servidores,windows,office" />
          </Form.Item>
          <Form.Item name="carga_maxima" label="Carga máxima de tickets">
            <Input type="number" min={1} max={100} />
          </Form.Item>

          {editando && (
            <Form.Item name="activo" label="Estado" valuePropName="checked">
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </div>
  )
}
