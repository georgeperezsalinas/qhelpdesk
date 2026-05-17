// ─────────────────────────────────────────────────────────────────────
// src/modules/conocimiento/ConocimientoPage.jsx
// Rediseño v2 — Base de conocimiento (admin)
// Drop-in: mantiene conocimientoService (listarAdmin, crear, actualizar,
// eliminar), filtros por categoría/estado/búsqueda, drawers crear/ver/editar.
// Requiere: qmodules.css y qhelpers.jsx cargados.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import {
  Button, Space, Input, Select, Drawer, Form, Tooltip, message,
  Popconfirm, Badge, Table, Tag,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, LikeOutlined, CheckCircleOutlined,
  BookOutlined, SearchOutlined, TagOutlined,
} from '@ant-design/icons'
import {
  conocimientoService, CATEGORIAS_KB, ESTADOS_ARTICULO,
} from '../../services/conocimientoService'
import { useAuthStore } from '../../store/authStore'
import { QPageHeader, QKpiRow, QPill, QDrawerTitle } from '../../components/common/qhelpers'

const { TextArea } = Input
const { Option } = Select

// Mapeo categoría → tono pill
const CAT_TONE = {
  hardware: 'info', software: 'plum', red: 'warn',
  acceso: 'plum', vpn: 'info', correo: 'plum',
  impresora: 'ok', telefonia: 'warn', servidor: 'info',
  seguridad: 'crit', mantenimiento: 'warn', otro: 'muted',
}
const ESTADO_TONE = {
  borrador: 'muted', publicado: 'ok', archivado: 'muted',
}

const catLabel  = (v) => CATEGORIAS_KB.find(c => c.value === v)?.label ?? v
const estadoObj = (v) => ESTADOS_ARTICULO.find(e => e.value === v) ?? { label: v, color: 'default' }

