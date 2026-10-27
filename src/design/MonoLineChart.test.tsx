import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { MonoLineChart } from './charts'

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  const Pass = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  const Nothing = () => null
  return {
    ...actual,
    ResponsiveContainer: Pass,
    LineChart: Pass,
    CartesianGrid: Nothing,
    XAxis: Nothing,
    YAxis: Nothing,
    Tooltip: Nothing,
    Legend: Nothing,
    ReferenceLine: Nothing,
    Line: ({ dataKey, dot }: { dataKey: string; dot: unknown }) => (
      <span data-testid="line" data-key={dataKey} data-dot={dot === false ? 'none' : 'drawn'} />
    ),
  }
})

afterEach(cleanup)

const series = [
  { key: 'actual', name: 'Actual' },
  { key: 'projected', name: 'Forecast', dashed: true },
]

const chart = (data: Record<string, unknown>[]) => (
  <MonoLineChart data={data} xKey="month" series={series} formatValue={String} formatX={String} ariaLabel="Storage trend" />
)

const dots = () =>
  Object.fromEntries(screen.getAllByTestId('line').map((line) => [line.dataset.key, line.dataset.dot]))

describe('MonoLineChart', () => {
  it('marks the one measured point of a young tenant whose days all fall in one month, among the forecast rows', () => {
    render(
      chart([
        { month: '2026-08', actual: 150, projected: 150 },
        { month: '2026-09', actual: null, projected: 160 },
        { month: '2026-10', actual: null, projected: 170 },
      ]),
    )
    expect(dots()).toEqual({ actual: 'drawn', projected: 'none' })
  })

  it('draws plain lines for series of two or more points', () => {
    render(
      chart([
        { month: '2026-07', actual: 140, projected: null },
        { month: '2026-08', actual: 150, projected: 150 },
        { month: '2026-09', actual: null, projected: 160 },
      ]),
    )
    expect(dots()).toEqual({ actual: 'none', projected: 'none' })
  })
})
