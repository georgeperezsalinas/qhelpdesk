/**
 * KpiStrip — barra de KPIs compacta estilo ERP.
 * items: [{ label, value, color? }]
 */
export default function KpiStrip({ items = [], style }) {
  return (
    <div className="kpi-strip" style={style}>
      {items.map((item) => (
        <div
          key={item.label}
          className="kpi-card"
          style={item.color ? { borderLeftColor: item.color } : {}}
        >
          <div className="kpi-card-label">{item.label}</div>
          <div className="kpi-card-value" style={item.color ? { color: item.color } : {}}>
            {item.value ?? '—'}
          </div>
        </div>
      ))}
    </div>
  )
}
