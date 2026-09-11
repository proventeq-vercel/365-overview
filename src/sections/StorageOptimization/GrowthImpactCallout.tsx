import { STATUS_COLORS } from '@/components/charts/chartTheme'
import type { ForecastCallout } from './forecastCopy'

export function GrowthImpactCallout({ callout }: { callout: ForecastCallout }) {
  return (
    <div
      role="status"
      className={`flex flex-col gap-2 rounded-xl border-l-4 bg-muted/40 px-4 py-3 ${
        callout.tone === 'warn' ? 'border-l-amber' : 'border-l-sky'
      }`}
    >
      <span
        className="w-fit rounded-full bg-muted-foreground px-2 py-0.5 text-xs font-semibold text-white"
        style={
          callout.pillStatus === null ? undefined : { background: STATUS_COLORS[callout.pillStatus] }
        }
      >
        {callout.pillLabel}
      </span>
      <p className="text-sm font-semibold text-ink">{callout.headline}</p>
      <p className="text-sm text-muted-foreground">{callout.note}</p>
    </div>
  )
}
