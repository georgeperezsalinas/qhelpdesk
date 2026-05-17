import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'

import LayoutPrincipal from './components/common/LayoutPrincipal'
import PortalLayout from './portal/components/PortalLayout'
import LoginPage from './pages/portal/LoginPage'
import DashboardPage from './pages/portal/DashboardPage'
import PerfilPage from './pages/portal/PerfilPage'
import TicketsPage from './modules/tickets/TicketsPage'
import InventarioPage from './modules/inventario/InventarioPage'
import UsuariosPage from './modules/usuarios/UsuariosPage'
import MantenimientoPage from './modules/mantenimiento/MantenimientoPage'
import BackupPage from './modules/backup/BackupPage'
import ComprasPage from './modules/compras/ComprasPage'
import InfraestructuraPage from './modules/infraestructura/InfraestructuraPage'
import TelefoniaPage from './modules/telefonia/TelefoniaPage'
import ReportesPage from './modules/reportes/ReportesPage'
import ConfiguracionPage from './modules/configuracion/ConfiguracionPage'
import ConocimientoPage from './modules/conocimiento/ConocimientoPage'
import PortalInicio from './portal/pages/PortalInicio'
import NuevoTicket from './portal/pages/NuevoTicket'
import MisTickets from './portal/pages/MisTickets'
import BaseConocimiento from './portal/pages/BaseConocimiento'
import { useAuthStore } from './store/authStore'

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

// ─────────────────────────────────────────────────────────────────────
// src/App.jsx — Tema Ant Design actualizado al nuevo sistema visual
//
// Solo se cambia el objeto ERP_THEME. Las rutas y el resto del archivo
// quedan idénticas a tu versión actual.
// ─────────────────────────────────────────────────────────────────────

const ERP_THEME = {
  token: {
    // Color principal (copper)
    colorPrimary: '#B45309',
    colorPrimaryHover: '#C2410C',
    colorPrimaryActive: '#7C2D12',

    // Radios
    borderRadius: 6,
    borderRadiusLG: 10,
    borderRadiusSM: 4,

    // Tipografía
    fontFamily: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13,

    // Fondos
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F4EFE3',    // ivory cálido
    colorBgElevated: '#FFFFFF',

    // Bordes
    colorBorder: '#E2DBC9',
    colorBorderSecondary: '#ECE6D5',

    // Texto
    colorTextBase: '#14110D',
    colorText: '#14110D',
    colorTextSecondary: '#6B665C',
    colorTextTertiary: '#9C968A',
    colorTextQuaternary: '#C6BFAF',

    // Estados
    colorError: '#A8201A',
    colorWarning: '#B45309',
    colorSuccess: '#15633F',
    colorInfo: '#1E3A8A',

    // Sombras
    boxShadow: '0 1px 0 rgba(20,17,13,0.04), 0 1px 2px rgba(20,17,13,0.04)',
    boxShadowSecondary: '0 1px 0 rgba(20,17,13,0.04), 0 8px 24px -8px rgba(20,17,13,0.10)',

    // Línea base
    lineWidth: 1,
    motionDurationMid: '0.18s',
  },
  components: {
    Layout: {
      bodyBg: '#F4EFE3',
      headerBg: '#F4EFE3',
      siderBg: '#18130C',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(180,83,9,0.12)',
      itemSelectedColor: '#7C2D12',
      itemHoverBg: '#EFE9DA',
      itemColor: '#3C3933',
    },
    Card: {
      paddingLG: 18,
      headerBg: 'transparent',
      colorBorderSecondary: '#ECE6D5',
    },
    Table: {
      headerBg: '#F7F2E5',
      headerColor: '#6B665C',
      headerSplitColor: '#ECE6D5',
      rowHoverBg: '#F7F2E5',
      borderColor: '#ECE6D5',
      cellPaddingBlock: 10,
    },
    Button: {
      borderRadius: 6,
      controlHeight: 32,
      fontWeight: 500,
      primaryShadow: 'none',
      defaultBg: '#FFFFFF',
      defaultBorderColor: '#E2DBC9',
    },
    Input: {
      borderRadius: 6,
      activeBorderColor: '#14110D',
      hoverBorderColor: '#9C968A',
      activeShadow: '0 0 0 3px rgba(180,83,9,0.12)',
    },
    Select: {
      borderRadius: 6,
      optionSelectedBg: 'rgba(180,83,9,0.10)',
    },
    Badge: { fontSize: 10 },
    Tag: {
      borderRadius: 4,
      defaultBg: '#EFE9DA',
      defaultColor: '#3C3933',
    },
    Tabs: {
      itemColor: '#6B665C',
      itemSelectedColor: '#14110D',
      inkBarColor: '#B45309',
    },
    Drawer: { colorBgElevated: '#FAF6EC' },
    Modal: { colorBgElevated: '#FAF6EC' },
    Tooltip: { colorBgSpotlight: '#14110D' },
    Form: {
      labelColor: '#3C3933',
      labelFontSize: 12,
    },
    Statistic: {
      contentFontSize: 22,
      titleFontSize: 11,
    },
    Progress: {
      defaultColor: '#B45309',
    },
    Switch: {
      colorPrimary: '#14110D',
    },
    Spin: {
      colorPrimary: '#B45309',
    },
  },
}

// El resto de tu App.jsx queda igual.
// Solo reemplaza el objeto ERP_THEME con éste.



export default function App() {
  return (
    <ConfigProvider locale={esES} theme={ERP_THEME}>
      <Routes>
        <Route index element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/portal" element={<ProtectedPortal><PortalLayout /></ProtectedPortal>}>
          <Route index element={<PortalInicio />} />
          <Route path="nuevo-ticket" element={<NuevoTicket />} />
          <Route path="mis-tickets" element={<MisTickets />} />
          <Route path="kb" element={<BaseConocimiento />} />
        </Route>

        <Route path="/" element={<ProtectedInterno><LayoutPrincipal /></ProtectedInterno>}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tickets/*" element={<TicketsPage />} />
          <Route path="inventario/*" element={<InventarioPage />} />
          <Route path="usuarios/*" element={<UsuariosPage />} />
          <Route path="mantenimiento/*" element={<MantenimientoPage />} />
          <Route path="backup/*" element={<BackupPage />} />
          <Route path="compras/*" element={<ComprasPage />} />
          <Route path="infraestructura/*" element={<InfraestructuraPage />} />
          <Route path="telefonia/*" element={<TelefoniaPage />} />
          <Route path="conocimiento" element={<ConocimientoPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </ConfigProvider>
  )
}
