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
import { ticketService, getPrioridad, getEstado, CATEGORIAS } from '../../services/ticketService'

dayjs.extend(relativeTime)
dayjs.locale('es')

const { Text, Paragraph } = Typography
const { TextArea } = Input

/* ══════════════════ TARJETA DE TICKET ══════════════════ */
function TicketCard({ ticket, onVerDetalle, onCalificar }) {
  const p = getPrioridad(ticket.prioridad)
  const e = getEstado(ticket.estado)
  const resuelto       = ['resuelto', 'cerrado'].includes(ticket.estado)
  const puedeCalificar = resuelto && !ticket.nps_enviado

  return (
    <Card
      size="small"
      hoverable
      style={{
        marginBottom: 8, borderRadius: 10,
        border: '1px solid #f0f0f0',
        borderLeft: `3px solid ${p?.color || '#d9d9d9'}`,
        cursor: 'default',
      }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <Row align="middle" gutter={12}>
        <Col flex="auto">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            <Text code style={{ fontSize: 10 }}>{ticket.numero}</Text>
            <Badge status={e?.color} text={<span style={{ fontSize: 11 }}>{e?.label}</span>} />
            <Tag style={{ background: p?.bg, color: p?.color, border: `1px solid ${p?.color}20`, fontSize: 10, fontWeight: 600, lineHeight: '18px' }}>
              {p?.label}
            </Tag>
            {ticket.categoria && <Tag style={{ fontSize: 10, lineHeight: '18px' }}>{ticket.categoria}</Tag>}
          </div>

          <Text style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>
            {ticket.titulo}
          </Text>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              <ClockCircleOutlined style={{ marginRight: 3 }} />
              {dayjs(ticket.creado_en).fromNow()}
            </Text>
            {ticket.tecnico && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Técnico: {ticket.tecnico.nombre} {ticket.tecnico.apellido}
              </Text>
            )}
            {ticket.sla_limite && !resuelto && (
              <Text style={{ fontSize: 11, color: dayjs().isAfter(ticket.sla_limite) ? '#cf1322' : '#d46b08' }}>
                SLA: {dayjs(ticket.sla_limite).fromNow()}
              </Text>
            )}
            {resuelto && ticket.tiempo_resolucion_h && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                <CheckCircleOutlined style={{ marginRight: 3, color: '#52c41a' }} />
                Resuelto en {ticket.tiempo_resolucion_h}h
              </Text>
            )}
          </div>

          {ticket.nps_puntuacion && (
            <div style={{ marginTop: 5 }}>
              <Rate disabled value={Math.round(ticket.nps_puntuacion / 2)} count={5} style={{ fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 10, marginLeft: 6 }}>{ticket.nps_puntuacion}/10</Text>
            </div>
          )}
        </Col>

        <Col flex="none">
          <Space direction="vertical" size={4} style={{ alignItems: 'flex-end' }}>
            <Button size="small" icon={<EyeOutlined />} onClick={() => onVerDetalle(ticket)} style={{ fontSize: 11 }}>
              Ver detalle
            </Button>
            {puedeCalificar && (
              <Button size="small" icon={<StarOutlined />} type="primary" ghost onClick={() => onCalificar(ticket)} style={{ fontSize: 11 }}>
                Calificar
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  )
}

/* ══════════════════ MODAL DETALLE ══════════════════ */
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
    <Modal open={!!ticket} onCancel={onClose} footer={null} width={620}
      title={<Space><Text code>{ticket.numero}</Text><Badge status={e?.color} text={e?.label} /></Space>}
    >
      <div style={{ borderLeft: `3px solid ${p?.color}`, background: `${p?.color}08`, borderRadius: '0 8px 8px 0', padding: '10px 12px 10px 14px', marginBottom: 14 }}>
        <Text strong style={{ fontSize: 14 }}>{ticket.titulo}</Text>
        <div style={{ marginTop: 5 }}>
          <Space size={5}>
            <Tag style={{ background: p?.bg, color: p?.color, border: `1px solid ${p?.color}30`, fontSize: 10 }}>{p?.label}</Tag>
            {ticket.categoria && <Tag style={{ fontSize: 10 }}>{ticket.categoria}</Tag>}
          </Space>
        </div>
      </div>

      {ticket.descripcion && (
        <Card size="small" title={<span style={{ fontSize: 12 }}>Descripción</span>} style={{ marginBottom: 14, borderRadius: 8 }}>
          <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>{ticket.descripcion}</Paragraph>
        </Card>
      )}

      <Row gutter={10} style={{ marginBottom: 14 }}>
        {[
          { title: 'Creado',  value: dayjs(ticket.creado_en).format('DD/MM/YY HH:mm') },
          { title: 'SLA',     value: ticket.sla_limite ? dayjs(ticket.sla_limite).format('DD/MM/YY HH:mm') : '—' },
          { title: 'Técnico', value: ticket.tecnico ? `${ticket.tecnico.nombre} ${ticket.tecnico.apellido}` : 'Por asignar' },
        ].map(s => (
          <Col span={8} key={s.title}>
            <Card size="small" style={{ borderRadius: 8 }}>
              <Statistic title={<span style={{ fontSize: 11 }}>{s.title}</span>} value={s.value} valueStyle={{ fontSize: 12 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {ticket.solucion && (
        <Alert type="success" showIcon message="Solución aplicada" description={ticket.solucion} style={{ marginBottom: 14, borderRadius: 8 }} />
      )}

      <Divider style={{ margin: '0 0 14px', fontSize: 12 }}>Seguimiento</Divider>

      <Spin spinning={loading}>
        {comentarios.length === 0
          ? <Text type="secondary" style={{ fontSize: 12 }}>Sin comentarios aún.</Text>
          : <Timeline items={comentarios.map(c => ({
              color: 'blue',
              children: (
                <div style={{ background: '#f8f9fa', borderRadius: 7, padding: '8px 11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text strong style={{ fontSize: 12 }}>{c.autor?.nombre} {c.autor?.apellido}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(c.creado_en).format('DD/MM/YYYY HH:mm')}</Text>
                  </div>
                  <Text style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{c.contenido}</Text>
                </div>
              ),
            }))} />
        }
      </Spin>

      {!['cerrado', 'cancelado'].includes(ticket.estado) && (
        <div style={{ marginTop: 14 }}>
          <TextArea value={texto} onChange={e => setTexto(e.target.value)}
            placeholder="Añade información adicional o responde al técnico..."
            rows={3} style={{ marginBottom: 8, fontSize: 12, borderRadius: 8 }} />
          <Button type="primary" icon={<MessageOutlined />} loading={enviando}
            onClick={enviarComentario} disabled={!texto.trim()} style={{ fontSize: 12 }}>
            Enviar respuesta
          </Button>
        </div>
      )}
    </Modal>
  )
}

/* ══════════════════ MODAL NPS ══════════════════ */
function ModalNPS({ ticket, onClose, onCalificado }) {
  const [form]     = Form.useForm()
  const [enviando, setEnviando] = useState(false)

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
    <Modal open={!!ticket} onCancel={onClose} title="Califica la atención recibida" footer={null} width={460}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <CheckCircleOutlined style={{ fontSize: 42, color: '#52c41a', marginBottom: 10, display: 'block' }} />
        <Text strong style={{ fontSize: 14 }}>Tu ticket <Text code>{ticket.numero}</Text> fue resuelto</Text><br />
        <Text type="secondary" style={{ fontSize: 12 }}>¿Quedaste satisfecho con la atención recibida?</Text>
      </div>
      <Form form={form} layout="vertical" onFinish={enviar} initialValues={{ puntuacion: 8 }}>
        <Form.Item name="puntuacion" label={<span style={{ fontSize: 12 }}>Puntuación (1–10)</span>} rules={[{ required: true }]}>
          <Select>
            {[...Array(10)].map((_, i) => (
              <Select.Option key={i + 1} value={i + 1}>{i + 1} {i + 1 <= 6 ? '😞' : i + 1 <= 8 ? '😊' : '🌟'}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="comentario" label={<span style={{ fontSize: 12 }}>Comentario (opcional)</span>}>
          <TextArea rows={3} placeholder="¿Qué podemos mejorar? ¿Qué hicimos bien?" style={{ fontSize: 12 }} />
        </Form.Item>
        <Space>
          <Button onClick={onClose} style={{ fontSize: 12 }}>Ahora no</Button>
          <Button type="primary" htmlType="submit" loading={enviando} icon={<StarOutlined />} style={{ fontSize: 12 }}>
            Enviar calificación
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}

/* ══════════════════ PÁGINA PRINCIPAL ══════════════════ */
export default function MisTickets() {
  const navigate    = useNavigate()
  const [tickets,   setTickets]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState('todos')
  const [busqueda,  setBusqueda]  = useState('')
  const [catFiltro, setCatFiltro] = useState(null)
  const [detalle,   setDetalle]   = useState(null)
  const [nps,       setNPS]       = useState(null)

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
    if (filtro === 'abiertos'  && ['resuelto', 'cerrado', 'cancelado'].includes(t.estado)) return false
    if (filtro === 'resueltos' && !['resuelto', 'cerrado'].includes(t.estado))              return false
    if (filtro === 'calificar' && !(['resuelto', 'cerrado'].includes(t.estado) && !t.nps_enviado)) return false
    if (catFiltro && t.categoria !== catFiltro) return false
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      if (!t.titulo?.toLowerCase().includes(q) && !t.numero?.toLowerCase().includes(q) && !t.descripcion?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const pendientesCalificar = tickets.filter(t => ['resuelto', 'cerrado'].includes(t.estado) && !t.nps_enviado).length
  const categoriasPresentes = [...new Set(tickets.map(t => t.categoria).filter(Boolean))]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>Mis tickets</span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading} size="small" />
          <Button type="primary" icon={<PlusOutlined />} size="small" style={{ fontSize: 12 }}
            onClick={() => navigate('/portal/nuevo-ticket')}>
            Nuevo ticket
          </Button>
        </Space>
      </div>

      {pendientesCalificar > 0 && (
        <Alert type="warning" showIcon icon={<StarOutlined />}
          message={`Tienes ${pendientesCalificar} ticket${pendientesCalificar > 1 ? 's' : ''} resuelto${pendientesCalificar > 1 ? 's' : ''} pendiente${pendientesCalificar > 1 ? 's' : ''} de calificar`}
          action={<Button size="small" onClick={() => setFiltro('calificar')}>Ver ahora</Button>}
          style={{ marginBottom: 12, borderRadius: 8 }}
        />
      )}

      <Row gutter={10} style={{ marginBottom: 12 }}>
        {[
          { label: 'Total',         value: tickets.length,                                                                        color: undefined  },
          { label: 'En proceso',    value: tickets.filter(t => !['resuelto', 'cerrado', 'cancelado'].includes(t.estado)).length,  color: '#1677ff'  },
          { label: 'Resueltos',     value: tickets.filter(t => ['resuelto', 'cerrado'].includes(t.estado)).length,                color: '#52c41a'  },
          { label: 'Por calificar', value: pendientesCalificar,                                                                   color: '#d46b08'  },
        ].map(s => (
          <Col span={6} key={s.label}>
            <Card size="small" style={{ borderRadius: 10, border: '1px solid #f0f0f0', textAlign: 'center' }} styles={{ body: { padding: '10px 12px' } }}>
              <Statistic
                title={<span style={{ fontSize: 10, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>}
                value={s.value}
                valueStyle={{ fontSize: 20, color: s.color || '#262626' }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Input placeholder="Buscar por número, título o descripción..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        value={busqueda} onChange={e => setBusqueda(e.target.value)} allowClear size="small"
        style={{ marginBottom: 10, fontSize: 12 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        <Space size={4} wrap>
          {[
            { key: 'todos',     label: 'Todos' },
            { key: 'abiertos',  label: 'En proceso' },
            { key: 'resueltos', label: 'Resueltos' },
            { key: 'calificar', label: '⭐ Por calificar' },
          ].map(f => (
            <Button key={f.key} type={filtro === f.key ? 'primary' : 'default'} size="small"
              onClick={() => setFiltro(f.key)} style={{ fontSize: 11 }}>
              {f.label}
            </Button>
          ))}
        </Space>
        {categoriasPresentes.length > 0 && (
          <Select size="small" allowClear placeholder="Categoría" style={{ minWidth: 130 }}
            value={catFiltro} onChange={v => setCatFiltro(v || null)}
            options={categoriasPresentes.map(c => ({ value: c, label: CATEGORIAS.find(x => x.value === c)?.label || c }))}
          />
        )}
      </div>

      <Spin spinning={loading}>
        {ticketsFiltrados.length === 0
          ? (
            <Empty description={filtro === 'todos' ? 'Aún no tienes tickets registrados' : 'No hay tickets en esta categoría'}>
              <Button type="primary" icon={<PlusOutlined />} size="small" style={{ fontSize: 12 }}
                onClick={() => navigate('/portal/nuevo-ticket')}>
                Crear primer ticket
              </Button>
            </Empty>
          )
          : ticketsFiltrados.map(t => (
            <TicketCard key={t.id} ticket={t} onVerDetalle={setDetalle} onCalificar={setNPS} />
          ))
        }
      </Spin>

      <ModalDetalle ticket={detalle} onClose={() => setDetalle(null)} onNuevoComentario={cargar} />
      <ModalNPS     ticket={nps}     onClose={() => setNPS(null)}     onCalificado={cargar} />
    </div>
  )
}
