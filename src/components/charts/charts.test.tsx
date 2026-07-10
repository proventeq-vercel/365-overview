import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AreaTrend } from './AreaTrend'
import { BarBreakdown } from './BarBreakdown'
import { DonutShare } from './DonutShare'
import { RadialGauge } from './RadialGauge'
import { Sparkline } from './Sparkline'

const points = [{ date: 'd1', value: 10 }, { date: 'd2', value: 20 }]

describe('chart wrappers', () => {
  it('AreaTrend renders with an accessible label', () => {
    const { getByRole } = render(
      <AreaTrend data={points} xKey="date" series={[{ key: 'value', name: 'Value' }]} ariaLabel="trend" />,
    )
    expect(getByRole('img', { name: 'trend' })).toBeInTheDocument()
  })
  it('BarBreakdown renders', () => {
    const { getByRole } = render(
      <BarBreakdown data={points} categoryKey="date" valueKeys={[{ key: 'value', name: 'Value' }]} ariaLabel="bars" />,
    )
    expect(getByRole('img', { name: 'bars' })).toBeInTheDocument()
  })
  it('DonutShare renders', () => {
    const { getByRole } = render(<DonutShare data={points} nameKey="date" valueKey="value" ariaLabel="donut" />)
    expect(getByRole('img', { name: 'donut' })).toBeInTheDocument()
  })
  it('RadialGauge shows the rounded percent', () => {
    const { getByText } = render(<RadialGauge value={83.4} label="Utilization" />)
    expect(getByText('83%')).toBeInTheDocument()
  })
  it('Sparkline renders', () => {
    const { getByRole } = render(<Sparkline data={points} dataKey="value" ariaLabel="spark" />)
    expect(getByRole('img', { name: 'spark' })).toBeInTheDocument()
  })
})
