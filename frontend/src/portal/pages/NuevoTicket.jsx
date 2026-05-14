import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Form, Input, Select, Button, Card, Typography, Steps,
  Result, Space, Alert, Row, Col, Upload, Tag,
} from 'antd'
import {
  SendOutlined, ArrowLeftOutlined, PaperClipOutlined,
  CheckCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { ticketService, CATEGORIAS, PRIORIDADES } from '../../services/ticketService'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

const TIPS_CATEGORIA = {
  hardware:      'Incluye el código de inventario del equipo si lo tienes (ej: EQ-LIM-0001).',
  software:      'Indica el nombre del programa, versión y el mensaje de error exacto.',
  red:           'Indica si el problema afecta solo tu equipo o a toda el área.',
  acceso:        'Indica el sistema al que no puedes acceder y tu nombre de usuario.',
  vpn:           'Indica desde qué ubicación intentas conectarte y el error que aparece.',
  correo:        'Indica si no puedes enviar, recibir o ambos. ¿Desde cuándo ocurre?',
  impresora:     'Indica el nombre o ubicación de la impresora y el error mostrado.',
  telefonia:     'Indica el número de extensión o celular con el problema.',
  servidor:      'Indica el nombre del servidor y el servicio afectado.',
  seguridad:     'Describe el incidente con el mayor detalle posible.',
  mantenimiento: 'Indica el equipo que requiere mantenimiento y el tipo.',
  otro:          'Describe con el mayor detalle posible tu requerimiento.',
}

export default function NuevoTicket() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [form]    = Form.useForm()
  const [paso,    setPaso]    = useState(0)
  const [enviado, setEnviado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [categoriaSelec, setCategoriaSelec] = useState(location.state?.categoria || null)

  const onValuesChange = ({ categoria }) => {
    if (categoria) setCategoriaSelec(categoria)
  }

  const enviar = async (values) => {
    setLoading(true)
    try {
      const { data } = await ticketService.crear({
        ...values,
        canal_entrada: 'portal',
      })
      setEnviado(data)
      setPaso(2)
    } catch (err) {
      form.setFields([{
        name: 'titulo',
        errors: [err.response?.data?.detail || 'Error al enviar el ticket'],
      }])
    } finally { setLoading(false) }
  }

  // ── Paso 0: Formulario ────────────────────────────────────────────────────
  const FormularioTicket = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={enviar}
      onValuesChange={onValuesChange}
      initialValues={{ categoria: location.state?.categoria, prioridad: 'media' }}
      size="large"
    >
      <Row gutter={16}>
        <Col xs={24} md={16}>
          {/* Título */}
          <Form.Item
            name="titulo"
            label="¿Cuál es el problema? (resumen)"
            rules={[{ required: true, message: 'Describe brevemente el problema' }]}
          >
            <Input
              placeholder="Ej: No puedo conectarme a internet desde mi PC"
              maxLength={200}
              showCount
            />
          </Form.Item>

          {/* Descripción */}
          <Form.Item
            name="descripcion"
            label="Descripción detallada"
            extra="Cuanto más detalle des, más rápido podremos ayudarte."
          >
            <TextArea
              placeholder={
                categoriaSelec && TIPS_CATEGORIA[categoriaSelec]
                  ? TIPS_CATEGORIA[categoriaSelec]
                  : 'Describe el problema paso a paso: ¿qué estabas haciendo? ¿qué error aparece? ¿desde cuándo ocurre?'
              }
              rows={5}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          {categoriaSelec && TIPS_CATEGORIA[categoriaSelec] && (
            <Alert
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
              message={TIPS_CATEGORIA[categoriaSelec]}
              style={{ marginBottom: 16 }}
            />
          )}
        </Col>

        <Col xs={24} md={8}>
          {/* Categoría */}
          <Form.Item
            name="categoria"
            label="Categoría"
            rules={[{ required: true, message: 'Selecciona una categoría' }]}
          >
            <Select placeholder="¿Qué área es el problema?">
              {CATEGORIAS.map(c => (
                <Option key={c.value} value={c.value}>{c.label}</Option>
              ))}
            </Select>
          </Form.Item>

          {/* Prioridad */}
          <Form.Item
            name="prioridad"
            label="Urgencia"
            extra="La prioridad final la asigna el área de sistemas."
          >
            <Select>
              {PRIORIDADES.map(p => (
                <Option key={p.value} value={p.value}>
                  <span style={{ color: p.color }}>■</span> {p.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Info SLA */}
          <Card
            size="small"
            style={{ background: '#f6f9ff', border: '1px solid #d6e4ff', marginTop: 8 }}
          >
            <Text strong style={{ fontSize: 12 }}>Tiempos de respuesta</Text>
            <div style={{ marginTop: 8 }}>
              {[
                { p: 'Crítica', t: '4h',  c: '#ff4d4f' },
                { p: 'Alta',    t: '8h',  c: '#fa8c16' },
                { p: 'Media',   t: '24h', c: '#1677ff' },
                { p: 'Baja',    t: '72h', c: '#52c41a' },
              ].map(x => (
                <div key={x.p} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 11, color: x.c }}>{x.p}</Text>
                  <Text style={{ fontSize: 11 }} type="secondary">{x.t}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/portal')}>
          Cancelar
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SendOutlined />}
          loading={loading}
          size="large"
        >
          Enviar ticket
        </Button>
      </Space>
    </Form>
  )

  // ── Paso 2: Confirmación ──────────────────────────────────────────────────
  const Confirmacion = () => (
    <Result
      status="success"
      icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
      title="¡Tu ticket fue registrado!"
      subTitle={
        <div>
          <Paragraph>
            Tu solicitud ha sido registrada con el número{' '}
            <Text strong style={{ fontSize: 18, fontFamily: 'monospace' }}>
              {enviado?.numero}
            </Text>
          </Paragraph>
          <Paragraph type="secondary">
            Un técnico será asignado automáticamente. Recibirás actualizaciones
            por correo electrónico. También puedes consultar el estado en{' '}
            <strong>Mis tickets</strong>.
          </Paragraph>
          {enviado?.sla_limite && (
            <Alert
              type="info"
              showIcon
              message={`Tiempo estimado de resolución: antes del ${new Date(enviado.sla_limite).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}`}
              style={{ maxWidth: 400, margin: '16px auto 0' }}
            />
          )}
        </div>
      }
      extra={[
        <Button
          key="otro"
          type="primary"
          icon={<SendOutlined />}
          onClick={() => {
            form.resetFields()
            setPaso(0)
            setEnviado(null)
            setCategoriaSelec(null)
          }}
        >
          Crear otro ticket
        </Button>,
        <Button
          key="mis"
          icon={<CheckCircleOutlined />}
          onClick={() => navigate('/portal/mis-tickets')}
        >
          Ver mis tickets
        </Button>,
      ]}
    />
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/portal')}
        />
        <Title level={4} style={{ margin: 0 }}>Nuevo ticket de soporte</Title>
      </div>

      <Steps
        current={paso}
        style={{ marginBottom: 32 }}
        items={[
          { title: 'Describir problema' },
          { title: 'Enviando...' },
          { title: 'Confirmación' },
        ]}
      />

      <Card>
        {paso < 2 ? <FormularioTicket /> : <Confirmacion />}
      </Card>
    </div>
  )
}
