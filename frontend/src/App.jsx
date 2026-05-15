import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'

import LayoutPrincipal     from './components/common/LayoutPrincipal'
import PortalLayout        from './portal/components/PortalLayout'
import LoginPage           from './pages/portal/LoginPage'
import DashboardPage       from './pages/portal/DashboardPage'
import PerfilPage          from './pages/portal/PerfilPage'
import TicketsPage         from './modules/tickets/TicketsPage'
import InventarioPage      from './modules/inventario/InventarioPage'
import UsuariosPage        from './modules/usuarios/UsuariosPage'
import MantenimientoPage   from './modules/mantenimiento/MantenimientoPage'
import BackupPage          from './modules/backup/BackupPage'
import ComprasPage         from './modules/compras/ComprasPage'
import InfraestructuraPage from './modules/infraestructura/InfraestructuraPage'
import TelefoniaPage       from './modules/telefonia/TelefoniaPage'
import ReportesPage        from './modules/reportes/ReportesPage'
import ConfiguracionPage   from './modules/configuracion/ConfiguracionPage'
import PortalInicio        from './portal/pages/PortalInicio'
import NuevoTicket         from './portal/pages/NuevoTicket'
import MisTickets          from './portal/pages/MisTickets'
import BaseConocimiento    from './portal/pages/BaseConocimiento'
import { useAuthStore }    from './store/authStore'

const ROLES_INTERNOS = ['jefe', 'especialista', 'mesa_ayuda']

function RootRedirect() {
  const { accessToken, usuario } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  return ROLES_INTERNOS.includes(usuario?.rol)
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/portal" replace />
}

function ProtectedInterno({ children }) {
  const { accessToken, usuario } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  if (!ROLES_INTERNOS.includes(usuario?.rol)) return <Navigate to="/portal" replace />
  return children
}

function ProtectedPortal({ children }) {
  const { accessToken } = useAuthStore()
  return accessToken ? children : <Navigate to="/login" replace />
}

const ERP_THEME = {
  token: {
    colorPrimary:        '#1d4ed8',
    colorPrimaryHover:   '#1e40af',
    colorPrimaryActive:  '#1e3a8a',
    borderRadius:        6,
    borderRadiusLG:      8,
    borderRadiusSM:      4,
    fontFamily:          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize:            13,
    colorBgContainer:    '#ffffff',
    colorBgLayout:       '#f1f5f9',
    colorBorder:         '#e2e8f0',
    colorBorderSecondary:'#f1f5f9',
    colorTextBase:       '#0f172a',
    colorTextSecondary:  '#64748b',
    boxShadow:           '0 1px 3px rgba(0,0,0,0.06)',
    boxShadowSecondary:  '0 4px 12px rgba(0,0,0,0.08)',
  },
  components: {
    Layout:  { bodyBg: '#f1f5f9', headerBg: '#ffffff' },
    Menu:    { itemBg: 'transparent', itemSelectedBg: 'rgba(59,130,246,0.08)', itemSelectedColor: '#1d4ed8' },
    Card:    { paddingLG: 16 },
    Table:   { headerBg: '#f8fafc', rowHoverBg: '#f0f9ff', borderColor: '#e2e8f0' },
    Button:  { borderRadius: 6 },
    Input:   { borderRadius: 6 },
    Select:  { borderRadius: 6 },
    Badge:   { fontSize: 10 },
    Tag:     { borderRadius: 4 },
    Tabs:    { itemColor: '#64748b', itemSelectedColor: '#1d4ed8' },
    Drawer:  { colorBgElevated: '#ffffff' },
  },
}

export default function App() {
  return (
    <ConfigProvider locale={esES} theme={ERP_THEME}>
      <Routes>
        <Route index element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/portal" element={<ProtectedPortal><PortalLayout /></ProtectedPortal>}>
          <Route index               element={<PortalInicio />} />
          <Route path="nuevo-ticket" element={<NuevoTicket />} />
          <Route path="mis-tickets"  element={<MisTickets />} />
          <Route path="kb"           element={<BaseConocimiento />} />
        </Route>

        <Route path="/" element={<ProtectedInterno><LayoutPrincipal /></ProtectedInterno>}>
          <Route path="dashboard"          element={<DashboardPage />} />
          <Route path="tickets/*"          element={<TicketsPage />} />
          <Route path="inventario/*"       element={<InventarioPage />} />
          <Route path="usuarios/*"         element={<UsuariosPage />} />
          <Route path="mantenimiento/*"    element={<MantenimientoPage />} />
          <Route path="backup/*"           element={<BackupPage />} />
          <Route path="compras/*"          element={<ComprasPage />} />
          <Route path="infraestructura/*"  element={<InfraestructuraPage />} />
          <Route path="telefonia/*"        element={<TelefoniaPage />} />
          <Route path="reportes"           element={<ReportesPage />} />
          <Route path="perfil"             element={<PerfilPage />} />
          <Route path="configuracion"      element={<ConfiguracionPage />} />
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </ConfigProvider>
  )
}
