// ─────────────────────────────────────────────────────────────────────
// src/pages/portal/DashboardPage.jsx
// Rediseño v2 — Dashboard editorial
// Drop-in: mantiene ticketService.dashboard() + listar() y Recharts.
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { Card, Spin, Tooltip } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { ticketService, getEstado } from '../../services/ticketService'
import { useAuthStore } from '../../store/authStore'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import './DashboardPage.css'

dayjs.locale('es')

// Paleta consistente con tokens.css
const COLORS = {
  ink:   '#14110D',
  acc:   '#B45309',
  crit:  '#A8201A',
  warn:  '#B45309',
  info:  '#1E3A8A',
  ok:    '#15633F',
  plum:  '#6B21A8',
  line:  '#E2DBC9',
  muted: '#6B665C',
}

const PRIO_PALETTE  = [COLORS.crit, COLORS.warn, COLORS.info, COLORS.ok]
const ESTADO_PALETTE = [COLORS.info, COLORS.plum, COLORS.warn, COLORS.crit]

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

// ── Pill renderers ────────────────────────────────────────────────────
const PRIO_MAP = {
  critica: { lbl: 'Crítica', cls: 'crit' },
  alta:    { lbl: 'Alta',    cls: 'warn' },
  media:   { lbl: 'Media',   cls: 'info' },
  baja:    { lbl: 'Baja',    cls: 'ok'   },
}
const ESTADO_CLS = {
  abierto: 'info', asignado: 'info',
  en_progreso: 'plum',
  pendiente: 'warn',
  escalado: 'crit',
  resuelto: 'ok',
  cerrado: 'muted',
  cancelado: 'crit',
}
function PrioPill({ v }) {
  const m = PRIO_MAP[v]; if (!m) return null
  return <span className={`qpill ${m.cls}`}><span className="qpill-dot" />{m.lbl}</span>
}
function EstadoPill({ v }) {
  const e = getEstado(v); if (!e) return null
  const cls = ESTADO_CLS[v] || 'muted'
  return <span className={`qpill ${cls}`}><span className="qpill-dot" />{e.label}</span>
}
function initials(name) {
  if (!name) return '—'
  return name.split(' ').map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase()
}

