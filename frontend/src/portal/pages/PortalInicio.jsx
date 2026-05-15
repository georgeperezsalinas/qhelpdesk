import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Row, Col, Card, Typography, Space, Tag, Input } from 'antd'
import {
  PlusCircleOutlined, FileTextOutlined, LaptopOutlined,
  WifiOutlined, MailOutlined, PrinterOutlined, LockOutlined,
  PhoneOutlined, SafetyOutlined, QuestionCircleOutlined,
  ClockCircleOutlined, CheckCircleOutlined, BookOutlined, SearchOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'

const { Title, Text, Paragraph } = Typography

const CATEGORIAS_RAPIDAS = [
  { icon: <LaptopOutlined />,       label: 'PC / Laptop',     categoria: 'hardware',      color: '#1677ff' },
  { icon: <PrinterOutlined />,      label: 'Impresora',       categoria: 'impresora',     color: '#52c41a' },
  { icon: <WifiOutlined />,         label: 'Red / Internet',  categoria: 'red',           color: '#fa8c16' },
  { icon: <MailOutlined />,         label: 'Correo',          categoria: 'correo',        color: '#eb2f96' },
  { icon: <LockOutlined />,         label: 'Acceso / Clave',  categoria: 'acceso',        color: '#722ed1' },
  { icon: <SafetyOutlined />,       label: 'VPN',             categoria: 'vpn',           color: '#13c2c2' },
  { icon: <PhoneOutlined />,        label: 'Telefonía',       categoria: 'telefonia',     color: '#fa541c' },
  { icon: <QuestionCircleOutlined />,label: 'Otro',           categoria: 'otro',          color: '#8c8c8c' },
]

const PASOS = [
  { icon: <PlusCircleOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
    titulo: '1. Crea tu ticket', desc: 'Describe tu problema y selecciona la categoría correspondiente.' },
  { icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
    titulo: '2. Se asigna un técnico', desc: 'El sistema asigna automáticamente al técnico más adecuado.' },
  { icon: <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
    titulo: '3. Resolución y cierre', desc: 'Recibes notificación cuando tu ticket es resuelto.' },
]

export default function PortalInicio() {
  const navigate  = useNavigate()
  const { usuario } = useAuthStore()
  const [busquedaKB, setBusquedaKB] = useState('')

  const irANuevoTicket = (categoria) => {
    navigate('/portal/nuevo-ticket', { state: { categoria } })
  }

  const buscarEnKB = () => {
    const q = busquedaKB.trim()
    navigate(q ? `/portal/kb?q=${encodeURIComponent(q)}` : '/portal/kb')
  }

  return (
    <div>
      {/* BIENVENIDA */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        borderRadius: 16, padding: '40px 48px', marginBottom: 28, color: '#fff',
      }}>
        <Title level={2} style={{ color: '#fff', margin: 0 }}>
          Hola, {usuario?.nombre} 👋
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: '12px 0 24px' }}>
          ¿En qué te podemos ayudar hoy? Crea un ticket y un técnico lo atenderá a la brevedad.
        </Paragraph>
        <Space>
          <Button
            size="large"
            icon={<PlusCircleOutlined />}
            style={{ background: '#fff', color: '#1677ff', border: 'none', fontWeight: 600 }}
            onClick={() => navigate('/portal/nuevo-ticket')}
          >
            Crear nuevo ticket
          </Button>
          <Button
            size="large"
            icon={<FileTextOutlined />}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
            onClick={() => navigate('/portal/mis-tickets')}
          >
            Ver mis tickets
          </Button>
        </Space>
      </div>

      {/* BASE DE CONOCIMIENTO — búsqueda rápida */}
      <Card
        style={{ marginBottom: 28, background: '#f6f9ff', border: '1px solid #d6e4ff' }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <BookOutlined style={{ color: '#1677ff', fontSize: 18 }} />
              <Text strong style={{ fontSize: 15 }}>Busca en la base de conocimiento</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Antes de crear un ticket, busca si ya existe una solución documentada.
            </Text>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Input
                placeholder="Ej: no puedo imprimir, VPN no conecta, olvide mi clave..."
                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                value={busquedaKB}
                onChange={e => setBusquedaKB(e.target.value)}
                onPressEnter={buscarEnKB}
                allowClear
                style={{ flex: 1 }}
              />
              <Button type="primary" onClick={buscarEnKB} icon={<SearchOutlined />}>
                Buscar
              </Button>
            </div>
          </Col>
          <Col flex="none" style={{ textAlign: 'right' }}>
            <Button
              type="link"
              icon={<BookOutlined />}
              onClick={() => navigate('/portal/kb')}
              style={{ padding: 0 }}
            >
              Ver todos los artículos
            </Button>
          </Col>
        </Row>
      </Card>

      {/* CATEGORÍAS RÁPIDAS */}
      <Title level={5} style={{ marginBottom: 16 }}>¿Qué tipo de problema tienes?</Title>
      <Row gutter={[12, 12]} style={{ marginBottom: 32 }}>
        {CATEGORIAS_RAPIDAS.map(cat => (
          <Col key={cat.categoria} xs={12} sm={6} md={3}>
            <Card
              hoverable size="small"
              style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid #f0f0f0' }}
              styles={{ body: { padding: '16px 8px' } }}
              onClick={() => irANuevoTicket(cat.categoria)}
            >
              <div style={{ fontSize: 28, color: cat.color, marginBottom: 8 }}>
                {cat.icon}
              </div>
              <Text style={{ fontSize: 12, display: 'block' }}>{cat.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* CÓMO FUNCIONA */}
      <Title level={5} style={{ marginBottom: 16 }}>¿Cómo funciona?</Title>
      <Row gutter={16} style={{ marginBottom: 32 }}>
        {PASOS.map((paso, i) => (
          <Col key={i} xs={24} md={8}>
            <Card size="small" style={{ height: '100%' }}>
              <Space direction="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
                {paso.icon}
                <Text strong>{paso.titulo}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{paso.desc}</Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* TIEMPOS DE ATENCIÓN */}
      <Card title="Tiempos de atención según prioridad" size="small">
        <Row gutter={12}>
          {[
            { label: 'Crítica',  sla: '4 horas',  color: '#ff4d4f', desc: 'Alta Dirección, sistemas caídos' },
            { label: 'Alta',     sla: '8 horas',  color: '#fa8c16', desc: 'Afecta trabajo del usuario'      },
            { label: 'Media',    sla: '24 horas', color: '#1677ff', desc: 'Problema con solución alternativa'},
            { label: 'Baja',     sla: '72 horas', color: '#52c41a', desc: 'Consultas y mejoras'             },
          ].map(p => (
            <Col key={p.label} xs={12} md={6}>
              <div style={{
                border: `1px solid ${p.color}`, borderRadius: 8,
                padding: '12px 16px', textAlign: 'center',
              }}>
                <Tag color={p.color === '#ff4d4f' ? 'red' : p.color === '#fa8c16' ? 'orange' : p.color === '#1677ff' ? 'blue' : 'green'}
                  style={{ marginBottom: 6 }}>
                  {p.label}
                </Tag>
                <div style={{ fontWeight: 700, fontSize: 18, color: p.color }}>{p.sla}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{p.desc}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}
