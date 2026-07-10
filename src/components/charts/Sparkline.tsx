import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props {
  data: Record<string, unknown>[]
  dataKey: string
  height?: number
  ariaLabel?: string
}

export function Sparkline({ data, dataKey, height = 40, ariaLabel }: Props) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <Line type="monotone" dataKey={dataKey} stroke="#34a1a0" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
