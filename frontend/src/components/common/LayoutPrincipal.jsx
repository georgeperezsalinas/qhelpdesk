// ─────────────────────────────────────────────────────────────────────
// src/components/common/LayoutPrincipal.jsx
// Rediseño v2 — Layout principal (sidebar + topbar)
// Drop-in replacement: mantiene toda la lógica de auth, permisos,
// notificaciones, configuración remota, breakpoints y mobile drawer.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Layout, Avatar, Dropdown, Tooltip, Input, Drawer as AntDrawer } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  SearchOutlined, QuestionCircleOutlined,
  LogoutOutlined, UserOutlined, GlobalOutlined,
  DownOutlined, MenuOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'
import { useNotifications } from '../../hooks/useNotifications'
import NotificacionesBell from './NotificacionesBell'
import { configuracionService } from '../../services/configuracionService'
import './LayoutPrincipal.css'

const { Content } = Layout

const BP_MOBILE = 768
const BP_TABLET = 1024

const PERMISOS = {
  jefe: ['operaciones', 'activos', 'infraestructura', 'administracion', 'inteligencia', 'configuracion'],
  especialista: ['operaciones', 'activos', 'infraestructura', 'administracion', 'inteligencia'],
  mesa_ayuda: ['operaciones', 'activos', 'infraestructura'],
  alta_direccion: ['operaciones', 'inteligencia'],
  usuario_final: [],
  usuario_externo: [],
}

// ── Iconos line minimalistas ──────────────────────────────────────────
const Ic = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const I = {
  dash: <Ic><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></Ic>,
  ticket: <Ic><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" /><path d="M13 6v2M13 11v2M13 16v2" /></Ic>,
  users: <Ic><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 10a3 3 0 0 0 0-6" /><path d="M21.5 20a5.5 5.5 0 0 0-4.5-5.4" /></Ic>,
  inv: <Ic><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 12l9 4 9-4" /><path d="M3 17l9 4 9-4" /></Ic>,
  wrench: <Ic><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.7-.7-.7-2.7z" /></Ic>,
  server: <Ic><rect x="3" y="3" width="18" height="7" rx="1.5" /><rect x="3" y="14" width="18" height="7" rx="1.5" /><path d="M7 6.5h.01M7 17.5h.01" /></Ic>,
  cloud: <Ic><path d="M17 18a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 6 18z" /></Ic>,
  cart: <Ic><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /><path d="M3 4h2l2.5 11h11l2-7H6" /></Ic>,
  phone: <Ic><path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" /></Ic>,
  chart: <Ic><path d="M3 21h18" /><path d="M7 17v-6" /><path d="M12 17V7" /><path d="M17 17v-9" /></Ic>,
  user: <Ic><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Ic>,
  set: <Ic><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.7-1.6L13 2h-2l-.7 2.8a7 7 0 0 0-2.8 1.6l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .6.1 1.1.2 1.6l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.7 1.6L11 22h2l.7-2.8a7 7 0 0 0 2.8-1.6l2.3.9 2-3.4-2-1.5c.1-.5.2-1 .2-1.6z" /></Ic>,
  chev: <Ic><path d="m9 6 6 6-6 6" /></Ic>,
  book: <Ic><path d="M4 4h11a3 3 0 0 1 3 3v13l-3-2H7a3 3 0 0 1-3-3z" /><path d="M8 7h7M8 11h7M8 15h4" /></Ic>,

}

const MENU_GRUPOS = [
  {
    key: 'operaciones', label: 'Operaciones', items: [
      { key: '/dashboard', icon: I.dash, label: 'Dashboard' },
      { key: '/tickets', icon: I.ticket, label: 'Tickets' },
      { key: '/usuarios', icon: I.users, label: 'Usuarios' },
    ]
  },
  {
    key: 'activos', label: 'Activos TI', items: [
      { key: '/inventario', icon: I.inv, label: 'Inventario' },
      { key: '/mantenimiento', icon: I.wrench, label: 'Mantenimiento' },
    ]
  },
  {
    key: 'infraestructura', label: 'Infraestructura', items: [
      { key: '/infraestructura', icon: I.server, label: 'Servidores y Red' },
      { key: '/backup', icon: I.cloud, label: 'Backup' },
    ]
  },
  {
    key: 'administracion', label: 'Administración', items: [
      { key: '/compras', icon: I.cart, label: 'Compras TI' },
      { key: '/telefonia', icon: I.phone, label: 'Telefonía' },
    ]
  },
  {
    key: 'inteligencia', label: 'Inteligencia', items: [
      { key: '/reportes', icon: I.chart, label: 'Reportes' },
      { key: '/conocimiento', icon: I.book, label: 'Base de conocimiento' },
    ]
  },
  {
    key: 'configuracion', label: 'Configuración', items: [
      { key: '/perfil', icon: I.user, label: 'Mi perfil' },
      { key: '/configuracion', icon: I.set, label: 'Config. aplicación' },
    ]
  },
]

