import { useState, useEffect, useCallback } from 'react'
import {
  Input, Card, Typography, Tag, Space, Spin, Empty, Modal,
  Row, Col, Button, Divider, Tooltip,
} from 'antd'
import {
  SearchOutlined, BookOutlined, LikeOutlined, DislikeOutlined,
  EyeOutlined, ClockCircleOutlined, TagOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { conocimientoService } from '../../services/conocimientoService'
import { CATEGORIAS } from '../../services/ticketService'

dayjs.extend(relativeTime)
dayjs.locale('es')

const { Text, Paragraph } = Typography

/* sin cambios en helpers */
const catLabel   = (val) => CATEGORIAS.find(c => c.value === val)?.label || val
const CAT_COLOR  = {
  hardware: '#1677ff', software: '#722ed1', red: '#fa8c16',
  acceso: '#722ed1', vpn: '#13c2c2', correo: '#eb2f96',
  impresora: '#52c41a', telefonia: '#fa541c', servidor: '#1677ff',
  seguridad: '#ff4d4f', mantenimiento: '#fa8c16', otro: '#8c8c8c',
}
const CAT_BG = {
  hardware: '#e6f4ff', software: '#f9f0ff', red: '#fff7e6',
  acceso: '#f9f0ff', vpn: '#e6fffb', correo: '#fff0f6',
  impresora: '#f6ffed', telefonia: '#fff2e8', servidor: '#e6f4ff',
  seguridad: '#fff1f0', mantenimiento: '#fff7e6', otro: '#f5f5f5',
}

/* ══════════════════ TARJETA DE ARTÍCULO — rediseñada ══════════════════ */
function ArticuloCard({ articulo, onAbrir }) {
  const tags     = articulo.tags ? articulo.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  const catColor = CAT_COLOR[articulo.categoria] || '#8c8c8c'
  const catBg    = CAT_BG[articulo.categoria]    || '#f5f5f5'
  const utilidad = articulo.util_si + articulo.util_no
  const pct      = utilidad > 0 ? Math.round((articulo.util_si / utilidad) * 100) : null

  return (
    <Card
      hoverable size="small"
      style={{
        height: '100%', borderRadius: 10,
        border: '1px solid #f0f0f0',
        borderTop: `3px solid ${catColor}`,
        cursor: 'pointer',
      }}
      styles={{ body: { padding: '14px' } }}
      onClick={() => onAbrir(articulo)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: catBg, color: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          <BookOutlined />
        </div>
        <Space size={6}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <EyeOutlined style={{ marginRight: 2 }} />{articulo.vistas}
          </Text>
          {pct !== null && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              <LikeOutlined style={{ marginRight: 2 }} />{pct}%
            </Text>
          )}
        </Space>
      </div>

      {articulo.categoria && (
        <Tag color={catColor} style={{ fontSize: 10, lineHeight: '18px', marginBottom: 7 }}>
          {catLabel(articulo.categoria)}
        </Tag>
      )}

      <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8, lineHeight: 1.4 }}>
        {articulo.titulo}
      </Text>

      {tags.length > 0 && (
        <Space size={3} wrap style={{ marginBottom: 8 }}>
          {tags.slice(0, 4).map(t => (
            <Tag key={t} style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>
              <TagOutlined style={{ marginRight: 2 }} />{t}
            </Tag>
          ))}
        </Space>
      )}

      <Text type="secondary" style={{ fontSize: 11 }}>
        <ClockCircleOutlined style={{ marginRight: 3 }} />
        Actualizado {dayjs(articulo.actualizado_en).fromNow()}
      </Text>
    </Card>
  )
}

