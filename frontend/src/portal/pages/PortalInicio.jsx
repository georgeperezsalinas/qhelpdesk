import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Row, Col, Card, Typography, Space, Tag, Input } from 'antd'
import {
  PlusCircleOutlined, FileTextOutlined, LaptopOutlined,
  WifiOutlined, MailOutlined, PrinterOutlined, LockOutlined,
  PhoneOutlined, SafetyOutlined, QuestionCircleOutlined,
  ClockCircleOutlined, CheckCircleOutlined, BookOutlined,
  SearchOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'

const { Text } = Typography

/* ── sin cambios en la data ── */
const CATEGORIAS_RAPIDAS = [
  { icon: <LaptopOutlined />,        label: 'PC / Laptop',    categoria: 'hardware',   color: '#1677ff', bg: '#e6f4ff' },
  { icon: <PrinterOutlined />,       label: 'Impresora',      categoria: 'impresora',  color: '#52c41a', bg: '#f6ffed' },
  { icon: <WifiOutlined />,          label: 'Red / Internet', categoria: 'red',        color: '#fa8c16', bg: '#fff7e6' },
  { icon: <MailOutlined />,          label: 'Correo',         categoria: 'correo',     color: '#eb2f96', bg: '#fff0f6' },
  { icon: <LockOutlined />,          label: 'Acceso / Clave', categoria: 'acceso',     color: '#722ed1', bg: '#f9f0ff' },
  { icon: <SafetyOutlined />,        label: 'VPN',            categoria: 'vpn',        color: '#13c2c2', bg: '#e6fffb' },
  { icon: <PhoneOutlined />,         label: 'Telefonía',      categoria: 'telefonia',  color: '#fa541c', bg: '#fff2e8' },
  { icon: <QuestionCircleOutlined />,label: 'Otro',           categoria: 'otro',       color: '#8c8c8c', bg: '#f5f5f5' },
]

const PASOS = [
  { icon: <PlusCircleOutlined />,    color: '#1677ff', titulo: 'Crea tu ticket',       desc: 'Describe tu problema y selecciona la categoría.' },
  { icon: <ClockCircleOutlined />,   color: '#fa8c16', titulo: 'Se asigna un técnico', desc: 'El sistema asigna automáticamente al más adecuado.' },
  { icon: <CheckCircleOutlined />,   color: '#52c41a', titulo: 'Resolución y cierre',  desc: 'Recibes notificación cuando tu ticket es resuelto.' },
]

const SLA_ITEMS = [
  { label: 'Crítica', t: '4h',  color: '#cf1322', bg: '#fff1f0', border: '#ffa39e' },
  { label: 'Alta',    t: '8h',  color: '#d46b08', bg: '#fff7e6', border: '#ffd591' },
  { label: 'Media',   t: '24h', color: '#0958d9', bg: '#e6f4ff', border: '#91caff' },
  { label: 'Baja',    t: '72h', color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f' },
]

/* ── componente separador de sección ── */
function SecTitle({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

export default function PortalInicio() {
  const navigate    = useNavigate()
  const { usuario } = useAuthStore()
  const [busquedaKB, setBusquedaKB] = useState('')

  const hora    = new Date().getHours()
  const saludo  = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  /* ── sin cambios en la lógica ── */
  const irANuevoTicket = (categoria) =>
    navigate('/portal/nuevo-ticket', { state: { categoria } })

  const buscarEnKB = () => {
    const q = busquedaKB.trim()
    navigate(q ? `/portal/kb?q=${encodeURIComponent(q)}` : '/portal/kb')
  }

  return (
    <div>

      {/* ════════ BANNER ════════ */}
      <div style={{
        background: '#1677ff',
        borderRadius: 12,
        padding: '18px 22px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 3 }}>
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ color: '#fff', fontSize: 17, fontWeight: 500, marginBottom: 6 }}>
            {saludo}, {usuario?.nombre} 👋
          </div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, maxWidth: 420 }}>
            ¿En qué te podemos ayudar hoy? Crea un ticket y un técnico lo atenderá a la brevedad.
          </div>
        </div>
        <Space>
          <Button
            icon={<PlusCircleOutlined />}
            onClick={() => navigate('/portal/nuevo-ticket')}
            style={{ background: '#fff', color: '#1677ff', border: 'none', fontWeight: 600, fontSize: 12 }}
          >
            Crear nuevo ticket
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => navigate('/portal/mis-tickets')}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', fontSize: 12 }}
          >
            Ver mis tickets
          </Button>
        </Space>
      </div>

      {/* ════════ KB BÚSQUEDA ════════ */}
      <Card
        size="small"
        style={{ marginBottom: 16, background: '#f0f5ff', border: '1px solid #91caff', borderRadius: 12 }}
        styles={{ body: { padding: '14px 18px' } }}
      >
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <BookOutlined style={{ color: '#1677ff', fontSize: 16 }} />
              <Text style={{ fontSize: 13, fontWeight: 500 }}>Busca en la base de conocimiento</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Antes de crear un ticket, busca si ya existe una solución documentada.
            </Text>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Input
                placeholder="Ej: no puedo imprimir, VPN no conecta, olvidé mi clave..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={busquedaKB}
                onChange={e => setBusquedaKB(e.target.value)}
                onPressEnter={buscarEnKB}
                allowClear
                style={{ flex: 1, fontSize: 12 }}
              />
              <Button type="primary" onClick={buscarEnKB} icon={<SearchOutlined />} style={{ fontSize: 12 }}>
                Buscar
              </Button>
            </div>
          </Col>
          <Col flex="none">
            <Button
              type="link"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/portal/kb')}
              style={{ fontSize: 12, padding: 0 }}
            >
              Ver todos los artículos
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ════════ CATEGORÍAS RÁPIDAS ════════ */}
      <SecTitle>¿Qué tipo de problema tienes?</SecTitle>
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {CATEGORIAS_RAPIDAS.map(cat => (
          <Col key={cat.categoria} xs={12} sm={6} md={3}>
            <Card
              size="small"
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px solid #f0f0f0',
                borderRadius: 10,
                transition: 'border-color .15s, background .15s',
              }}
              styles={{ body: { padding: '14px 6px' } }}
              onClick={() => irANuevoTicket(cat.categoria)}
              hoverable
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: cat.bg, color: cat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, margin: '0 auto 8px',
              }}>
                {cat.icon}
              </div>
              <Text style={{ fontSize: 11, display: 'block', color: '#434343' }}>{cat.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ════════ CÓMO FUNCIONA + SLA ════════ */}
      <Row gutter={12} style={{ marginBottom: 16 }}>

        {/* Pasos */}
        <Col xs={24} md={14}>
          <Card
            size="small"
            title={<span style={{ fontSize: 12, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Cómo funciona?</span>}
            style={{ borderRadius: 12, border: '1px solid #f0f0f0', height: '100%' }}
            styles={{ header: { minHeight: 40, borderBottom: '1px solid #f0f0f0' }, body: { padding: '12px 16px' } }}
          >
            <Row gutter={12}>
              {PASOS.map((paso, i) => (
                <Col key={i} span={8}>
                  <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `${paso.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: paso.color,
                      margin: '0 auto 8px',
                    }}>
                      {paso.icon}
                    </div>
                    <Text style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 3 }}>
                      {i + 1}. {paso.titulo}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
                      {paso.desc}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* SLA */}
        <Col xs={24} md={10}>
          <Card
            size="small"
            title={<span style={{ fontSize: 12, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tiempos de atención</span>}
            style={{ borderRadius: 12, border: '1px solid #f0f0f0', height: '100%' }}
            styles={{ header: { minHeight: 40, borderBottom: '1px solid #f0f0f0' }, body: { padding: '12px 16px' } }}
          >
            <Row gutter={8}>
              {SLA_ITEMS.map(({ label, t, color, bg, border }) => (
                <Col span={12} key={label} style={{ marginBottom: 8 }}>
                  <div style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    textAlign: 'center',
                  }}>
                    <Tag
                      color={color === '#cf1322' ? 'red' : color === '#d46b08' ? 'orange' : color === '#0958d9' ? 'blue' : 'green'}
                      style={{ fontSize: 10, marginBottom: 4, display: 'block' }}
                    >
                      {label}
                    </Tag>
                    <div style={{ fontWeight: 600, fontSize: 16, color }}>{t}</div>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {label === 'Crítica' ? 'Sistemas caídos' : label === 'Alta' ? 'Afecta el trabajo' : label === 'Media' ? 'Con alternativa' : 'Consultas'}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

      </Row>

    </div>
  )
}
