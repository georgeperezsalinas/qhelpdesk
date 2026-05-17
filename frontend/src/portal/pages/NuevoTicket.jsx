import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Form, Input, Select, Button, Card, Typography, Steps,
  Result, Space, Alert, Row, Col,
} from 'antd'
import {
  SendOutlined, ArrowLeftOutlined,
  CheckCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { ticketService, CATEGORIAS, PRIORIDADES } from '../../services/ticketService'

const { Text, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

/* sin cambios en datos */
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

  /* sin cambios en lógica */
  const onValuesChange = ({ categoria }) => {
    if (categoria) setCategoriaSelec(categoria)
  }

  const enviar = async (values) => {
    setLoading(true)
    try {
      const { data } = await ticketService.crear({ ...values, canal_entrada: 'portal' })
      setEnviado(data)
      setPaso(2)
    } catch (err) {
      form.setFields([{ name: 'titulo', errors: [err.response?.data?.detail || 'Error al enviar el ticket'] }])
    } finally { setLoading(false) }
  }

  /* ── Formulario ── */
  const FormularioTicket = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={enviar}
      onValuesChange={onValuesChange}
      initialValues={{ categoria: location.state?.categoria, prioridad: 'media' }}
    >
      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Form.Item
            name="titulo"
            label={<span style={{ fontSize: 12, color: '#595959' }}>¿Cuál es el problema? (resumen)</span>}
            rules={[{ required: true, message: 'Describe brevemente el problema' }]}
          >
            <Input
              placeholder="Ej: No puedo conectarme a internet desde mi PC"
              maxLength={200} showCount
              style={{ fontSize: 12 }}
            />
          </Form.Item>

          <Form.Item
            name="descripcion"
            label={<span style={{ fontSize: 12, color: '#595959' }}>Descripción detallada</span>}
            extra={<span style={{ fontSize: 11 }}>Cuanto más detalle des, más rápido podremos ayudarte.</span>}
          >
            <TextArea
              placeholder={
                categoriaSelec && TIPS_CATEGORIA[categoriaSelec]
                  ? TIPS_CATEGORIA[categoriaSelec]
                  : 'Describe el problema paso a paso: ¿qué estabas haciendo? ¿qué error aparece? ¿desde cuándo ocurre?'
              }
              rows={5} maxLength={2000} showCount
              style={{ fontSize: 12 }}
            />
          </Form.Item>

          {categoriaSelec && TIPS_CATEGORIA[categoriaSelec] && (
            <Alert
              type="info" icon={<InfoCircleOutlined />} showIcon
              message={<span style={{ fontSize: 12 }}>{TIPS_CATEGORIA[categoriaSelec]}</span>}
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            name="categoria"
            label={<span style={{ fontSize: 12, color: '#595959' }}>Categoría</span>}
            rules={[{ required: true, message: 'Selecciona una categoría' }]}
          >
            <Select placeholder="¿Qué área es el problema?" style={{ fontSize: 12 }}>
              {CATEGORIAS.map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item
            name="prioridad"
            label={<span style={{ fontSize: 12, color: '#595959' }}>Urgencia</span>}
            extra={<span style={{ fontSize: 11 }}>La prioridad final la asigna el área de sistemas.</span>}
          >
            <Select style={{ fontSize: 12 }}>
              {PRIORIDADES.map(p => (
                <Option key={p.value} value={p.value}>
                  <span style={{ color: p.color }}>■</span> {p.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* SLA info — mismo diseño que original pero con tokens ERP Pro */}
          <Card
            size="small"
            style={{ background: '#f0f5ff', border: '1px solid #91caff', borderRadius: 10, marginTop: 4 }}
            styles={{ body: { padding: '10px 12px' } }}
          >
            <Text style={{ fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Tiempos de respuesta
            </Text>
            {[
              { p: 'Crítica', t: '4h',  c: '#cf1322' },
              { p: 'Alta',    t: '8h',  c: '#d46b08' },
              { p: 'Media',   t: '24h', c: '#1677ff' },
              { p: 'Baja',    t: '72h', c: '#389e0d' },
            ].map(x => (
              <div key={x.p} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 11, color: x.c }}>{x.p}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{x.t}</Text>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Space style={{ marginTop: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/portal')} style={{ fontSize: 12 }}>
          Cancelar
        </Button>
        <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={loading} style={{ fontSize: 12 }}>
          Enviar ticket
        </Button>
      </Space>
    </Form>
  )

  /* ── Confirmación ── */
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
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            Un técnico será asignado automáticamente. Recibirás actualizaciones
            por correo electrónico. También puedes consultar el estado en <strong>Mis tickets</strong>.
          </Paragraph>
          {enviado?.sla_limite && (
            <Alert
              type="info" showIcon
              message={`Tiempo estimado de resolución: antes del ${new Date(enviado.sla_limite).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}`}
              style={{ maxWidth: 400, margin: '14px auto 0', borderRadius: 8 }}
            />
          )}
        </div>
      }
      extra={[
        <Button key="otro" type="primary" icon={<SendOutlined />} style={{ fontSize: 12 }}
          onClick={() => { form.resetFields(); setPaso(0); setEnviado(null); setCategoriaSelec(null) }}>
          Crear otro ticket
        </Button>,
        <Button key="mis" icon={<CheckCircleOutlined />} style={{ fontSize: 12 }}
          onClick={() => navigate('/portal/mis-tickets')}>
          Ver mis tickets
        </Button>,
      ]}
    />
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/portal')} size="small" />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>Nuevo ticket de soporte</span>
      </div>

      <Steps
        current={paso}
        size="small"
        style={{ marginBottom: 20 }}
        items={[
          { title: <span style={{ fontSize: 12 }}>Describir problema</span> },
          { title: <span style={{ fontSize: 12 }}>Enviando...</span> },
          { title: <span style={{ fontSize: 12 }}>Confirmación</span> },
        ]}
      />

      <Card style={{ borderRadius: 12, border: '1px solid #f0f0f0' }} styles={{ body: { padding: '18px 20px' } }}>
        {paso < 2 ? <FormularioTicket /> : <Confirmacion />}
      </Card>
    </div>
  )
}
