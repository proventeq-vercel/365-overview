import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string
  color: string
  information?: ReactNode
}

export function ProductStatCard({ label, value, color, information }: Props) {
  return (
    <div
      className="rounded-lg border border-p365-grey-100 border-l-[3px] bg-white px-5 py-4"
      style={{ borderLeftColor: color }}
    >
      <p className="tabular text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-sm font-semibold text-p365-grey-600">{label}</p>
      {information && <p className="mt-1 text-xs text-p365-grey-500">{information}</p>}
    </div>
  )
}
