interface ConsumptionBarProps {
  used: number
  total: number
  label?: string
}

export function ConsumptionBar({ used, total, label }: ConsumptionBarProps) {
  const percent = total === 0 ? 0 : Math.round((used / total) * 100)
  const clampedPercent = Math.min(100, Math.max(0, percent))

  return (
    <div className="consumption-bar">
      {label !== undefined && (
        <div className="consumption-bar__label">{label}</div>
      )}
      <div className="consumption-bar__track">
        <div
          className="consumption-bar__fill"
          style={{ width: `${clampedPercent}%` }}
          role="progressbar"
          aria-valuenow={clampedPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="consumption-bar__percent">{percent}%</div>
    </div>
  )
}
