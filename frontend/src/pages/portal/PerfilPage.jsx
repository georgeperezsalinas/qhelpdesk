import { Card, Form, Input, Button, Divider, Row, Col, Tag, Typography, message, Upload, Spin } from 'antd'
import { UserOutlined, LockOutlined, SaveOutlined, CameraOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { configuracionService } from '../../services/configuracionService'
import api from '../../services/api'

const { Title, Text } = Typography

const ROL_COLORES = {
  jefe:'purple', especialista:'blue', mesa_ayuda:'cyan',
  alta_direccion:'red', usuario_final:'default', usuario_externo:'orange',
}
const ROL_LABELS = {
  jefe:'Jefe de área', especialista:'Especialista', mesa_ayuda:'Mesa de ayuda',
  alta_direccion:'Alta Dirección', usuario_final:'Usuario', usuario_externo:'Externo',
}

export default function PerfilPage() {
  const { usuario, setUsuario } = useAuthStore()
  const [loadingPerfil, setLoadingPerfil] = useState(false)
  const [loadingPw,     setLoadingPw]     = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [fotoUrl,       setFotoUrl]       = useState(usuario?.foto_url || null)
  const [formPw] = Form.useForm()

  const subirFoto = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const { data } = await configuracionService.subirArchivo(file)
      setFotoUrl(data.url)
      onSuccess(data)
      // Guardar foto inmediatamente en el perfil
      const { data: updated } = await api.patch('/usuarios/me', { foto_url: data.url })
      setUsuario(updated)
      message.success('Foto actualizada')
    } catch (err) {
      onError(err)
      message.error('Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  const guardarPerfil = async (values) => {
    setLoadingPerfil(true)
    try {
      const { data: updated } = await api.patch('/usuarios/me', { ...values, foto_url: fotoUrl })
      setUsuario(updated)
      message.success('Perfil actualizado correctamente')
    } catch {
      message.error('Error al actualizar el perfil')
    } finally {
      setLoadingPerfil(false)
    }
  }

  const cambiarPassword = async (values) => {
    setLoadingPw(true)
    try {
      await api.post('/usuarios/me/cambiar-password', values)
      message.success('Contraseña actualizada correctamente')
      formPw.resetFields()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Error al cambiar la contraseña')
    } finally {
      setLoadingPw(false)
    }
  }

  return (
    <>
      <Title level={4} style={{ marginBottom: 24 }}>Mi perfil</Title>
      <Row gutter={24}>
        <Col xs={24} md={8}>
          <Card style={{ textAlign: 'center' }}>

            {/* Avatar con foto o iniciales + botón de cámara */}
            <Upload
              accept="image/*"
              showUploadList={false}
              customRequest={subirFoto}
              beforeUpload={(file) => {
                if (!file.type.startsWith('image/')) { message.error('Solo imágenes'); return false }
                if (file.size > 2 * 1024 * 1024)    { message.error('Máx. 2 MB');     return false }
                return true
              }}
            >
              <Spin spinning={uploading}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12, cursor: 'pointer' }}>
                  <div style={{
                    width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
                    background: fotoUrl ? 'transparent' : '#1677ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, color: '#fff', fontWeight: 700,
                    border: '3px solid #e2e8f0',
                  }}>
                    {fotoUrl
                      ? <img src={fotoUrl} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <>{usuario?.nombre?.[0]}{usuario?.apellido?.[0]}</>
                    }
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#1677ff', border: '2px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CameraOutlined style={{ fontSize: 12, color: '#fff' }} />
                  </div>
                </div>
              </Spin>
            </Upload>

            <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>Haz clic para cambiar foto</div>

            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {usuario?.nombre} {usuario?.apellido}
            </div>
            <div style={{ color: '#888', marginBottom: 8 }}>{usuario?.cargo || '—'}</div>
            <Tag color={ROL_COLORES[usuario?.rol]}>{ROL_LABELS[usuario?.rol]}</Tag>
            <Divider />
            <div style={{ textAlign: 'left', fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary">Usuario:</Text> <Text strong>{usuario?.username}</Text>
              </div>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary">Email:</Text> <Text>{usuario?.email}</Text>
              </div>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary">Área:</Text> <Text>{usuario?.area || '—'}</Text>
              </div>
              <div>
                <Text type="secondary">Sede:</Text> <Text>{usuario?.sede?.nombre || '—'}</Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="Datos personales" style={{ marginBottom: 16 }}>
            <Form layout="vertical" initialValues={usuario} onFinish={guardarPerfil}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="apellido" label="Apellido" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="telefono" label="Teléfono">
                    <Input placeholder="01-XXXXXXX" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="celular" label="Celular">
                    <Input placeholder="9XXXXXXXX" />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loadingPerfil}>
                Guardar cambios
              </Button>
            </Form>
          </Card>

          <Card title="Cambiar contraseña">
            <Form form={formPw} layout="vertical" onFinish={cambiarPassword}>
              <Form.Item name="password_actual" label="Contraseña actual" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item name="password_nuevo" label="Nueva contraseña"
                rules={[{ required: true }, { min: 8, message: 'Mínimo 8 caracteres' }]}>
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item name="password_confirmar" label="Confirmar nueva contraseña"
                rules={[
                  { required: true },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password_nuevo') === value)
                        return Promise.resolve()
                      return Promise.reject('Las contraseñas no coinciden')
                    }
                  })
                ]}>
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<LockOutlined />} loading={loadingPw}>
                Cambiar contraseña
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  )
}
