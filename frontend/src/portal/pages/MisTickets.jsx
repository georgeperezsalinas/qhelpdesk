import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Typography, Space, Tag, Badge, Button, Empty,
  Spin, Modal, Timeline, Divider, Rate, Form, Input, Select,
  Row, Col, Statistic, Alert, message,
} from 'antd'
import {
  PlusOutlined, EyeOutlined, StarOutlined,
  ClockCircleOutlined, CheckCircleOutlined,
  MessageOutlined, ReloadOutlined, SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { ticketService, getPrioridad, getEstado, ESTADOS, CATEGORIAS } from '../../services/ticketService'

dayjs.extend(relativeTime)
dayjs.locale('es')

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// ── TARJETA DE TICKET ─────────────────────────────────────────────────────────
function TicketCard({ ticket, onVerDetalle, onCalificar }) {
  const p = getPrioridad(ticket.prioridad)
  const e = getEstado(ticket.estado)
  const resuelto = ['resuelto', 'cerrado'].includes(ticket.estado)
  const puedeCalificar = resuelto && !ticket.nps_enviado

  return (
    <Card
      size="small"
      hoverable
      style={{
        marginBottom: 12,
        borderLeft: `4px solid ${p?.color || '#d9d9d9'}`,
        cursor: 'default',
      }}
      styles={{ body: { padding: '14px 16px' } }}
    >
      <Row align="middle" gutter={16}>
        <Col flex="auto">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text code style={{ fontSize: 11 }}>{ticket.numero}</Text>
            <Badge status={e?.color} text={e?.label} />
            <Tag
              style={{
                background: p?.bg, color: p?.color,
                border: `1px solid ${p?.color}`,
                fontSize: 11, fontWeight: 600,
              }}
            >
              {p?.label}
            </Tag>
            {ticket.categoria && <Tag style={{ fontSize: 11 }}>{ticket.categoria}</Tag>}
          </div>

          <Text strong style={{ fontSize: 14 }}>{ticket.titulo}</Text>

          <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              Creado {dayjs(ticket.creado_en).fromNow()}
            </Text>
            {ticket.tecnico && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Técnico: {ticket.tecnico.nombre} {ticket.tecnico.apellido}
              </Text>
            )}
            {ticket.sla_limite && !resuelto && (
              <Text
                style={{
                  fontSize: 12,
                  color: dayjs().isAfter(ticket.sla_limite) ? '#ff4d4f' : '#fa8c16',
                }}
              >
                SLA: {dayjs(ticket.sla_limite).fromNow()}
              </Text>
            )}
            {resuelto && ticket.tiempo_resolucion_h && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                Resuelto en {ticket.tiempo_resolucion_h}h
              </Text>
            )}
          </div>

          {/* NPS ya enviado */}
          {ticket.nps_puntuacion && (
            <div style={{ marginTop: 6 }}>
              <Rate disabled value={Math.round(ticket.nps_puntuacion / 2)} count={5} style={{ fontSize: 14 }} />
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                Tu calificación: {ticket.nps_puntuacion}/10
              </Text>
            </div>
          )}
        </Col>

        <Col flex="none">
          <Space direction="vertical" size={6} style={{ alignItems: 'flex-end' }}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onVerDetalle(ticket)}
            >
              Ver detalle
            </Button>
            {puedeCalificar && (
              <Button
                size="small"
                icon={<StarOutlined />}
                type="primary"
                ghost
                onClick={() => onCalificar(ticket)}
              >
                Calificar
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  )
}

