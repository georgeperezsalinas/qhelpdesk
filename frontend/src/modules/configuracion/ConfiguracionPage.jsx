import { useState, useEffect } from 'react'
import {
  Card, Form, Input, Button, Upload, message, Typography,
  Divider, Row, Col, Space, Spin,
} from 'antd'
import {
  SettingOutlined, UploadOutlined, SaveOutlined, PictureOutlined,
} from '@ant-design/icons'
import { configuracionService } from '../../services/configuracionService'
import { useAuthStore } from '../../store/authStore'

const { Title, Text } = Typography

export default function ConfiguracionPage() {
  const { usuario } = useAuthStore()
  const esJefe = usuario?.rol === 'jefe'

  const [form]     = Form.useForm()
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [logoUrl,  setLogoUrl]  = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setLoading(true)
    configuracionService.obtener()
      .then(({ data }) => {
        form.setFieldsValue({
          app_name:    data.app_name    || 'QHelpDesk',
          descripcion: data.descripcion || '',
          color_primario: data.color_primario || '#1d4ed8',
        })
        setLogoUrl(data.logo_url || null)
      })
      .catch(() => message.error('Error al cargar configuración'))
      .finally(() => setLoading(false))
  }, [form])

  const guardar = async (values) => {
    setSaving(true)
    try {
      await configuracionService.actualizar({ ...values, logo_url: logoUrl })
      message.success('Configuración guardada')
      document.title = values.app_name || 'QHelpDesk'
      window.dispatchEvent(new CustomEvent('configuracion-updated', {
        detail: { app_name: values.app_name, logo_url: logoUrl },
      }))
    } catch {
      message.error('Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  const subirLogo = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const { data } = await configuracionService.subirArchivo(file)
      setLogoUrl(data.url)
      onSuccess(data)
      message.success('Logo subido correctamente')
    } catch (err) {
      onError(err)
      message.error('Error al subir el logo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <SettingOutlined style={{ marginRight: 8 }} />
          Configuración del sistema
        </Title>
      </div>

      <Spin spinning={loading}>
        <Row gutter={24}>
          {/* Logo */}
          <Col xs={24} md={8}>
            <Card title="Logo de la aplicación" size="small">
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', marginBottom: 12 }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: 100, background: '#f1f5f9',
                    borderRadius: 8, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', marginBottom: 12, border: '2px dashed #cbd5e1',
                  }}>
                    <Space direction="vertical" align="center">
                      <PictureOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>Sin logo</Text>
                    </Space>
                  </div>
                )}
                {esJefe && (
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    customRequest={subirLogo}
                    beforeUpload={(file) => {
                      if (!file.type.startsWith('image/')) {
                        message.error('Solo se permiten imágenes')
                        return false
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        message.error('El logo debe ser menor a 2 MB')
                        return false
                      }
                      return true
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={uploading} block>
                      {logoUrl ? 'Cambiar logo' : 'Subir logo'}
                    </Button>
                  </Upload>
                )}
                {logoUrl && esJefe && (
                  <Button
                    danger size="small" style={{ marginTop: 8, width: '100%' }}
                    onClick={() => setLogoUrl(null)}
                  >
                    Quitar logo (guarda para aplicar)
                  </Button>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Formato: JPG, PNG, SVG · Máx. 2 MB · Recomendado: 200×60 px
              </Text>
            </Card>
          </Col>

          {/* Datos generales */}
          <Col xs={24} md={16}>
            <Card
              title="Datos generales"
              size="small"
              extra={
                esJefe && (
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={() => form.submit()}
                  >
                    Guardar cambios
                  </Button>
                )
              }
            >
              <Form form={form} layout="vertical" onFinish={guardar} disabled={!esJefe}>
                <Form.Item
                  name="app_name"
                  label="Nombre de la aplicación"
                  rules={[{ required: true, message: 'Ingresa el nombre' }]}
                >
                  <Input placeholder="QHelpDesk" maxLength={80} />
                </Form.Item>

                <Form.Item name="descripcion" label="Descripción corta">
                  <Input placeholder="Sistema de Mesa de Ayuda" maxLength={120} />
                </Form.Item>

                <Divider plain style={{ margin: '12px 0' }}>Apariencia</Divider>

                <Form.Item name="color_primario" label="Color primario">
                  <Row gutter={8} align="middle">
                    <Col>
                      <Form.Item name="color_primario" noStyle>
                        <input
                          type="color"
                          style={{ width: 40, height: 32, padding: 0, border: 'none', cursor: 'pointer' }}
                          onChange={(e) => form.setFieldValue('color_primario', e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col flex={1}>
                      <Form.Item name="color_primario" noStyle>
                        <Input placeholder="#1d4ed8" maxLength={7} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form.Item>

                {!esJefe && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Solo los administradores pueden modificar la configuración.
                  </Text>
                )}
              </Form>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