// ── Component ────────────────────────────────────────────────────────
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

  const dataPrio = [
    { name: 'Crítica', value: tickets.filter(t => t.prioridad === 'critica').length },
    { name: 'Alta',    value: tickets.filter(t => t.prioridad === 'alta').length    },
    { name: 'Media',   value: tickets.filter(t => t.prioridad === 'media').length   },
    { name: 'Baja',    value: tickets.filter(t => t.prioridad === 'baja').length    },
  ]
  const totalPrio = dataPrio.reduce((a, d) => a + d.value, 0)

  const dataEstado = [
    { name: 'Abiertos',    cantidad: stats.abiertos    || 0 },
    { name: 'En progreso', cantidad: stats.en_progreso || 0 },
    { name: 'Pendientes',  cantidad: stats.pendientes  || 0 },
    { name: 'Escalados',   cantidad: stats.escalados   || 0 },
  ]

  // serie sparkline ficticia (puedes reemplazarla por una llamada real al backend)
  const sparkData = Array.from({ length: 10 }).map((_, i) => ({ x: i, y: 20 + Math.round(Math.sin(i)*8 + Math.random()*6 + i*2) }))

  const slaRate = stats.total > 0
    ? Math.round(((stats.total - (stats.vencidos_sla || 0)) / stats.total) * 100)
    : 100

  const today = dayjs().format('dddd, D [de] MMMM [de] YYYY')

  return (
    <Spin spinning={loading}>
      {/* ── Page header (editorial) ──────────────────────────────── */}
      <div className="qph">
        <div className="qph-eyebrow"><span className="qph-dot" />Resumen operativo · {today}</div>
        <h1 className="qph-title">
          {greeting()}, <em>{usuario?.nombre}.</em>
        </h1>
        <p className="qph-sub">
          Tienes <b>{stats.vencidos_sla || 0} tickets vencidos</b> y <b>{stats.por_vencer_sla || 0} por vencer SLA</b> en las próximas horas. {stats.resueltos_hoy ? `El equipo lleva ${stats.resueltos_hoy} tickets resueltos hoy.` : ''}
        </p>
        <span className="qph-rule" />
      </div>

      {/* ── KPI Band editorial ────────────────────────────────────── */}
      <div className="qkpi-band">
        <div className="qkpi-hero">
          <div className="qkpi-lbl">Tickets abiertos · ahora</div>
          <div className="qkpi-hero-val">
            <span>{stats.abiertos ?? 0}</span>
            {stats.abiertos != null && (
              <span className="qkpi-delta">
                {(stats.en_progreso || 0)} en atención · {(stats.sin_asignar || 0)} sin asignar
              </span>
            )}
          </div>
          <div className="qkpi-hero-spark">
            <ResponsiveContainer width="100%" height={42}>
              <AreaChart data={sparkData} margin={{ top: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="qSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor={COLORS.acc} stopOpacity={0.5}/>
                    <stop offset="100%" stopColor={COLORS.acc} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="y" stroke={COLORS.ink} fill="url(#qSpark)"
                  strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <KpiMini lbl="Resueltos hoy"  val={stats.resueltos_hoy ?? 0}   sub="completados"     tone="ok"   />
        <KpiMini lbl="Vencidos SLA"   val={stats.vencidos_sla ?? 0}    sub="críticos"        tone={(stats.vencidos_sla || 0) > 0 ? 'crit' : 'ok'} />
        <KpiMini lbl="Cumpl. SLA"     val={`${slaRate}%`}              sub="meta 90% · mes"  tone={slaRate >= 90 ? 'ok' : 'crit'} />
        <KpiMini lbl="NPS"            val={stats.nps_promedio ? `${stats.nps_promedio}/10` : '—'} sub="satisfacción" />
      </div>

      {/* ── Sección 01 — Pulso del día ────────────────────────────── */}
      <div className="qsec-h">
        <div className="qsec-l"><span className="qsec-num">01</span><em>Pulso del día</em></div>
        <div className="qsec-r">
          <span className="qsec-meta">Tiempo real · auto-actualizado</span>
        </div>
      </div>

      <div className="qsplit-2">
        <div className="qcard">
          <div className="qcard-head">
            <span className="qcard-title">Estado de tickets</span>
            <span className="qcard-meta">últimas 24h</span>
          </div>
          <div className="qcard-body">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={dataEstado} barSize={36} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                <ReTooltip contentStyle={{ border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 11, fontFamily: 'var(--f-ui)' }} cursor={{ fill: 'rgba(180,83,9,0.06)' }} />
                <Bar dataKey="cantidad" radius={[4,4,0,0]}>
                  {dataEstado.map((_, i) => (
                    <Cell key={i} fill={ESTADO_PALETTE[i % ESTADO_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="qcard">
          <div className="qcard-head">
            <span className="qcard-title">Distribución por prioridad</span>
            <span className="qcard-meta">tickets activos</span>
          </div>
          <div className="qcard-body qring-wrap">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={dataPrio} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70} innerRadius={42}
                  paddingAngle={1.5}
                  labelLine={false}
                >
                  {dataPrio.map((_, i) => (
                    <Cell key={i} fill={PRIO_PALETTE[i]} stroke="var(--bg-surface)" strokeWidth={2}/>
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="qring-legend">
              {dataPrio.map((d, i) => (
                <div key={d.name} className="qring-row">
                  <span className="qring-sw" style={{ background: PRIO_PALETTE[i] }} />
                  <span className="qring-lbl">{d.name}</span>
                  <span className="qring-n">{d.value}</span>
                  <span className="qring-p">{totalPrio ? Math.round((d.value/totalPrio)*100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección 02 — Cola activa ───────────────────────────────── */}
      <div className="qsec-h">
        <div className="qsec-l"><span className="qsec-num">02</span><em>Cola activa</em></div>
        <div className="qsec-r">
          <a className="qsec-link" href="/tickets">Ver todos los tickets →</a>
        </div>
      </div>

      <div className="qtbl-wrap">
        <table className="qtbl">
          <colgroup>
            <col style={{ width: '13%' }}/>
            <col/>
            <col style={{ width: '10%' }}/>
            <col style={{ width: '13%' }}/>
            <col style={{ width: '17%' }}/>
            <col style={{ width: '12%' }}/>
          </colgroup>
          <thead>
            <tr>
              <th>Nº de ticket</th>
              <th>Título</th>
              <th>Prio</th>
              <th>Estado</th>
              <th>Técnico</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id}
                  className={t.prioridad === 'critica' ? 'is-critical' : ''}
                  onClick={() => window.location.href = `/tickets`}>
                <td><span className="qmono">{t.numero}</span></td>
                <td><span className="qttl">{t.titulo}</span></td>
                <td><PrioPill v={t.prioridad}/></td>
                <td><EstadoPill v={t.estado}/></td>
                <td>
                  {t.tecnico
                    ? <span className="qav-named">
                        <span className="qav">{initials(`${t.tecnico.nombre} ${t.tecnico.apellido}`)}</span>
                        <span>{t.tecnico.nombre} {t.tecnico.apellido}</span>
                      </span>
                    : <span className="qmuted">Sin asignar</span>}
                </td>
                <td><span className="qmuted qmono">{dayjs(t.creado_en).format('DD/MM HH:mm')}</span></td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan="6" className="qempty">Sin tickets recientes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ height: 40 }} />
    </Spin>
  )
}

function KpiMini({ lbl, val, sub, tone }) {
  return (
    <div className="qkpi-mini">
      <div className="qkpi-lbl">{lbl}</div>
      <div className={`qkpi-mini-val tone-${tone || 'neutral'}`}>{val}</div>
      <div className="qkpi-mini-sub">{sub}</div>
    </div>
  )
}
