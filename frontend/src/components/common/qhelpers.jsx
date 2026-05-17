// ─────────────────────────────────────────────────────────────────────
// src/components/common/qhelpers.jsx
// Helpers visuales compartidos por todos los módulos del rediseño v2.
// ─────────────────────────────────────────────────────────────────────
//
// USO:
//   import { QPageHeader, QKpiRow, QPill, QProgress, QDrawerTitle,
//            initials, avatarColor, formatCurrencyES }
//     from '../../components/common/qhelpers'
//
// Estos helpers SOLO maquetan — no traen lógica de negocio.

import { useMemo } from 'react'

// ── Helpers utilitarios ───────────────────────────────────────────
export function initials(...parts) {
  return parts.filter(Boolean).join(' ')
    .split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '—'
}

const AVATAR_PALETTE = [
  '#B45309', '#1E3A8A', '#15633F', '#6B21A8',
  '#9A1B5E', '#0E5460', '#7C2D12', '#3F3F46',
]
export function avatarColor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

export function formatCurrencyES(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-PE', {
    style: 'currency', currency: 'PEN', maximumFractionDigits: 0,
  }).format(val)
}

// ── <QPageHeader> — encabezado editorial reutilizable ─────────────
export function QPageHeader({ eyebrow, title, titleEm, subtitle, actions, children }) {
  return (
    <div className="qph" style={{ marginBottom: 22 }}>
      <div className="qph-eyebrow"><span className="qph-dot" />{eyebrow}</div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <h1 className="qph-title">
            {title} {titleEm && <em>{titleEm}</em>}
          </h1>
          {subtitle && <p className="qph-sub" style={{ marginTop: 8 }}>{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      {children}
      <span className="qph-rule" />
    </div>
  )
}

// ── <QKpiRow> — strip de KPIs ────────────────────────────────────
// items = [{ lbl, val, sub?, tone? }]   tone: 'ok'|'warn'|'crit'|'info'|'plum'
export function QKpiRow({ items, columns }) {
  const cols = columns || items.length
  return (
    <div className="qkpi-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((k, i) => (
        <div key={k.lbl + i} className="qkpi-cell" style={{
          borderRight: i < items.length - 1 ? '1px solid var(--line-2)' : 'none',
        }}>
          <div className="qkpi-lbl">{k.lbl}</div>
          <div className={`qkpi-cell-val tone-${k.tone || 'neutral'}`}>
            {k.val ?? '—'}
          </div>
          {k.sub && <div className="qkpi-sub">{k.sub}</div>}
        </div>
      ))}
    </div>
  )
}

// ── <QPill> ────────────────────────────────────────────────────────
// tone: 'crit'|'warn'|'info'|'ok'|'plum'|'muted'|'gold'
export function QPill({ tone = 'muted', children, icon }) {
  return (
    <span className={`qpill ${tone}`}>
      {icon ? icon : <span className="qpill-dot" />}
      {children}
    </span>
  )
}

// ── <QProgress> — barra horizontal compacta con porcentaje ───────
export function QProgress({ value, max = 100, tone, label }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const computedTone = tone || (pct >= 90 ? 'crit' : pct >= 70 ? 'warn' : 'ok')
  return (
    <span className="qprog">
      <span className="qprog-track">
        <span className={`qprog-fill ${computedTone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="qprog-lbl">{label ?? `${pct}%`}</span>
    </span>
  )
}

// ── <QDrawerTitle> — título de drawer con ícono editorial ────────
export function QDrawerTitle({ icon, children }) {
  return (
    <span className="qdrawer-title">
      <span className="qdrawer-title-ic">{icon}</span>
      <span className="qdrawer-title-tx">{children}</span>
    </span>
  )
}

// ── <QCellAvatar> — celda con avatar y dos líneas ────────────────
export function QCellAvatar({ name, sub, src, color }) {
  if (!name) return <span className="qmuted">—</span>
  return (
    <div className="qcell">
      <span className="qcell-thumb" style={{
        background: src ? 'var(--bg-surface)' : (color || avatarColor(name)),
        color: '#F4EFE3',
        fontSize: 11, fontWeight: 600,
      }}>
        {src ? <img src={src} alt="" /> : initials(name)}
      </span>
      <div className="qcell-text">
        <div className="qcell-name">{name}</div>
        {sub && <div className="qcell-sub">{sub}</div>}
      </div>
    </div>
  )
}
