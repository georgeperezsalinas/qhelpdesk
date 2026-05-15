import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Input, Card, Typography, Tag, Space, Spin, Empty, Modal,
  Row, Col, Button, Divider, Tooltip, Badge,
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

const { Title, Text, Paragraph } = Typography

// Mapeo categoría valor → label amigable
const catLabel = (val) => CATEGORIAS.find(c => c.value === val)?.label || val

// Colores por categoría (igual que PortalInicio)
const CAT_COLOR = {
  hardware: '#1677ff', software: '#722ed1', red: '#fa8c16',
  acceso: '#722ed1', vpn: '#13c2c2', correo: '#eb2f96',
  impresora: '#52c41a', telefonia: '#fa541c', servidor: '#1677ff',
  seguridad: '#ff4d4f', mantenimiento: '#fa8c16', otro: '#8c8c8c',
}

// ── Tarjeta de artículo ───────────────────────────────────────────────────────
function ArticuloCard({ articulo, onAbrir }) {
  const tags = articulo.tags ? articulo.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  const catColor = CAT_COLOR[articulo.categoria] || '#8c8c8c'
  const utilidad = articulo.util_si + articulo.util_no
  const pct = utilidad > 0 ? Math.round((articulo.util_si / utilidad) * 100) : null

  return (
    <Card
      hoverable
      size="small"
      style={{ height: '100%', borderTop: `3px solid ${catColor}` }}
      styles={{ body: { padding: '16px' } }}
      onClick={() => onAbrir(articulo)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        {articulo.categoria && (
          <Tag color={catColor} style={{ fontSize: 11 }}>
            {catLabel(articulo.categoria)}
          </Tag>
        )}
        <Space size={4}>
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

      <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8, lineHeight: 1.4 }}>
        {articulo.titulo}
      </Text>

      {tags.length > 0 && (
        <Space size={4} wrap style={{ marginBottom: 8 }}>
          {tags.slice(0, 4).map(t => (
            <Tag key={t} style={{ fontSize: 10, margin: 0 }}>
              <TagOutlined style={{ marginRight: 2 }} />{t}
            </Tag>
          ))}
        </Space>
      )}

      <Text type="secondary" style={{ fontSize: 11 }}>
        <ClockCircleOutlined style={{ marginRight: 4 }} />
        Actualizado {dayjs(articulo.actualizado_en).fromNow()}
      </Text>
    </Card>
  )
}

