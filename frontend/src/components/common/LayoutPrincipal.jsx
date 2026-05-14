import { useState, useEffect, useRef } from 'react'
import { Layout, Avatar, Dropdown, Tooltip, Input, Drawer as AntDrawer } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  SearchOutlined, QuestionCircleOutlined,
  LogoutOutlined, UserOutlined, GlobalOutlined,
  DownOutlined, MenuOutlined, LeftOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useAuthStore }     from '../../store/authStore'
import { useNotifications } from '../../hooks/useNotifications'
import NotificacionesBell   from './NotificacionesBell'

const { Content } = Layout

/* ── BREAKPOINTS ─────────────────────────────────────────────────────────── */
const BP_MOBILE  = 768   // < 768px → drawer overlay
const BP_TABLET  = 1024  // 768–1024 → sidebar colapsado (solo iconos)

/* ── PERMISOS POR ROL ────────────────────────────────────────────────────── */
const PERMISOS = {
  jefe:            ['operaciones','activos','infraestructura','administracion','inteligencia','configuracion'],
  especialista:    ['operaciones','activos','infraestructura','administracion','inteligencia'],
  mesa_ayuda:      ['operaciones','activos','infraestructura'],
  alta_direccion:  ['operaciones','inteligencia'],
  usuario_final:   [],
  usuario_externo: [],
}

const MENU_GRUPOS = [
  {
    key: 'operaciones', label: 'Operaciones',
    items: [
      { key: '/dashboard',  icon: '🗂️', label: 'Dashboard'       },
      { key: '/tickets',    icon: '🎫', label: 'Tickets'          },
      { key: '/usuarios',   icon: '👥', label: 'Usuarios'         },
    ],
  },
  {
    key: 'activos', label: 'Activos TI',
    items: [
      { key: '/inventario',    icon: '💻', label: 'Inventario'    },
      { key: '/mantenimiento', icon: '🔧', label: 'Mantenimiento' },
    ],
  },
  {
    key: 'infraestructura', label: 'Infraestructura',
    items: [
      { key: '/infraestructura', icon: '🖥️', label: 'Servidores y Red' },
      { key: '/backup',          icon: '☁️', label: 'Backup'           },
    ],
  },
  {
    key: 'administracion', label: 'Administración',
    items: [
      { key: '/compras',   icon: '🛒', label: 'Compras TI' },
      { key: '/telefonia', icon: '📞', label: 'Telefonía'  },
    ],
  },
  {
    key: 'inteligencia', label: 'Inteligencia',
    items: [
      { key: '/reportes', icon: '📊', label: 'Reportes' },
    ],
  },
  {
    key: 'configuracion', label: 'Configuración',
    items: [
      { key: '/perfil', icon: '⚙️', label: 'Mi perfil' },
    ],
  },
]

const ROL_LABELS = {
  jefe:            'Jefe de área',
  especialista:    'Especialista',
  mesa_ayuda:      'Mesa de ayuda',
  alta_direccion:  'Alta Dirección',
  usuario_final:   'Usuario',
  usuario_externo: 'Externo',
}
const ROL_COLORS = {
  jefe: '#1d4ed8', especialista: '#0e7490', mesa_ayuda: '#7e22ce',
  alta_direccion: '#b91c1c', usuario_final: '#475569', usuario_externo: '#92400e',
}