const ROL_LABELS = {
  jefe: 'Jefe de área', especialista: 'Especialista', mesa_ayuda: 'Mesa de ayuda',
  alta_direccion: 'Alta Dirección', usuario_final: 'Usuario', usuario_externo: 'Externo',
}
const ROL_COLORS = {
  jefe: '#7C2D12', especialista: '#0E5460', mesa_ayuda: '#6B21A8',
  alta_direccion: '#A8201A', usuario_final: '#3C3933', usuario_externo: '#9A4708',
}

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

// ── Sidebar reutilizable ──────────────────────────────────────────────
function SidebarContent({ collapsed, onNavigate, selectedKey, usuario, onCollapse, isMobile, logoUrl, appName }) {
  const permisos = PERMISOS[usuario?.rol] || []
  const gruposFiltrados = MENU_GRUPOS.filter(g => permisos.includes(g.key))
  const nombreApp = appName || 'QHelpDesk'
  const isCompact = collapsed && !isMobile

  return (
    <div className="qsb-root">

      {/* Brand */}
      <div className={`qsb-brand ${isCompact ? 'is-compact' : ''}`}>
        {logoUrl ? (
          <div className="qsb-logo-img">
            <img src={logoUrl} alt="logo" />
          </div>
        ) : (
          <div className="qsb-mono">{nombreApp.charAt(0).toUpperCase()}</div>
        )}
        {!isCompact && (
          <div className="qsb-brand-text">
            <div className="qsb-wordmark">{nombreApp}</div>
            <div className="qsb-sublabel">Gov · Tech · Pro</div>
          </div>
        )}
      </div>

      {!isCompact && (
        <div className="qsb-sede">
          <span className="qsb-dot" />
          {usuario?.sede?.nombre || 'Oficina de Sistemas'}
        </div>
      )}

      {/* Nav */}
      <nav className="qsb-nav">
        {gruposFiltrados.map(grupo => (
          <div key={grupo.key}>
            {!isCompact && <div className="qsb-group-label">{grupo.label}</div>}
            {grupo.items.map(item => {
              const isActive = selectedKey === item.key
              return (
                <Tooltip key={item.key} title={isCompact ? item.label : ''} placement="right">
                  <div
                    className={`qsb-item ${isActive ? 'is-active' : ''} ${isCompact ? 'is-compact' : ''}`}
                    onClick={() => onNavigate(item.key)}
                  >
                    <span className="qsb-icon">{item.icon}</span>
                    {!isCompact && <span className="qsb-label">{item.label}</span>}
                  </div>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Foot */}
      <div className={`qsb-foot ${isCompact ? 'is-compact' : ''}`}>
        {!isMobile && (
          <div className="qsb-collapse" onClick={onCollapse}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        )}
        <div className="qsb-user">
          <Avatar size={28} src={usuario?.foto_url || undefined} style={{
            background: ROL_COLORS[usuario?.rol] || '#7C2D12',
            fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </Avatar>
          {!isCompact && (
            <div className="qsb-user-text">
              <div className="qsb-user-name">{usuario?.nombre} {usuario?.apellido}</div>
              <div className="qsb-user-role">{ROL_LABELS[usuario?.rol]}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Layout principal ──────────────────────────────────────────────────
export default function LayoutPrincipal() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { usuario, logout } = useAuthStore()
  const width = useWindowWidth()
  const selectedKey = '/' + pathname.split('/')[1]

  const isMobile = width < BP_MOBILE
  const isTablet = width >= BP_MOBILE && width < BP_TABLET

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [appName, setAppName] = useState(null)

  useEffect(() => {
    configuracionService.obtener()
      .then(({ data }) => {
        setLogoUrl(data.logo_url || null)
        setAppName(data.app_name || null)
        if (data.app_name) document.title = data.app_name
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.logo_url !== undefined) setLogoUrl(e.detail.logo_url || null)
      if (e.detail?.app_name) { setAppName(e.detail.app_name); document.title = e.detail.app_name }
    }
    window.addEventListener('configuracion-updated', handler)
    return () => window.removeEventListener('configuracion-updated', handler)
  }, [])

  useEffect(() => {
    if (isTablet) setCollapsed(true)
    if (!isTablet && !isMobile) setCollapsed(false)
  }, [isTablet, isMobile])

  const handleNavigate = (key) => {
    navigate(key)
    if (isMobile) setDrawerOpen(false)
  }

  const { notificaciones, noLeidas, conectado, marcarLeida, marcarTodasLeidas } =
    useNotifications()

  const currentItem = MENU_GRUPOS.flatMap(g => g.items).find(i => i.key === selectedKey)
  const currentGroup = MENU_GRUPOS.find(g => g.items.some(i => i.key === selectedKey))

  const sidebarW = collapsed ? 60 : 232
  const mainMargin = isMobile ? 0 : sidebarW

  const userMenuItems = {
    items: [
      {
        key: 'info', disabled: true, label: (
          <div style={{ padding: '4px 0', cursor: 'default' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{usuario?.nombre} {usuario?.apellido}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{usuario?.email}</div>
          </div>
        )
      },
      { type: 'divider' },
      { key: 'perfil', icon: <UserOutlined />, label: 'Mi perfil' },
      { key: 'portal', icon: <GlobalOutlined />, label: 'Portal de usuarios' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') { logout(); navigate('/login') }
      if (key === 'perfil') navigate('/perfil')
      if (key === 'portal') navigate('/portal')
    },
  }

  return (
    <div className="qapp" style={{ minHeight: '100vh' }}>

      {/* SIDEBAR (desktop + tablet) */}
      {!isMobile && (
        <aside className="qsb" style={{ width: sidebarW, minWidth: sidebarW, maxWidth: sidebarW }}>
          <SidebarContent
            collapsed={collapsed} onNavigate={handleNavigate}
            selectedKey={selectedKey} usuario={usuario}
            onCollapse={() => setCollapsed(!collapsed)}
            isMobile={false} logoUrl={logoUrl} appName={appName}
          />
        </aside>
      )}

      {/* DRAWER (mobile) */}
      {isMobile && (
        <AntDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={240}
          styles={{
            body: { padding: 0, background: 'var(--sb-bg)', height: '100%' },
            header: { display: 'none' },
            mask: { background: 'rgba(20,17,13,0.5)' },
          }}
          closeIcon={null}
        >
          <SidebarContent
            collapsed={false} onNavigate={handleNavigate}
            selectedKey={selectedKey} usuario={usuario}
            onCollapse={() => setDrawerOpen(false)}
            isMobile={true} logoUrl={logoUrl} appName={appName}
          />
        </AntDrawer>
      )}

      {/* MAIN */}
      <div className="qmain" style={{ marginLeft: mainMargin }}>

        {/* TOPBAR */}
        <div className="qtb">
          {isMobile && (
            <div className="qtb-hamb" onClick={() => setDrawerOpen(true)}>
              <MenuOutlined />
            </div>
          )}

          <div className="qtb-crumbs">
            {currentGroup && !isMobile && (
              <>
                <span>{currentGroup.label}</span>
                <span className="qtb-sep">{I.chev}</span>
              </>
            )}
            <em>{currentItem?.label || 'Dashboard'}</em>
          </div>

          {width > 480 && (
            <div className="qtb-search">
              <SearchOutlined />
              <input placeholder={isMobile ? 'Buscar…' : 'Buscar tickets, equipos, usuarios…'} />
              {!isMobile && <span className="qtb-kbd">⌘ K</span>}
            </div>
          )}

          <div className="qtb-right">
            {width > 600 && (
              <div className="qtb-ico" title="Ayuda"><QuestionCircleOutlined /></div>
            )}
            <NotificacionesBell
              notificaciones={notificaciones}
              noLeidas={noLeidas}
              conectado={conectado}
              marcarLeida={marcarLeida}
              marcarTodasLeidas={marcarTodasLeidas}
            />
            {width > 600 && <div className="qtb-divider" />}

            <Dropdown menu={userMenuItems} placement="bottomRight" trigger={['click']}>
              <div className="qtb-user">
                <Avatar size={26} src={usuario?.foto_url || undefined} style={{
                  background: ROL_COLORS[usuario?.rol] || '#7C2D12',
                  fontSize: 10, fontWeight: 600,
                }}>
                  {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                </Avatar>
                {width > 600 && (
                  <>
                    <div className="qtb-user-text">
                      <div className="qtb-user-name">
                        {usuario?.nombre?.split(' ')[0]} {usuario?.apellido?.split(' ')[0]}
                      </div>
                      <div className="qtb-user-role">{ROL_LABELS[usuario?.rol]}</div>
                    </div>
                  </>
                )}
                <DownOutlined style={{ fontSize: 9, color: 'var(--ink-4)' }} />
              </div>
            </Dropdown>
          </div>
        </div>

        {/* CONTENT */}
        <div className="qcontent">
          <Content style={{ minHeight: 'calc(100vh - 56px)' }}>
            <Outlet />
          </Content>
        </div>
      </div>
    </div>
  )
}
