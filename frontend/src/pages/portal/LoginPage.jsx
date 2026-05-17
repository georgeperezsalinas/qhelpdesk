// ─────────────────────────────────────────────────────────────────────
// src/pages/portal/LoginPage.jsx
// Rediseño v2 — editorial + operacional
// ─────────────────────────────────────────────────────────────────────
//
// REQUIERE: cargar las fuentes en tu index.html (una sola vez):
//
//   <link rel="preconnect" href="https://fonts.googleapis.com">
//   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
//   <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
//
// REQUIERE: el archivo LoginPage.css adjunto en la misma carpeta.

import { useState } from 'react'
import { Form, Input, Checkbox, message } from 'antd'
import {
  UserOutlined, LockOutlined, ArrowRightOutlined, GlobalOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import './LoginPage.css'

const ROLES_INTERNOS = ['jefe', 'especialista', 'mesa_ayuda']

// ── Iconos line (sustitutos a los emojis del diseño anterior) ──────────
const LineIcon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)
const ICONS = {
  ticket:    <LineIcon d={<><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v2M13 11v2M13 16v2"/></>} />,
  inventory: <LineIcon d={<><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></>} />,
  chart:     <LineIcon d={<><path d="M3 21h18"/><path d="M7 17v-6"/><path d="M12 17V7"/><path d="M17 17v-9"/></>} />,
  bell:      <LineIcon d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>} />,
}

const FEATURES = [
  { ic: ICONS.ticket,    t: 'Gestión de tickets con SLA automático' },
  { ic: ICONS.inventory, t: 'Inventario TI y depreciación de activos' },
  { ic: ICONS.chart,     t: 'Reportes Excel y PDF nivel ERP' },
  { ic: ICONS.bell,      t: 'Notificaciones en tiempo real' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth  = useAuthStore(s => s.setAuth)
  const [form]   = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    setLoading(true)
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
    } finally { setLoading(false) }
  }

  return (
    <div className="lg-root">

      {/* ── Panel izquierdo: editorial ink ─────────────────────────── */}
      <div className="lg-left">
        <div className="lg-noise" />

        <div className="lg-brand">
          <div className="lg-mono">Q</div>
          <div>
            <div className="lg-wordmark">QHelpDesk</div>
            <div className="lg-sublabel">Gov · Tech · Pro</div>
          </div>
        </div>

        <div className="lg-hero">
          <div className="lg-eyebrow"><span className="dot" />Versión 2.0 · 2026</div>
          <h1 className="lg-headline">
            Mesa de ayuda.<br/>
            <em>Reimaginada</em> para<br/>
            el sector público.
          </h1>
          <p className="lg-lede">
            Una sola plataforma para soporte, inventario, mantenimiento, infraestructura
            y telefonía — diseñada para los técnicos que viven en el sistema todo el día.
          </p>

          <div className="lg-features">
            {FEATURES.map(f => (
              <div key={f.t} className="lg-feat">
                <span className="lg-feat-ic">{f.ic}</span>
                <span>{f.t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg-stats">
          <div className="lg-stat">
            <div className="lg-stat-v">12,840</div>
            <div className="lg-stat-l">tickets atendidos en 2025</div>
          </div>
          <div className="lg-stat">
            <div className="lg-stat-v">94<span style={{ fontSize: 18 }}>%</span></div>
            <div className="lg-stat-l">cumplimiento de SLA</div>
          </div>
          <div className="lg-stat">
            <div className="lg-stat-v">8.4<span style={{ fontSize: 18 }}>/10</span></div>
            <div className="lg-stat-l">satisfacción del usuario</div>
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ──────────────────────────────── */}
      <div className="lg-right">
        <div className="lg-form-wrap">
          <div className="lg-form-head">
            <div className="lg-form-eyebrow">Acceso institucional</div>
            <div className="lg-form-title">Iniciar <em>sesión</em></div>
            <div className="lg-form-sub">
              Ingresa con tus credenciales corporativas para acceder a la mesa de ayuda.
            </div>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish}
            className="lg-form" requiredMark={false}>

            <Form.Item name="username"
              label={<span className="lg-flbl">Usuario</span>}
              rules={[{ required: true, message: 'Ingresa tu usuario' }]}
              style={{ marginBottom: 14 }}>
              <Input
                size="large"
                prefix={<UserOutlined style={{ color: 'var(--ink-3)' }} />}
                placeholder="usuario.apellido"
                className="lg-ant-input"
                autoFocus
              />
            </Form.Item>

            <Form.Item name="password"
              label={
                <div className="lg-label-row">
                  <span className="lg-flbl">Contraseña</span>
                  <a className="lg-link" onClick={(e) => e.preventDefault()} href="#">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              }
              rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
              style={{ marginBottom: 14 }}>
              <Input.Password
                size="large"
                prefix={<LockOutlined style={{ color: 'var(--ink-3)' }} />}
                placeholder="••••••••••"
                className="lg-ant-input"
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked" initialValue={true}
              style={{ marginBottom: 18 }}>
              <Checkbox className="lg-check-ant">
                Mantener mi sesión iniciada en este equipo
              </Checkbox>
            </Form.Item>

            <button type="submit" className="lg-btn-primary" disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar al sistema'}
              <ArrowRightOutlined />
            </button>

            <div className="lg-divider"><span>o</span></div>

            <button type="button" className="lg-btn-secondary">
              <GlobalOutlined />
              Continuar con SSO institucional
            </button>
          </Form>

          <div className="lg-help">
            ¿Problemas para ingresar? Contacta a la{' '}
            <a className="lg-link" href="#" onClick={(e) => e.preventDefault()}>
              Oficina de Sistemas
            </a>{' '}
            o llama al anexo <span className="lg-mono">4321</span>.
          </div>

          <div className="lg-foot">
            <span>QHelpDesk · v2.0.4</span>
          </div>
        </div>
      </div>
    </div>
  )
}
