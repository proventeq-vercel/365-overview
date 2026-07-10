import type { ReportPeriod } from '../types/reports'

const PERIODS: ReportPeriod[] = ['D7', 'D30', 'D90', 'D180']

const LABELS: Record<ReportPeriod, string> = {
  D7: '7 days',
  D30: '30 days',
  D90: '90 days',
  D180: '180 days',
}

interface PeriodSelectorProps {
  value: ReportPeriod
  onChange: (p: ReportPeriod) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="period-selector" role="group" aria-label="Report period">
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          className={`period-selector__btn${value === period ? ' period-selector__btn--active' : ''}`}
          aria-pressed={value === period}
          onClick={() => onChange(period)}
        >
          {LABELS[period]}
        </button>
      ))}
    </div>
  )
}