// ── Modal de artículo ─────────────────────────────────────────────────────────
function ModalArticulo({ articuloId, onClose }) {
  const [articulo, setArticulo] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [feedback, setFeedback] = useState(null) // 'util' | 'no_util'

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

  return (
    <Modal
      open={!!articuloId}
      onCancel={onClose}
      footer={null}
      width={700}
      title={
        articulo
          ? <Space>
              <BookOutlined style={{ color: '#1677ff' }} />
              <span style={{ fontSize: 15 }}>{articulo.titulo}</span>
            </Space>
          : 'Cargando...'
      }
    >
      <Spin spinning={loading}>
        {articulo && (
          <>
            <Space style={{ marginBottom: 16 }} wrap>
              {articulo.categoria && (
                <Tag color={CAT_COLOR[articulo.categoria] || 'blue'}>
                  {catLabel(articulo.categoria)}
                </Tag>
              )}
              {tags.map(t => <Tag key={t}>{t}</Tag>)}
              <Text type="secondary" style={{ fontSize: 12 }}>
                <EyeOutlined style={{ marginRight: 4 }} />
                {articulo.vistas} vistas
              </Text>
              {articulo.autor_nombre && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Por: {articulo.autor_nombre}
                </Text>
              )}
            </Space>

            <div
              style={{
                background: '#fafafa', borderRadius: 8, padding: '20px 24px',
                border: '1px solid #f0f0f0', marginBottom: 24,
                whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14, color: '#333',
              }}
            >
              {articulo.contenido}
            </div>

            <Divider style={{ margin: '0 0 16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  ¿Te fue útil este artículo?
                </Text>
                <Tooltip title="Sí, me ayudó">
                  <Button
                    size="small"
                    icon={<LikeOutlined />}
                    type={feedback === 'util' ? 'primary' : 'default'}
                    onClick={() => votar(true)}
                    disabled={!!feedback}
                  >
                    {articulo.util_si}
                  </Button>
                </Tooltip>
                <Tooltip title="No, necesito ayuda">
                  <Button
                    size="small"
                    icon={<DislikeOutlined />}
                    type={feedback === 'no_util' ? 'primary' : 'default'}
                    danger={feedback === 'no_util'}
                    onClick={() => votar(false)}
                    disabled={!!feedback}
                  >
                    {articulo.util_no}
                  </Button>
                </Tooltip>
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Actualizado {dayjs(articulo.actualizado_en).format('DD/MM/YYYY')}
              </Text>
            </div>

            {feedback === 'no_util' && (
              <Card
                size="small"
                style={{ marginTop: 16, background: '#fff7e6', border: '1px solid #ffd591' }}
              >
                <Text style={{ fontSize: 13 }}>
                  Lamentamos que no hayamos podido ayudarte.{' '}
                  <Text strong>Crea un ticket</Text> y un técnico te atenderá personalmente.
                </Text>
              </Card>
            )}
          </>
        )}
      </Spin>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function BaseConocimiento() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [articulos,   setArticulos]   = useState([])
  const [categorias,  setCategorias]  = useState([])
  const [busqueda,    setBusqueda]    = useState(initialQ)
  const [catFiltro,   setCatFiltro]   = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [articuloId,  setArticuloId]  = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (busqueda.trim()) params.busqueda = busqueda.trim()
      if (catFiltro)        params.categoria = catFiltro
      params.limit = 50
      const { data } = await conocimientoService.listar(params)
      setArticulos(data)
    } finally {
      setLoading(false)
    }
  }, [busqueda, catFiltro])

  // Cargar categorías al montar
  useEffect(() => {
    conocimientoService.categorias()
      .then(({ data }) => setCategorias(data))
      .catch(() => {})
  }, [])

  // Cargar artículos al cambiar filtros (con debounce en búsqueda)
  useEffect(() => {
    const timer = setTimeout(cargar, busqueda ? 400 : 0)
    return () => clearTimeout(timer)
  }, [cargar])

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/portal')} />
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <BookOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            Base de conocimiento
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Encuentra soluciones antes de crear un ticket
          </Text>
        </div>
      </div>

      {/* Buscador */}
      <Input.Search
        size="large"
        placeholder="Busca tu problema: VPN, impresora, correo, acceso..."
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        onSearch={cargar}
        allowClear
        style={{ marginBottom: 16 }}
      />

      {/* Filtros por categoría */}
      <Space wrap style={{ marginBottom: 20 }}>
        <Button
          size="small"
          type={!catFiltro ? 'primary' : 'default'}
          onClick={() => setCatFiltro(null)}
        >
          Todas
        </Button>
        {categorias.map(cat => (
          <Button
            key={cat}
            size="small"
            type={catFiltro === cat ? 'primary' : 'default'}
            style={catFiltro === cat ? {} : { color: CAT_COLOR[cat] || undefined }}
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
            image={<BookOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            description={
              busqueda
                ? `Sin resultados para "${busqueda}"`
                : 'Aún no hay artículos publicados'
            }
          >
            <Button
              type="primary"
              onClick={() => navigate('/portal/nuevo-ticket')}
            >
              Crear ticket de soporte
            </Button>
          </Empty>
        ) : (
          <>
            {busqueda && (
              <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
                {articulos.length} resultado{articulos.length !== 1 ? 's' : ''} para "{busqueda}"
              </Text>
            )}
            <Row gutter={[16, 16]}>
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
        <Card
          size="small"
          style={{ marginTop: 32, background: '#f0f5ff', border: '1px solid #adc6ff', textAlign: 'center' }}
        >
          <Text style={{ fontSize: 14 }}>
            ¿No encontraste lo que buscabas?{' '}
            <Button
              type="link"
              style={{ padding: 0, fontSize: 14 }}
              onClick={() => navigate('/portal/nuevo-ticket')}
            >
              Crea un ticket y un técnico te ayudará
            </Button>
          </Text>
        </Card>
      )}

      <ModalArticulo
        articuloId={articuloId}
        onClose={() => setArticuloId(null)}
      />
    </div>
  )
}
