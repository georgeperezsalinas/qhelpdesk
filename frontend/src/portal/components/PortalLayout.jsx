import { Layout, Typography, Space, Avatar, Dropdown, Button, Tag } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  LogoutOutlined, UserOutlined, FileTextOutlined,
  PlusCircleOutlined, HomeOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'

const { Header, Content, Footer } = Layout
const { Text } = Typography

const ROL_LABELS = {
  usuario_final:   'Usuario',
  usuario_externo: 'Usuario externo',
  alta_direccion:  'Alta Dirección',
  jefe:            'Jefe de área',
  especialista:    'Especialista',
  mesa_ayuda:      'Mesa de ayuda',
}

export default function PortalLayout() {
  const navigate = useNavigate()
  const { usuario, logout } = useAuthStore()

  const menuUsuario = {
    items: [
      { key: 'mis-tickets', icon: <FileTextOutlined />, label: 'Mis tickets' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout')     { logout(); navigate('/login') }
      if (key === 'mis-tickets') navigate('/portal/mis-tickets')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f5ff' }}>
      {/* HEADER */}
      <Header style={{
        background: '#1677ff', padding: '0 32px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Space
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/portal')}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileTextOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              Mesa de Ayuda
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
              Portal de usuarios
            </div>
          </div>
        </Space>

        <Space size={16}>
          <Button
            type="text"
            icon={<HomeOutlined />}
            style={{ color: '#fff' }}
            onClick={() => navigate('/portal')}
          >
            Inicio
          </Button>
          <Button
            type="text"
            icon={<FileTextOutlined />}
            style={{ color: '#fff' }}
            onClick={() => navigate('/portal/mis-tickets')}
          >
            Mis tickets
          </Button>
          <Button
            icon={<PlusCircleOutlined />}
            style={{ background: '#fff', color: '#1677ff', border: 'none', fontWeight: 600 }}
            onClick={() => navigate('/portal/nuevo-ticket')}
          >
            Nuevo ticket
          </Button>

          <Dropdown menu={menuUsuario} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                size={34}
                style={{ background: 'rgba(255,255,255,0.3)', color: '#fff', fontWeight: 600 }}
              >
                {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
              </Avatar>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                  {usuario?.nombre} {usuario?.apellido}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                  {ROL_LABELS[usuario?.rol] || usuario?.rol}
                </div>
              </div>
            </Space>
          </Dropdown>
        </Space>
      </Header>

      {/* CONTENT */}
      <Content style={{ maxWidth: 900, margin: '32px auto', padding: '0 24px', width: '100%' }}>
        <Outlet />
      </Content>

      {/* FOOTER */}
      <Footer style={{ textAlign: 'center', background: 'transparent', color: '#888', fontSize: 12 }}>
        Mesa de Ayuda – Oficina de Sistemas &copy; {new Date().getFullYear()}
        <br />
        ¿Problemas urgentes? Llámanos al <strong>01-4271200</strong>
      </Footer>
    </Layout>
  )
}