/* ══════════════════ MODAL ARTÍCULO — sin cambios en lógica ══════════════════ */
function ModalArticulo({ articuloId, onClose }) {
  const navigate = useNavigate()
  const [articulo, setArticulo] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!articuloId) return
    setLoading(true)
    setFeedback(null)
    conocimientoService.obtener(articuloId)
      .then(({ data }) => setArticulo(data))
      .finally(() => setLoading(false))
  }, [articuloId])

  const votar = async (util) => {
    if (feedback) return
    await conocimientoService.marcarUtil(articuloId, util)
    setFeedback(util ? 'util' : 'no_util')
    setArticulo(prev => ({
      ...prev,
      util_si: util ? prev.util_si + 1 : prev.util_si,
      util_no: !util ? prev.util_no + 1 : prev.util_no,
    }))
  }

  const tags = articulo?.tags
    ? articulo.tags.split(',').map(t => t.trim()).filter(Boolean)
    : []

  const catColor = articulo ? CAT_COLOR[articulo.categoria] || '#1677ff' : '#1677ff'

  return (
    <Modal
      open={!!articuloId}
      onCancel={onClose}
      footer={null}
      width={700}
      title={
        articulo
          ? <Space>
              <BookOutlined style={{ color: catColor }} />
              <span style={{ fontSize: 14 }}>{articulo.titulo}</span>
            </Space>
          : 'Cargando...'
      }
    >
      <Spin spinning={loading}>
        {articulo && (
          <>
            <Space style={{ marginBottom: 14 }} wrap>
              {articulo.categoria && (
                <Tag color={catColor}>{catLabel(articulo.categoria)}</Tag>
              )}
              {tags.map(t => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>)}
              <Text type="secondary" style={{ fontSize: 12 }}>
                <EyeOutlined style={{ marginRight: 4 }} />{articulo.vistas} vistas
              </Text>
              {articulo.autor_nombre && (
                <Text type="secondary" style={{ fontSize: 12 }}>Por: {articulo.autor_nombre}</Text>
              )}
            </Space>

            <div style={{
              background: '#f8f9fa', borderRadius: 10, padding: '18px 20px',
              border: '1px solid #f0f0f0', marginBottom: 20,
              whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 13, color: '#262626',
            }}>
              {articulo.contenido}
            </div>

            <Divider style={{ margin: '0 0 14px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  ¿Te fue útil este artículo?
                </Text>
                <Tooltip title="Sí, me ayudó">
                  <Button size="small" icon={<LikeOutlined />}
                    type={feedback === 'util' ? 'primary' : 'default'}
                    onClick={() => votar(true)} disabled={!!feedback}>
                    {articulo.util_si}
                  </Button>
                </Tooltip>
                <Tooltip title="No, necesito ayuda">
                  <Button size="small" icon={<DislikeOutlined />}
                    type={feedback === 'no_util' ? 'primary' : 'default'}
                    danger={feedback === 'no_util'}
                    onClick={() => votar(false)} disabled={!!feedback}>
                    {articulo.util_no}
                  </Button>
                </Tooltip>
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Actualizado {dayjs(articulo.actualizado_en).format('DD/MM/YYYY')}
              </Text>
            </div>

            {feedback === 'no_util' && (
              <Card size="small" style={{ marginTop: 14, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8 }}>
                <Text style={{ fontSize: 12 }}>
                  Lamentamos que no hayamos podido ayudarte.{' '}
                  <Button type="link" style={{ padding: 0, fontSize: 12 }}
                    onClick={() => { onClose(); navigate('/portal/nuevo-ticket') }}>
                    Crea un ticket
                  </Button>{' '}
                  y un técnico te atenderá personalmente.
                </Text>
              </Card>
            )}
          </>
        )}
      </Spin>
    </Modal>
  )
}

/* ══════════════════ PÁGINA PRINCIPAL — sin cambios en lógica ══════════════════ */
export default function BaseConocimiento() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const initialQ       = searchParams.get('q') || ''

  const [articulos,  setArticulos]  = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda,   setBusqueda]   = useState(initialQ)
  const [catFiltro,  setCatFiltro]  = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [articuloId, setArticuloId] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (busqueda.trim()) params.busqueda = busqueda.trim()
      if (catFiltro)        params.categoria = catFiltro
      params.limit = 50
      const { data } = await conocimientoService.listar(params)
      setArticulos(data)
    } finally { setLoading(false) }
  }, [busqueda, catFiltro])

  useEffect(() => {
    conocimientoService.categorias()
      .then(({ data }) => setCategorias(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(cargar, busqueda ? 400 : 0)
    return () => clearTimeout(timer)
  }, [cargar])

  return (
    <div>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/portal')} size="small" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOutlined style={{ color: '#1677ff', fontSize: 14 }} />
            Base de conocimiento
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Encuentra soluciones antes de crear un ticket
          </Text>
        </div>
      </div>

      {/* Buscador */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fff', border: '1px solid #d9d9d9', borderRadius: 8,
        padding: '8px 12px', marginBottom: 14,
      }}>
        <SearchOutlined style={{ fontSize: 15, color: '#bfbfbf' }} />
        <Input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          onPressEnter={cargar}
          placeholder="Busca tu problema: VPN, impresora, correo, acceso..."
          bordered={false}
          style={{ fontSize: 12, padding: 0 }}
          allowClear
        />
        {busqueda && (
          <Button size="small" type="primary" onClick={cargar} style={{ fontSize: 11, flexShrink: 0 }}>
            Buscar
          </Button>
        )}
      </div>

      {/* Filtros por categoría */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Button
          size="small"
          type={!catFiltro ? 'primary' : 'default'}
          onClick={() => setCatFiltro(null)}
          style={{ fontSize: 11 }}
        >
          Todas
        </Button>
        {categorias.map(cat => (
          <Button
            key={cat}
            size="small"
            type={catFiltro === cat ? 'primary' : 'default'}
            style={catFiltro === cat ? {} : { color: CAT_COLOR[cat] || undefined, fontSize: 11 }}
            onClick={() => setCatFiltro(catFiltro === cat ? null : cat)}
          >
            {catLabel(cat)}
          </Button>
        ))}
      </Space>

      {/* Resultados */}
      <Spin spinning={loading}>
        {articulos.length === 0 && !loading ? (
          <Empty
            image={<BookOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />}
            description={
              <span style={{ fontSize: 12 }}>
                {busqueda ? `Sin resultados para "${busqueda}"` : 'Aún no hay artículos publicados'}
              </span>
            }
          >
            <Button type="primary" size="small" style={{ fontSize: 12 }}
              onClick={() => navigate('/portal/nuevo-ticket')}>
              Crear ticket de soporte
            </Button>
          </Empty>
        ) : (
          <>
            {busqueda && (
              <Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
                {articulos.length} resultado{articulos.length !== 1 ? 's' : ''} para "{busqueda}"
              </Text>
            )}
            <Row gutter={[12, 12]}>
              {articulos.map(a => (
                <Col key={a.id} xs={24} sm={12} md={8}>
                  <ArticuloCard articulo={a} onAbrir={a => setArticuloId(a.id)} />
                </Col>
              ))}
            </Row>
          </>
        )}
      </Spin>

      {/* CTA si no encontró solución */}
      {articulos.length > 0 && (
        <Card size="small" style={{ marginTop: 24, background: '#f0f5ff', border: '1px solid #91caff', textAlign: 'center', borderRadius: 10 }}>
          <Text style={{ fontSize: 13 }}>
            ¿No encontraste lo que buscabas?{' '}
            <Button type="link" style={{ padding: 0, fontSize: 13 }}
              onClick={() => navigate('/portal/nuevo-ticket')}>
              Crea un ticket y un técnico te ayudará
            </Button>
          </Text>
        </Card>
      )}

      <ModalArticulo articuloId={articuloId} onClose={() => setArticuloId(null)} />
    </div>
  )
}