// ── DRAWER CREAR / EDITAR ─────────────────────────────────────────────
function DrawerArticulo({ articulo, onClose, onGuardado }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (articulo) {
      form.setFieldsValue({
        titulo: articulo.titulo, contenido: articulo.contenido,
        categoria: articulo.categoria, tags: articulo.tags,
        estado: articulo.estado,
      })
    } else {
      form.resetFields()
      form.setFieldValue('estado', 'borrador')
    }
  }, [articulo, form])

  const guardar = async () => {
    try {
      const vals = await form.validateFields()
      setLoading(true)
      if (articulo) {
        await conocimientoService.actualizar(articulo.id, vals)
        message.success('Artículo actualizado')
      } else {
        await conocimientoService.crear(vals)
        message.success('Artículo creado')
      }
      onGuardado()
    } catch (err) {
      if (err?.errorFields) return
      message.error('Error al guardar')
    } finally { setLoading(false) }
  }

  return (
    <Drawer
      open onClose={onClose}
      title={<QDrawerTitle icon={<BookOutlined />}>
        {articulo ? 'Editar artículo' : 'Nuevo artículo'}
      </QDrawerTitle>}
      width={680}
      styles={{
        body: { padding: 0, background: 'var(--bg-canvas)' },
        header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
      }}
    >
      <Form form={form} layout="vertical" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="qform-section-h"><BookOutlined /> Información del artículo</div>
          <div className="qform-section-b">
            <Form.Item name="titulo" label="Título"
              rules={[{ required: true, message: 'Requerido' }]}>
              <Input placeholder="Ej: Cómo conectarse a la VPN corporativa"
                maxLength={300} size="large" />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="categoria" label="Categoría">
                <Select placeholder="Seleccionar" allowClear>
                  {CATEGORIAS_KB.map(c => (
                    <Option key={c.value} value={c.value}>{c.label}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="estado" label="Estado" rules={[{ required: true }]}>
                <Select>
                  {ESTADOS_ARTICULO.map(e => (
                    <Option key={e.value} value={e.value}>
                      <Badge status={e.color} text={e.label} />
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            <Form.Item name="tags" label="Tags"
              help="Separados por comas: vpn, windows, acceso remoto">
              <Input prefix={<TagOutlined style={{ color: 'var(--ink-4)' }} />}
                placeholder="vpn, windows, acceso remoto" maxLength={300} />
            </Form.Item>
          </div>

          <div className="qform-section-h">Contenido</div>
          <div className="qform-section-b">
            <Form.Item name="contenido" label="Cuerpo del artículo"
              rules={[{ required: true, message: 'Requerido' }]}
              style={{ marginBottom: 6 }}>
              <TextArea rows={16}
                placeholder="Describe paso a paso la solución. Usa saltos de línea para separar pasos."
                maxLength={10000} showCount
                style={{ fontFamily: 'var(--f-ui)', fontSize: 13, lineHeight: 1.65 }} />
            </Form.Item>
          </div>
        </div>
        <div className="qform-footer">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" loading={loading} onClick={guardar}>
            {articulo ? 'Guardar cambios' : 'Crear artículo'}
          </Button>
        </div>
      </Form>
    </Drawer>
  )
}

// ── DRAWER VER (lectura) ──────────────────────────────────────────────
function DrawerVer({ articulo, onClose }) {
  if (!articulo) return null
  const tags = articulo.tags ? articulo.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  const utilPct = (articulo.util_si + articulo.util_no) > 0
    ? Math.round((articulo.util_si / (articulo.util_si + articulo.util_no)) * 100)
    : null

  return (
    <Drawer
      open onClose={onClose}
      title={<QDrawerTitle icon={<BookOutlined />}>Artículo</QDrawerTitle>}
      width={760}
      styles={{
        body: { padding: '24px 32px', background: 'var(--bg-canvas)' },
        header: { background: 'var(--bg-canvas)', borderBottom: '1px solid var(--line-1)' },
      }}
    >
      {/* Eyebrow + título editorial */}
      <div style={{ marginBottom: 22 }}>
        <div className="qmono" style={{
          fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          {articulo.categoria ? catLabel(articulo.categoria) : 'Sin categoría'}
          {articulo.autor_nombre && <> · POR {articulo.autor_nombre.toUpperCase()}</>}
        </div>
        <h1 style={{
          fontFamily: 'var(--f-display)',
          fontSize: 36, lineHeight: 1.1, margin: 0,
          color: 'var(--ink-1)', letterSpacing: '-0.02em', fontWeight: 400,
        }}>{articulo.titulo}</h1>
      </div>

      {/* Meta strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        paddingBottom: 16, borderBottom: '1px solid var(--line-1)', marginBottom: 22,
      }}>
        <QPill tone={ESTADO_TONE[articulo.estado] || 'muted'}>{estadoObj(articulo.estado).label}</QPill>
        {articulo.categoria && (
          <QPill tone={CAT_TONE[articulo.categoria] || 'muted'}>{catLabel(articulo.categoria)}</QPill>
        )}
        {tags.map(t => <QPill key={t} tone="muted" icon={<TagOutlined style={{ fontSize: 9 }} />}>{t}</QPill>)}
        <span style={{ flex: 1 }} />
        <span className="qmuted qmono" style={{ fontSize: 11 }}>
          <EyeOutlined style={{ marginRight: 4 }} />{articulo.vistas} vistas
        </span>
        {utilPct !== null && (
          <span className="qmuted qmono" style={{ fontSize: 11 }}>
            <LikeOutlined style={{ marginRight: 4 }} />{utilPct}% útil
          </span>
        )}
      </div>

      {/* Contenido */}
      <div style={{
        whiteSpace: 'pre-wrap',
        lineHeight: 1.75,
        fontSize: 14,
        color: 'var(--ink-2)',
        fontFamily: 'var(--f-ui)',
      }}>
        {articulo.contenido}
      </div>
    </Drawer>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────
export default function ConocimientoPage() {
  const { usuario } = useAuthStore()
  const [articulos, setArticulos] = useState([])
  const [loading, setLoading]     = useState(false)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEst, setFiltroEst] = useState(null)
  const [filtroCat, setFiltroCat] = useState(null)
  const [drawerNuevo, setDrawerNuevo] = useState(false)
  const [drawerEdit, setDrawerEdit]   = useState(null)
  const [drawerVer, setDrawerVer]     = useState(null)

  const esJefe = ['jefe', 'especialista'].includes(usuario?.rol)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (busqueda.trim()) params.busqueda = busqueda.trim()
      if (filtroEst)       params.estado = filtroEst
      if (filtroCat)       params.categoria = filtroCat
      const { data } = await conocimientoService.listarAdmin(params)
      setArticulos(data)
    } catch { message.error('Error al cargar artículos') }
    finally  { setLoading(false) }
  }, [busqueda, filtroEst, filtroCat])

  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 400 : 0)
    return () => clearTimeout(t)
  }, [cargar])

  const eliminar = async (id) => {
    try {
      await conocimientoService.eliminar(id)
      message.success('Artículo eliminado'); cargar()
    } catch { message.error('Error al eliminar') }
  }
  const cambiarEstado = async (articulo, nuevoEstado) => {
    try {
      await conocimientoService.actualizar(articulo.id, { estado: nuevoEstado })
      message.success(`Artículo ${nuevoEstado === 'publicado' ? 'publicado' : 'archivado'}`)
      cargar()
    } catch { message.error('Error al cambiar estado') }
  }

  // Stats derivadas
  const total = articulos.length
  const publicados = articulos.filter(a => a.estado === 'publicado').length
  const borradores = articulos.filter(a => a.estado === 'borrador').length
  const archivados = articulos.filter(a => a.estado === 'archivado').length
  const vistas = articulos.reduce((s, a) => s + (a.vistas || 0), 0)
  const utiles = articulos.reduce((s, a) => s + (a.util_si || 0), 0)
  const noUtiles = articulos.reduce((s, a) => s + (a.util_no || 0), 0)
  const utilPct = (utiles + noUtiles) > 0
    ? Math.round((utiles / (utiles + noUtiles)) * 100)
    : null

  // Columnas de tabla
  const cols = [
    {
      title: 'Título', dataIndex: 'titulo', key: 'titulo',
      render: (t, row) => (
        <a onClick={() => setDrawerVer(row)}
          style={{
            color: 'var(--ink-1)', fontWeight: 500,
            cursor: 'pointer', fontSize: 13,
          }}>
          {t}
        </a>
      ),
    },
    {
      title: 'Categoría', dataIndex: 'categoria', key: 'categoria', width: 140,
      render: (v) => v
        ? <QPill tone={CAT_TONE[v] || 'muted'}>{catLabel(v)}</QPill>
        : <span className="qmuted">—</span>,
    },
    {
      title: 'Estado', dataIndex: 'estado', key: 'estado', width: 120,
      render: (v) => <QPill tone={ESTADO_TONE[v] || 'muted'}>{estadoObj(v).label}</QPill>,
    },
    {
      title: 'Vistas', dataIndex: 'vistas', key: 'vistas', width: 90, align: 'right',
      render: v => <span className="qmono qmuted" style={{ fontSize: 11.5 }}>{v}</span>,
    },
    {
      title: 'Utilidad', key: 'utilidad', width: 100, align: 'right',
      render: (_, row) => {
        const total = row.util_si + row.util_no
        if (!total) return <span className="qmuted">—</span>
        const pct = Math.round((row.util_si / total) * 100)
        return (
          <span className="qmono" style={{
            fontSize: 11.5,
            color: pct >= 70 ? 'var(--ok)' : pct >= 40 ? 'var(--warn)' : 'var(--crit)',
            fontWeight: 600,
          }}>{pct}%</span>
        )
      },
    },
    {
      title: 'Autor', dataIndex: 'autor_nombre', key: 'autor', width: 160,
      render: v => v
        ? <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{v}</span>
        : <span className="qmuted">—</span>,
    },
    {
      title: '', key: 'acciones', width: 130, align: 'right',
      render: (_, row) => (
        <Space size={2}>
          <Tooltip title="Ver">
            <Button size="small" type="text" icon={<EyeOutlined />}
              style={{ color: 'var(--ink-2)' }} onClick={() => setDrawerVer(row)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button size="small" type="text" icon={<EditOutlined />}
              style={{ color: 'var(--ink-2)' }} onClick={() => setDrawerEdit(row)} />
          </Tooltip>
          {row.estado !== 'publicado' && (
            <Tooltip title="Publicar">
              <Button size="small" type="text" icon={<CheckCircleOutlined />}
                style={{ color: 'var(--ok)' }}
                onClick={() => cambiarEstado(row, 'publicado')} />
            </Tooltip>
          )}
          {esJefe && (
            <Popconfirm title="¿Eliminar artículo?"
              onConfirm={() => eliminar(row.id)} okText="Sí" cancelText="No">
              <Tooltip title="Eliminar">
                <Button size="small" type="text" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <QPageHeader
        eyebrow="Inteligencia · base de conocimiento"
        title="Base de"
        titleEm="conocimiento"
        subtitle={`${total} artículos · ${publicados} publicados · ${vistas.toLocaleString()} vistas acumuladas${utilPct !== null ? ` · ${utilPct}% calificados como útiles` : ''}`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading}>
              Actualizar
            </Button>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => setDrawerNuevo(true)}>
              Nuevo artículo
            </Button>
          </Space>
        }
      />

      <QKpiRow items={[
        { lbl: 'Total artículos', val: total },
        { lbl: 'Publicados',      val: publicados, tone: 'ok' },
        { lbl: 'Borradores',      val: borradores, tone: 'warn' },
        { lbl: 'Archivados',      val: archivados, tone: 'muted' },
        { lbl: 'Vistas totales',  val: vistas.toLocaleString(), tone: 'info' },
        { lbl: '% útil',          val: utilPct !== null ? `${utilPct}%` : '—',
          tone: utilPct === null ? 'muted' : utilPct >= 70 ? 'ok' : utilPct >= 40 ? 'warn' : 'crit' },
      ]} />

      {/* Toolbar */}
      <div className="qtoolbar">
        <div className="qinput-wrap">
          <SearchOutlined />
          <input
            className="qinput"
            placeholder="Buscar por título, contenido o tags…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <Select
          placeholder="Estado" allowClear
          style={{ width: 150 }}
          value={filtroEst} onChange={setFiltroEst}>
          {ESTADOS_ARTICULO.map(e => (
            <Option key={e.value} value={e.value}>{e.label}</Option>
          ))}
        </Select>
        <Select
          placeholder="Categoría" allowClear
          style={{ width: 170 }}
          value={filtroCat} onChange={setFiltroCat}>
          {CATEGORIAS_KB.map(c => (
            <Option key={c.value} value={c.value}>{c.label}</Option>
          ))}
        </Select>
        <span style={{ marginLeft: 'auto' }} className="qmuted qmono">
          {articulos.length} artículos visibles
        </span>
      </div>

      {/* Tabla con estilo editorial */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Table
          columns={cols} dataSource={articulos}
          rowKey="id" loading={loading} size="middle"
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        />
      </div>

      {(drawerNuevo || drawerEdit) && (
        <DrawerArticulo
          articulo={drawerEdit}
          onClose={() => { setDrawerNuevo(false); setDrawerEdit(null) }}
          onGuardado={() => { setDrawerNuevo(false); setDrawerEdit(null); cargar() }}
        />
      )}
      {drawerVer && (
        <DrawerVer articulo={drawerVer} onClose={() => setDrawerVer(null)} />
      )}
    </div>
  )
}
