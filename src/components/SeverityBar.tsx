import { SEVERITY_COLORS, SEVERITY_LABELS, type Severity } from '@/lib/severity'
import { formatPercent } from '@/lib/format'

interface SeverityBarProps {
  severity: Severity
  coverage: number
  coverageLabel: string
}

export function SeverityBar({ severity, coverage, coverageLabel }: SeverityBarProps) {
  const width = Math.max(2, Math.min(100, coverage * 100))
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-valuenow={Math.round(coverage * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${coverageLabel}: ${formatPercent(coverage, 1)}`}
        className="h-1.5 w-full rounded-full bg-hairline"
      >
        <span
          className="block h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${width}%`, background: SEVERITY_COLORS[severity] }}
        />
      </div>
      <span className="text-xs font-semibold" style={{ color: SEVERITY_COLORS[severity] }}>
        {SEVERITY_LABELS[severity]}
      </span>
    </div>
  )
}