/* ── HOOK: tamaño de ventana ─────────────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

/* ── SIDEBAR CONTENT (reutilizado en fijo + drawer) ─────────────────────── */
function SidebarContent({ collapsed, onNavigate, selectedKey, usuario, onCollapse, isMobile }) {
  const permisos = PERMISOS[usuario?.rol] || []
  const gruposFiltrados = MENU_GRUPOS.filter(g => permisos.includes(g.key))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Brand */}
      <div style={{
        padding: collapsed && !isMobile ? '14px 10px' : '14px 16px 10px',
        borderBottom: '1px solid var(--erp-sidebar-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: (!collapsed || isMobile) ? 8 : 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: 'rgba(255,255,255,0.4)',
            textAlign: 'center', lineHeight: 1.2,
          }}>
            {collapsed && !isMobile ? 'Q' : 'LOGO'}
          </div>
          {(!collapsed || isMobile) && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>QHELP DESK</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>GOV TECH PRO</div>
            </div>
          )}
        </div>
        {(!collapsed || isMobile) && (
          <div style={{
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 4, padding: '3px 8px',
            fontSize: 10, color: 'rgba(147,197,253,0.9)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {usuario?.sede?.nombre || 'Oficina de Sistemas'}
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {gruposFiltrados.map(grupo => (
          <div key={grupo.key} style={{ marginBottom: 4 }}>
            {(!collapsed || isMobile) && (
              <div style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
                color: 'var(--erp-sidebar-label)',
                padding: '10px 16px 3px',
                textTransform: 'uppercase',
              }}>
                {grupo.label}
              </div>
            )}
            {grupo.items.map(item => {
              const isActive = selectedKey === item.key
              return (
                <Tooltip
                  key={item.key}
                  title={collapsed && !isMobile ? item.label : ''}
                  placement="right"
                >
                  <div
                    onClick={() => onNavigate(item.key)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      gap: 10,
                      padding: collapsed && !isMobile ? '9px 0' : '8px 16px',
                      justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                      fontSize: 13,
                      color: isActive ? 'var(--erp-sidebar-text-act)' : 'var(--erp-sidebar-text)',
                      background: isActive ? 'var(--erp-sidebar-active)' : 'transparent',
                      borderRight: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--erp-sidebar-text)' }
                    }}
                  >
                    <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                    {(!collapsed || isMobile) && (
                      <span style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer usuario */}
      <div style={{
        padding: collapsed && !isMobile ? '10px 8px' : '10px 12px',
        borderTop: '1px solid var(--erp-sidebar-border)',
        flexShrink: 0,
      }}>
        {!isMobile && (
          <div
            onClick={onCollapse}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-end',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer', marginBottom: 8, fontSize: 14,
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        )}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 8, padding: '6px 8px', borderRadius: 8,
        }}>
          <Avatar size={28} style={{
            background: ROL_COLORS[usuario?.rol] || '#1d4ed8',
            fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </Avatar>
          {(!collapsed || isMobile) && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.nombre} {usuario?.apellido}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>
                {ROL_LABELS[usuario?.rol]}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── LAYOUT PRINCIPAL ────────────────────────────────────────────────────── */
export default function LayoutPrincipal() {
  const navigate    = useNavigate()
  const { pathname } = useLocation()
  const { usuario, logout } = useAuthStore()
  const width       = useWindowWidth()
  const selectedKey = '/' + pathname.split('/')[1]

  const isMobile  = width < BP_MOBILE
  const isTablet  = width >= BP_MOBILE && width < BP_TABLET

  // Desktop: colapsado por defecto en tablet
  const [collapsed,    setCollapsed]    = useState(false)
  // Mobile: drawer abierto/cerrado
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  // Al cambiar tamaño, auto-colapsar en tablet
  useEffect(() => {
    if (isTablet) setCollapsed(true)
    if (!isTablet && !isMobile) setCollapsed(false)
  }, [isTablet, isMobile])

  // Cerrar drawer al navegar en mobile
  const handleNavigate = (key) => {
    navigate(key)
    if (isMobile) setDrawerOpen(false)
  }

  const { notificaciones, noLeidas, conectado, marcarLeida, marcarTodasLeidas } =
    useNotifications()

  const currentItem  = MENU_GRUPOS.flatMap(g => g.items).find(i => i.key === selectedKey)
  const currentGroup = MENU_GRUPOS.find(g => g.items.some(i => i.key === selectedKey))

  const sidebarW   = collapsed ? 58 : 228
  const mainMargin = isMobile ? 0 : sidebarW

  const userMenuItems = {
    items: [
      {
        key: 'info', disabled: true,
        label: (
          <div style={{ padding: '4px 0', cursor: 'default' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{usuario?.nombre} {usuario?.apellido}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{usuario?.email}</div>
          </div>
        ),
      },
      { type: 'divider' },
      { key: 'perfil',  icon: <UserOutlined />,   label: 'Mi perfil'          },
      { key: 'portal',  icon: <GlobalOutlined />, label: 'Portal de usuarios' },
      { type: 'divider' },
      { key: 'logout',  icon: <LogoutOutlined />, label: 'Cerrar sesión', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') { logout(); navigate('/login') }
      if (key === 'perfil') navigate('/perfil')
      if (key === 'portal') navigate('/portal')
    },
  }

  const sidebarStyle = {
    background:  'var(--erp-sidebar-bg)',
    width:       sidebarW,
    minWidth:    sidebarW,
    maxWidth:    sidebarW,
    position:    'fixed',
    left:        0, top: 0,
    height:      '100vh',
    transition:  'width 0.2s, min-width 0.2s, max-width 0.2s',
    zIndex:      200,
    overflow:    'hidden',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>

      {/* ── SIDEBAR FIJO (tablet + desktop) ───────────────────────────── */}
      {!isMobile && (
        <div style={sidebarStyle}>
          <SidebarContent
            collapsed={collapsed}
            onNavigate={handleNavigate}
            selectedKey={selectedKey}
            usuario={usuario}
            onCollapse={() => setCollapsed(!collapsed)}
            isMobile={false}
          />
        </div>
      )}

      {/* ── DRAWER OVERLAY (mobile) ────────────────────────────────────── */}
      {isMobile && (
        <AntDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={240}
          styles={{
            body:   { padding: 0, background: 'var(--erp-sidebar-bg)', height: '100%' },
            header: { display: 'none' },
            mask:   { background: 'rgba(0,0,0,0.5)' },
          }}
          closeIcon={null}
        >
          <SidebarContent
            collapsed={false}
            onNavigate={handleNavigate}
            selectedKey={selectedKey}
            usuario={usuario}
            onCollapse={() => setDrawerOpen(false)}
            isMobile={true}
          />
        </AntDrawer>
      )}

      {/* ── MAIN ──────────────────────────────────────────────────────── */}
      <div style={{
        marginLeft:  mainMargin,
        transition:  'margin-left 0.2s',
        minHeight:   '100vh',
        display:     'flex',
        flexDirection: 'column',
      }}>

        {/* TOPBAR */}
        <div style={{
          height:     52,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display:    'flex',
          alignItems: 'center',
          padding:    '0 16px',
          gap:        12,
          position:   'sticky', top: 0, zIndex: 100,
          boxShadow:  '0 1px 3px rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}>

          {/* Hamburger en mobile */}
          {isMobile && (
            <div
              onClick={() => setDrawerOpen(true)}
              style={{
                width: 36, height: 36, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, cursor: 'pointer',
                border: '1px solid #e2e8f0',
                flexShrink: 0,
              }}
            >
              <MenuOutlined style={{ fontSize: 16, color: '#475569' }} />
            </div>
          )}

          {/* Breadcrumb */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: '#64748b',
            whiteSpace: 'nowrap', overflow: 'hidden',
            flexShrink: 0,
          }}>
            {currentGroup && !isMobile && (
              <>
                <span>{currentGroup.label}</span>
                <span style={{ color: '#cbd5e1' }}>›</span>
              </>
            )}
            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
              {currentItem?.label || 'Dashboard'}
            </span>
          </div>

          {/* Buscador — se oculta en mobile muy pequeño */}
          {width > 480 && (
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 13 }} />}
              placeholder={isMobile ? 'Buscar...' : 'Buscar tickets, equipos, usuarios...'}
              size="small"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                fontSize: 12,
                maxWidth: isMobile ? 160 : 300,
                flex: 1,
              }}
            />
          )}

          {/* Acciones derecha */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: width > 600 ? 12 : 8 }}>
            {width > 600 && (
              <QuestionCircleOutlined style={{ fontSize: 17, color: '#94a3b8', cursor: 'pointer' }} />
            )}

            <NotificacionesBell
              notificaciones={notificaciones}
              noLeidas={noLeidas}
              conectado={conectado}
              marcarLeida={marcarLeida}
              marcarTodasLeidas={marcarTodasLeidas}
            />

            {width > 600 && (
              <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
            )}

            <Dropdown menu={userMenuItems} placement="bottomRight" trigger={['click']}>
              <div style={{
                display:    'flex', alignItems: 'center', gap: 6,
                padding:    isMobile ? '4px 6px 4px 4px' : '4px 10px 4px 4px',
                border:     '1px solid #e2e8f0',
                borderRadius: 24, cursor: 'pointer',
                background: '#f8fafc',
              }}>
                <Avatar size={24} style={{
                  background: ROL_COLORS[usuario?.rol] || '#1d4ed8',
                  fontSize: 10, fontWeight: 600,
                }}>
                  {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                </Avatar>
                {width > 600 && (
                  <>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {usuario?.nombre?.split(' ')[0]} {usuario?.apellido?.split(' ')[0]}
                    </span>
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 10,
                      background: `${ROL_COLORS[usuario?.rol]}18`,
                      color: ROL_COLORS[usuario?.rol], fontWeight: 500,
                    }}>
                      {ROL_LABELS[usuario?.rol]}
                    </span>
                  </>
                )}
                <DownOutlined style={{ fontSize: 9, color: '#94a3b8' }} />
              </div>
            </Dropdown>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{
          padding:    isMobile ? '12px' : '16px 20px',
          flex:       1,
          minWidth:   0,
        }}>
          <Content style={{ minHeight: 'calc(100vh - 52px)' }}>
            <Outlet />
          </Content>
        </div>
      </div>
    </div>
  )
}
