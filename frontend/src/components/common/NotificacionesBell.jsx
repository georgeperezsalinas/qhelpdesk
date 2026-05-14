import { Badge, Popover, List, Typography, Button, Space, Tag, Empty } from 'antd'
import { BellOutlined, CheckOutlined, WifiOutlined, DisconnectOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

const { Text } = Typography

const TIPO_ICONOS = {
  ticket_nuevo:         '🎫',
  ticket_asignado:      '👤',
  ticket_actualizado:   '💬',
  ticket_resuelto:      '✅',
  sla_por_vencer:       '⚠️',
  sla_vencido:          '❌',
  licencia_por_vencer:  '📋',
  mantenimiento_prog:   '🔧',
  backup_fallido:       '💾',
  contrato_por_vencer:  '📄',
  sistema:              '🔔',
}

export default function NotificacionesBell({ notificaciones, noLeidas, conectado, marcarLeida, marcarTodasLeidas }) {
  const navigate = useNavigate()

  const handleClick = (notif) => {
    if (!notif.leida) marcarLeida(notif.id)
    if (notif.url) navigate(notif.url)
  }

  const contenido = (
    <div style={{ width: 360 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px solid #f0f0f0',
      }}>
        <Space>
          <Text strong>Notificaciones</Text>
          {conectado
            ? <Tag color="green" icon={<WifiOutlined />} style={{ fontSize: 10 }}>En línea</Tag>
            : <Tag color="red"   icon={<DisconnectOutlined />} style={{ fontSize: 10 }}>Reconectando...</Tag>
          }
        </Space>
        {noLeidas > 0 && (
          <Button size="small" type="text" icon={<CheckOutlined />}
            onClick={marcarTodasLeidas} style={{ fontSize: 12 }}>
            Marcar todas leídas
          </Button>
        )}
      </div>

      {/* Lista */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {notificaciones.length === 0
          ? <Empty description="Sin notificaciones" style={{ padding: '24px 0' }} imageStyle={{ height: 40 }} />
          : <List
              dataSource={notificaciones}
              renderItem={n => (
                <List.Item
                  onClick={() => handleClick(n)}
                  style={{
                    padding: '10px 12px',
                    cursor: n.url ? 'pointer' : 'default',
                    background: n.leida ? '#fff' : '#f0f7ff',
                    borderLeft: n.leida ? 'none' : '3px solid #1677ff',
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text strong style={{ fontSize: 13 }}>
                        {TIPO_ICONOS[n.tipo] || '🔔'} {n.titulo}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                        {dayjs(n.creado_en).fromNow()}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      {n.mensaje}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
        }
      </div>
    </div>
  )

  return (
    <Popover
      content={contenido}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      overlayInnerStyle={{ padding: 0, borderRadius: 8 }}
    >
      <Badge count={noLeidas} size="small" offset={[-2, 2]}>
        <BellOutlined style={{
          fontSize: 18, cursor: 'pointer',
          color: conectado ? '#595959' : '#ff4d4f',
        }} />
      </Badge>
    </Popover>
  )
}
