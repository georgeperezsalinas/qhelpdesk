import { Layout, Space, Avatar, Dropdown, Button, Badge } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LogoutOutlined, FileTextOutlined, PlusCircleOutlined,
  HomeOutlined, BookOutlined, BellOutlined, SettingOutlined,
  UserOutlined, BarChartOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'

const { Header, Content, Sider, Footer } = Layout

const ROL_LABELS = {
  usuario_final:   'Usuario',
  usuario_externo: 'Usuario externo',
  alta_direccion:  'Alta Dirección',
  jefe:            'Jefe de área',
  especialista:    'Especialista',
  mesa_ayuda:      'Mesa de ayuda',
}

const RUTAS_LABEL = {
  '/portal':              'Inicio',
  '/portal/mis-tickets':  'Mis tickets',
  '/portal/nuevo-ticket': 'Nuevo ticket',
  '/portal/kb':           'Base de conocimiento',
  '/portal/perfil':       'Mi perfil',
}

export default function PortalLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { usuario, logout } = useAuthStore()

  const path = location.pathname
  const bcLabel = Object.entries(RUTAS_LABEL)
    .filter(([k]) => k !== '/portal')
    .find(([k]) => path.startsWith(k))?.[1] ?? 'Inicio'

  const isActive = (ruta) =>
    ruta === '/portal' ? path === '/portal' : path.startsWith(ruta)

  /* ── menú avatar ── */
  const menuAvatar = {
    items: [
      { key: 'perfil',      icon: <UserOutlined />,     label: 'Mi perfil' },
      { key: 'mis-tickets', icon: <FileTextOutlined />, label: 'Mis tickets' },
      { key: 'kb',          icon: <BookOutlined />,     label: 'Base de conocimiento' },
      { type: 'divider' },
      { key: 'logout',      icon: <LogoutOutlined />,   label: 'Cerrar sesión', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout')      { logout(); navigate('/login') }
      if (key === 'mis-tickets') navigate('/portal/mis-tickets')
      if (key === 'kb')          navigate('/portal/kb')
      if (key === 'perfil')      navigate('/portal/perfil')
    },
  }

  /* ── grupos del sidebar ── */
  const sideGrupos = [
    {
      label: 'Principal',
      items: [
        { path: '/portal',              icon: <HomeOutlined />,        label: 'Inicio' },
        { path: '/portal/mis-tickets',  icon: <FileTextOutlined />,    label: 'Mis tickets',   badge: null },
        { path: '/portal/nuevo-ticket', icon: <PlusCircleOutlined />,  label: 'Nuevo ticket' },
      ],
    },
    {
      label: 'Recursos',
      items: [
        { path: '/portal/kb',           icon: <BookOutlined />,        label: 'Base de conocimiento' },
        { path: '/portal/estadisticas', icon: <BarChartOutlined />,    label: 'Mis estadísticas' },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { path: '/portal/perfil',       icon: <UserOutlined />,        label: 'Mi perfil' },
        { path: '/portal/preferencias', icon: <SettingOutlined />,     label: 'Preferencias' },
      ],
    },
  ]

  /* ── estilos reutilizables ── */
  const sNavBtn = (active) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    height: 'auto',
    border: 'none',
    fontWeight: active ? 500 : 400,
    color: active ? '#1677ff' : '#595959',
    background: active ? '#e6f4ff' : 'transparent',
    cursor: 'pointer',
    transition: 'background .15s, color .15s',
  })

  const topNavBtn = (active) => ({
    color: active ? '#fff' : 'rgba(255,255,255,0.72)',
    background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
    border: 'none',
    fontSize: 12,
  })

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f5ff' }}>

      {/* ════════ TOPBAR ════════ */}
      <Header style={{
        background: '#1677ff',
        padding: '0 24px',
        height: 54,
        lineHeight: '54px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Brand */}
        <Space
          size={10}
          align="center"
          style={{ cursor: 'pointer', lineHeight: 1 }}
          onClick={() => navigate('/portal')}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileTextOutlined style={{ color: '#fff', fontSize: 15 }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>
              Mesa de Ayuda
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, lineHeight: 1 }}>
              Portal de usuarios
            </div>
          </div>
        </Space>

        {/* Nav central */}
        <Space size={2}>
          {[
            { path: '/portal',             icon: <HomeOutlined />,     label: 'Inicio' },
            { path: '/portal/mis-tickets', icon: <FileTextOutlined />, label: 'Mis tickets' },
            { path: '/portal/kb',          icon: <BookOutlined />,     label: 'Ayuda' },
          ].map(({ path: p, icon, label }) => (
            <Button
              key={p}
              type="text"
              icon={icon}
              onClick={() => navigate(p)}
              style={topNavBtn(isActive(p))}
            >
              {label}
            </Button>
          ))}
          <Button
            icon={<PlusCircleOutlined />}
            onClick={() => navigate('/portal/nuevo-ticket')}
            style={{
              background: '#fff', color: '#1677ff',
              border: 'none', fontWeight: 600, fontSize: 12, marginLeft: 4,
            }}
          >
            Nuevo ticket
          </Button>
        </Space>

        {/* Derecha: notif + avatar */}
        <Space size={8}>
          <Badge count={0} size="small">
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{
                color: 'rgba(255,255,255,0.8)',
                background: 'rgba(255,255,255,0.1)',
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            />
          </Badge>

          <Dropdown menu={menuAvatar} placement="bottomRight" trigger={['click']}>
            <Space
              size={8}
              style={{
                cursor: 'pointer',
                padding: '3px 10px 3px 3px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.12)',
              }}
            >
              <Avatar
                size={26}
                style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 10, fontWeight: 600 }}
              >
                {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
              </Avatar>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ color: '#fff', fontSize: 11, fontWeight: 500 }}>
                  {usuario?.nombre} {usuario?.apellido}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>
                  {ROL_LABELS[usuario?.rol] || usuario?.rol}
                </div>
              </div>
            </Space>
          </Dropdown>
        </Space>
      </Header>

      {/* ════════ SUBBAR / BREADCRUMB ════════ */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '7px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Space size={5} style={{ fontSize: 11, color: '#8c8c8c' }}>
          <HomeOutlined style={{ fontSize: 11 }} />
          <span>Portal</span>
          <span>/</span>
          <span style={{ color: '#1677ff', fontWeight: 500 }}>{bcLabel}</span>
        </Space>
        <Space size={6}>
          <Button
            size="small"
            style={{ fontSize: 11 }}
            onClick={() => window.location.reload()}
          >
            ↻ Actualizar
          </Button>
        </Space>
      </div>

      <Layout style={{ background: '#f0f5ff' }}>

        {/* ════════ SIDEBAR ════════ */}
        <Sider
          width={200}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
            height: 'calc(100vh - 88px)',
            position: 'sticky',
            top: 88,
            flexShrink: 0,
          }}
        >
          <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {sideGrupos.map(({ label, items }) => (
              <div key={label} style={{ marginBottom: 4 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: '#bfbfbf',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  padding: '8px 10px 4px',
                }}>
                  {label}
                </div>
                {items.map(({ path: p, icon, label: lbl }) => (
                  <button
                    key={p}
                    onClick={() => navigate(p)}
                    style={sNavBtn(isActive(p))}
                    onMouseEnter={e => !isActive(p) && (e.currentTarget.style.background = '#f0f5ff')}
                    onMouseLeave={e => !isActive(p) && (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 14, display: 'flex' }}>{icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{lbl}</span>
                  </button>
                ))}
              </div>
            ))}

            {/* Pie: cerrar sesión */}
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f5f5f5' }}>
              <button
                onClick={() => { logout(); navigate('/login') }}
                style={{ ...sNavBtn(false), color: '#8c8c8c' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogoutOutlined style={{ fontSize: 14 }} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </Sider>

        {/* ════════ CONTENT ════════ */}
        <Content style={{ padding: '20px 24px', minHeight: 'calc(100vh - 88px)' }}>
          <Outlet />
        </Content>

      </Layout>

      {/* ════════ FOOTER ════════ */}
      <Footer style={{
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: '#8c8c8c' }}>
          Mesa de Ayuda – Oficina de Sistemas &copy; {new Date().getFullYear()}
        </span>
        <span style={{ fontSize: 11, color: '#8c8c8c' }}>
          ¿Problemas urgentes? Llámanos al{' '}
          <strong style={{ color: '#262626' }}>01-4271200</strong>
        </span>
      </Footer>

    </Layout>
  )
}
