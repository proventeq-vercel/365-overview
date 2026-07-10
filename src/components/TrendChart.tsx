import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Series {
  key: string
  name?: string
}

interface TrendChartProps {
  data: Record<string, unknown>[]
  xKey: string
  series: Series[]
}

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed']

export function TrendChart({ data, xKey, series }: TrendChartProps) {
  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          {series.length > 1 && <Legend />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name ?? s.key}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
