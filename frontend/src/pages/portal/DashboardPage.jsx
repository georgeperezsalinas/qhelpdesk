import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Typography, Tag, Table, Badge, Spin, Progress } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts'
import { ticketService, getPrioridad, getEstado } from '../../services/ticketService'
import { useAuthStore } from '../../store/authStore'
import dayjs from 'dayjs'

const { Text } = Typography

const COLORS_PIE = ['#ef4444','#f59e0b','#3b82f6','#22c55e']
const COLORS_BAR = ['#1d4ed8','#7e22ce','#c2410c','#0e7490']

export default function DashboardPage() {
  const { usuario } = useAuthStore()
  const [stats,   setStats]   = useState({})
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      ticketService.dashboard(),
      ticketService.listar({ limit: 8 }),
    ]).then(([{ data: d }, { data: tks }]) => {
      setStats(d)
      setTickets(tks)
    }).finally(() => setLoading(false))
  }, [])

  const dataPrioridad = [
    { name: 'Crítica', value: tickets.filter(t => t.prioridad === 'critica').length },
    { name: 'Alta',    value: tickets.filter(t => t.prioridad === 'alta').length    },
    { name: 'Media',   value: tickets.filter(t => t.prioridad === 'media').length   },
    { name: 'Baja',    value: tickets.filter(t => t.prioridad === 'baja').length    },
  ]

  const dataEstado = [
    { name: 'Abiertos',   cantidad: stats.abiertos    || 0 },
    { name: 'En progreso',cantidad: stats.en_progreso || 0 },
    { name: 'Pendientes', cantidad: stats.pendientes  || 0 },
    { name: 'Escalados',  cantidad: stats.escalados   || 0 },
  ]

  const slaRate = stats.total > 0
    ? Math.round(((stats.total - (stats.vencidos_sla || 0)) / stats.total) * 100)
    : 100

  const columnas = [
    { title: 'Ticket', dataIndex: 'numero', width: 130,
      render: v => <Text code style={{ fontSize: 11, color: '#1d4ed8' }}>{v}</Text> },
    { title: 'Título', dataIndex: 'titulo',
      render: v => <Text style={{ fontSize: 12 }} ellipsis>{v}</Text> },
    { title: 'Prioridad', dataIndex: 'prioridad', width: 90,
      render: v => {
        const MAP = { critica:'red', alta:'orange', media:'blue', baja:'green' }
        const LAB = { critica:'Crítica', alta:'Alta', media:'Media', baja:'Baja' }
        return <Tag color={MAP[v]} style={{ fontSize: 10 }}>{LAB[v]}</Tag>
      }},
    { title: 'Estado', dataIndex: 'estado', width: 120,
      render: v => { const e = getEstado(v); return e ? <Badge status={e.color} text={e.label} /> : v } },
    { title: 'Técnico', dataIndex: 'tecnico', width: 130,
      render: v => v ? <Text style={{ fontSize: 11 }}>{v.nombre} {v.apellido}</Text>
                     : <Text type="secondary" style={{ fontSize: 11 }}>Sin asignar</Text> },
    { title: 'Creado', dataIndex: 'creado_en', width: 100,
      render: v => <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).format('DD/MM HH:mm')}</Text> },
  ]

  return (
    <Spin spinning={loading}>
      {/* Saludo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>
          Buenos días, {usuario?.nombre} 👋
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          {dayjs().format('dddd, D [de] MMMM [de] YYYY')} · Oficina de Sistemas
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip" style={{ marginBottom: 20 }}>
        {[
          { label: 'TOTAL TICKETS',  value: stats.total || 0,            color: '#0f172a', sub: 'registrados'    },
          { label: 'ABIERTOS',       value: stats.abiertos || 0,          color: '#1d4ed8', sub: 'sin atender'    },
          { label: 'EN PROGRESO',    value: stats.en_progreso || 0,       color: '#7e22ce', sub: 'en atención'    },
          { label: 'SIN ASIGNAR',    value: stats.sin_asignar || 0,       color: stats.sin_asignar > 0 ? '#f59e0b' : '#22c55e', sub: 'pendientes' },
          { label: 'VENCIDOS SLA',   value: stats.vencidos_sla || 0,      color: stats.vencidos_sla > 0 ? '#ef4444' : '#22c55e', sub: 'críticos' },
          { label: 'RESUELTOS HOY',  value: stats.resueltos_hoy || 0,     color: '#22c55e', sub: 'completados'   },
          { label: 'CUMPL. SLA',     value: `${slaRate}%`,                color: slaRate >= 90 ? '#22c55e' : '#ef4444', sub: 'este mes' },
          { label: 'NPS',            value: stats.nps_promedio ? `${stats.nps_promedio}/10` : '—', color: '#7e22ce', sub: 'satisfacción' },
        ].map(s => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-card-label">{s.label}</div>
            <div className="kpi-card-value" style={{ color: s.color }}>{s.value}</div>
            <div className="kpi-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={14}>
          <Card title="Estado de tickets" size="small"
            extra={<Text type="secondary" style={{ fontSize: 11 }}>Tiempo real</Text>}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dataEstado} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11 }}
                />
                <Bar dataKey="cantidad" radius={[4,4,0,0]}>
                  {dataEstado.map((_, i) => (
                    <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card title="Distribución por prioridad" size="small"
            extra={<Text type="secondary" style={{ fontSize: 11 }}>Tickets activos</Text>}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dataPrioridad} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {dataPrioridad.map((_, i) => (
                    <Cell key={i} fill={COLORS_PIE[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Últimos tickets */}
      <Card title="Tickets recientes" size="small"
        extra={
          <Text
            style={{ fontSize: 11, color: '#1d4ed8', cursor: 'pointer' }}
            onClick={() => window.location.href = '/tickets'}
          >
            Ver todos →
          </Text>
        }
      >
        <Table
          dataSource={tickets} columns={columnas} rowKey="id"
          pagination={false} size="small"
          scroll={{ x: 700 }}
          rowClassName={r => r.prioridad === 'critica' ? 'row-critica' : ''}
        />
      </Card>
    </Spin>
  )
}