// ── MODAL DETALLE ─────────────────────────────────────────────────────────────
function ModalDetalle({ ticket, onClose, onNuevoComentario }) {
  const [comentarios, setComentarios] = useState([])
  const [loading, setLoading]         = useState(false)
  const [texto, setTexto]             = useState('')
  const [enviando, setEnviando]       = useState(false)

  useEffect(() => {
    if (ticket) {
      setLoading(true)
      ticketService.comentarios(ticket.id)
        .then(({ data }) => setComentarios(data.filter(c => !c.es_interno)))
        .finally(() => setLoading(false))
    }
  }, [ticket])

  const enviarComentario = async () => {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      await ticketService.agregarComentario(ticket.id, { contenido: texto, es_interno: false })
      setTexto('')
      const { data } = await ticketService.comentarios(ticket.id)
      setComentarios(data.filter(c => !c.es_interno))
      message.success('Comentario enviado')
    } catch { message.error('Error al enviar') }
    finally { setEnviando(false) }
  }

  if (!ticket) return null
  const p = getPrioridad(ticket.prioridad)
  const e = getEstado(ticket.estado)

  return (
    <Modal
      open={!!ticket}
      onCancel={onClose}
      footer={null}
      width={620}
      title={
        <Space>
          <Text code>{ticket.numero}</Text>
          <Badge status={e?.color} text={e?.label} />
        </Space>
      }
    >
      <div style={{ borderLeft: `3px solid ${p?.color}`, paddingLeft: 12, marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>{ticket.titulo}</Title>
        <Space style={{ marginTop: 6 }}>
          <Tag style={{ background: p?.bg, color: p?.color, border: `1px solid ${p?.color}` }}>
            {p?.label}
          </Tag>
          {ticket.categoria && <Tag>{ticket.categoria}</Tag>}
        </Space>
      </div>

      {ticket.descripcion && (
        <Card size="small" title="Descripción" style={{ marginBottom: 16 }}>
          <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{ticket.descripcion}</Paragraph>
        </Card>
      )}

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Creado" value={dayjs(ticket.creado_en).format('DD/MM/YY HH:mm')}
              valueStyle={{ fontSize: 12 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="SLA límite"
              value={ticket.sla_limite ? dayjs(ticket.sla_limite).format('DD/MM/YY HH:mm') : '—'}
              valueStyle={{ fontSize: 12 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Técnico"
              value={ticket.tecnico ? `${ticket.tecnico.nombre} ${ticket.tecnico.apellido}` : 'Por asignar'}
              valueStyle={{ fontSize: 12 }}
            />
          </Card>
        </Col>
      </Row>

      {ticket.solucion && (
        <Alert
          type="success" showIcon
          message="Solución aplicada"
          description={ticket.solucion}
          style={{ marginBottom: 16 }}
        />
      )}

      <Divider>Seguimiento</Divider>

      <Spin spinning={loading}>
        {comentarios.length === 0
          ? <Text type="secondary">Sin comentarios aún.</Text>
          : <Timeline items={comentarios.map(c => ({
              color: 'blue',
              children: (
                <div style={{ background: '#f6f6f6', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 12 }}>{c.autor?.nombre} {c.autor?.apellido}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(c.creado_en).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </div>
                  <Text style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{c.contenido}</Text>
                </div>
              )
            }))} />
        }
      </Spin>

      {/* Responder */}
      {!['cerrado', 'cancelado'].includes(ticket.estado) && (
        <div style={{ marginTop: 16 }}>
          <TextArea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Añade información adicional o responde al técnico..."
            rows={3}
            style={{ marginBottom: 8 }}
          />
          <Button
            type="primary"
            icon={<MessageOutlined />}
            loading={enviando}
            onClick={enviarComentario}
            disabled={!texto.trim()}
          >
            Enviar respuesta
          </Button>
        </div>
      )}
    </Modal>
  )
}

// ── MODAL NPS ─────────────────────────────────────────────────────────────────
function ModalNPS({ ticket, onClose, onCalificado }) {
  const [form] = Form.useForm()
  const [enviando, setEnviando] = useState(false)
  const [puntuacion, setPuntuacion] = useState(8)

  const enviar = async (values) => {
    setEnviando(true)
    try {
      await ticketService.calificar(ticket.id, { puntuacion: values.puntuacion, comentario: values.comentario })
      message.success('¡Gracias por tu calificación!')
      onCalificado()
      onClose()
    } catch { message.error('Error al enviar calificación') }
    finally { setEnviando(false) }
  }

  if (!ticket) return null

  return (
    <Modal
      open={!!ticket}
      onCancel={onClose}
      title="Califica la atención recibida"
      footer={null}
      width={480}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
        <Title level={5}>Tu ticket <Text code>{ticket.numero}</Text> fue resuelto</Title>
        <Text type="secondary">¿Quedaste satisfecho con la atención recibida?</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={enviar}
        initialValues={{ puntuacion: 8 }}>
        <Form.Item name="puntuacion" label="Puntuación (1 = muy malo · 10 = excelente)"
          rules={[{ required: true }]}>
          <Select onChange={setPuntuacion}>
            {[...Array(10)].map((_, i) => (
              <Select.Option key={i+1} value={i+1}>
                {i+1} {i+1 <= 6 ? '😞' : i+1 <= 8 ? '😊' : '🌟'}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="comentario" label="Comentario (opcional)">
          <TextArea rows={3} placeholder="¿Qué podemos mejorar? ¿Qué hicimos bien?" />
        </Form.Item>

        <Space>
          <Button onClick={onClose}>Ahora no</Button>
          <Button type="primary" htmlType="submit" loading={enviando}
            icon={<StarOutlined />}>
            Enviar calificación
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function MisTickets() {
  const navigate   = useNavigate()
  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [catFiltro,setCatFiltro]= useState(null)
  const [detalle,  setDetalle]  = useState(null)
  const [nps,      setNPS]      = useState(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await ticketService.listar({ limit: 200 })
      setTickets(data)
    } catch { message.error('Error al cargar tickets') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const ticketsFiltrados = tickets.filter(t => {
    // Filtro por estado
    if (filtro === 'abiertos'  && ['resuelto','cerrado','cancelado'].includes(t.estado)) return false
    if (filtro === 'resueltos' && !['resuelto','cerrado'].includes(t.estado)) return false
    if (filtro === 'calificar' && !((['resuelto','cerrado'].includes(t.estado)) && !t.nps_enviado)) return false
    // Filtro por categoría
    if (catFiltro && t.categoria !== catFiltro) return false
    // Búsqueda de texto
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      const enTitulo = t.titulo?.toLowerCase().includes(q)
      const enNumero = t.numero?.toLowerCase().includes(q)
      const enDesc   = t.descripcion?.toLowerCase().includes(q)
      if (!enTitulo && !enNumero && !enDesc) return false
    }
    return true
  })

  const pendientesCalificar = tickets.filter(t =>
    ['resuelto','cerrado'].includes(t.estado) && !t.nps_enviado
  ).length

  // Categorías presentes en los tickets del usuario
  const categoriasPresentes = [...new Set(tickets.map(t => t.categoria).filter(Boolean))]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Mis tickets</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading} />
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => navigate('/portal/nuevo-ticket')}>
            Nuevo ticket
          </Button>
        </Space>
      </div>

      {/* Alerta de tickets por calificar */}
      {pendientesCalificar > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<StarOutlined />}
          message={`Tienes ${pendientesCalificar} ticket${pendientesCalificar > 1 ? 's' : ''} resuelto${pendientesCalificar > 1 ? 's' : ''} pendiente${pendientesCalificar > 1 ? 's' : ''} de calificar`}
          action={
            <Button size="small" onClick={() => setFiltro('calificar')}>
              Ver ahora
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Estadísticas rápidas */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { label: 'Total',    value: tickets.length,                                              color: undefined     },
          { label: 'Abiertos', value: tickets.filter(t => !['resuelto','cerrado','cancelado'].includes(t.estado)).length, color: '#1677ff' },
          { label: 'Resueltos',value: tickets.filter(t => ['resuelto','cerrado'].includes(t.estado)).length,              color: '#52c41a' },
          { label: 'Por calificar', value: pendientesCalificar,                                    color: '#fa8c16'     },
        ].map(s => (
          <Col key={s.label} span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic title={s.label} value={s.value}
                valueStyle={{ fontSize: 20, color: s.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Buscador */}
      <Input
        placeholder="Buscar por número, título o descripción..."
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        allowClear
        style={{ marginBottom: 12 }}
      />

      {/* Filtros de estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Space wrap>
          {[
            { key: 'todos',     label: 'Todos'          },
            { key: 'abiertos',  label: 'En proceso'     },
            { key: 'resueltos', label: 'Resueltos'       },
            { key: 'calificar', label: '⭐ Por calificar' },
          ].map(f => (
            <Button
              key={f.key}
              type={filtro === f.key ? 'primary' : 'default'}
              size="small"
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </Space>

        {/* Filtro de categoría */}
        {categoriasPresentes.length > 0 && (
          <Select
            size="small"
            allowClear
            placeholder="Categoría"
            style={{ minWidth: 140 }}
            value={catFiltro}
            onChange={v => setCatFiltro(v || null)}
            options={categoriasPresentes.map(c => ({
              value: c,
              label: CATEGORIAS.find(x => x.value === c)?.label || c,
            }))}
          />
        )}
      </div>

      {/* Lista de tickets */}
      <Spin spinning={loading}>
        {ticketsFiltrados.length === 0
          ? (
            <Empty
              description={
                filtro === 'todos'
                  ? 'Aún no tienes tickets registrados'
                  : 'No hay tickets en esta categoría'
              }
            >
              <Button type="primary" icon={<PlusOutlined />}
                onClick={() => navigate('/portal/nuevo-ticket')}>
                Crear primer ticket
              </Button>
            </Empty>
          )
          : ticketsFiltrados.map(t => (
            <TicketCard
              key={t.id}
              ticket={t}
              onVerDetalle={setDetalle}
              onCalificar={setNPS}
            />
          ))
        }
      </Spin>

      <ModalDetalle
        ticket={detalle}
        onClose={() => setDetalle(null)}
        onNuevoComentario={cargar}
      />
      <ModalNPS
        ticket={nps}
        onClose={() => setNPS(null)}
        onCalificado={cargar}
      />
    </div>
  )
}
