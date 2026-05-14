import { Form, Input, Button, Typography, message, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const { Text } = Typography
const ROLES_INTERNOS = ['jefe', 'especialista', 'mesa_ayuda']

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth  = useAuthStore(s => s.setAuth)
  const [form]   = Form.useForm()

  const onFinish = async (values) => {
    try {
      const fd = new FormData()
      fd.append('username', values.username)
      fd.append('password', values.password)
      const { data } = await api.post('/usuarios/login', fd)
      setAuth(data.access_token, data.refresh_token, data.usuario, data.expires_in)
      message.success(`Bienvenido, ${data.usuario.nombre}`)
      const destino = location.state?.from?.pathname ||
        (ROLES_INTERNOS.includes(data.usuario.rol) ? '/dashboard' : '/portal')
      navigate(destino, { replace: true })
    } catch (err) {
      message.error(err.response?.data?.detail || 'Usuario o contraseña incorrectos')
      form.setFieldValue('password', '')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a' }}>

      {/* Panel izquierdo — branding (oculto en mobile vía CSS) */}
      <div className="login-left" style={{
        width: '45%', flexShrink: 0,
        background: 'linear-gradient(160deg, #1e3a5f 0%, #1d4ed8 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)', top: -100, right: -100,
        }} />
        <div style={{
          position: 'absolute', width: 250, height: 250, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.06)', bottom: 40, left: -80,
        }} />
        <div style={{
          width: 60, height: 60, borderRadius: 14,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: 'rgba(255,255,255,0.5)',
          marginBottom: 32, textAlign: 'center',
        }}>
          LOGO
        </div>
        <div style={{ color: '#fff', fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 12 }}>
          QHELP DESK<br />
          <span style={{ color: '#93c5fd' }}>ERP</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}>
          Sistema integral de mesa de ayuda para entidades del sector público.
        </div>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: '🎫', text: 'Gestión de tickets con SLA automático'     },
            { icon: '💻', text: 'Inventario TI y depreciación de activos'   },
            { icon: '📊', text: 'Reportes Excel y PDF nivel ERP'            },
            { icon: '🔔', text: 'Notificaciones en tiempo real'             },
          ].map(f => (
            <div key={f.icon} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{f.icon}</span>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{f.text}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="login-right" style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#fff', padding: '40px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              Iniciar sesión
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Ingresa tus credenciales institucionales
            </Text>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="username" label="Usuario"
              rules={[{ required: true, message: 'Ingresa tu usuario' }]}>
              <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="usuario.apellido" autoFocus
                style={{ borderRadius: 8, height: 44 }} />
            </Form.Item>
            <Form.Item name="password" label="Contraseña"
              rules={[{ required: true, message: 'Ingresa tu contraseña' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="••••••••"
                style={{ borderRadius: 8, height: 44 }} />
            </Form.Item>
            <Form.Item style={{ marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block style={{
                height: 46, borderRadius: 8,
                background: '#1d4ed8', border: 'none',
                fontSize: 14, fontWeight: 600,
              }}>
                Ingresar al sistema
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '24px 0' }} />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ¿Problemas para ingresar? Contacta a la Oficina de Sistemas
            </Text>
          </div>
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Text style={{ fontSize: 10, color: '#cbd5e1' }}>
              QHELP DESK ERP v1.0 · GOV TECH PRO
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
