import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
}

export function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
      {sub !== undefined && <div className="kpi-card__sub">{sub}</div>}
    </div>
  )
}
