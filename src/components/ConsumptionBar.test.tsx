import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ConsumptionBar } from './ConsumptionBar'

describe('ConsumptionBar', () => {
  it('renders computed percent text', () => {
    const { getByText } = render(<ConsumptionBar used={80} total={100} />)
    expect(getByText('80%')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    const { getByText } = render(<ConsumptionBar used={50} total={100} label="Storage" />)
    expect(getByText('Storage')).toBeInTheDocument()
  })

  it('shows 0% when total is 0', () => {
    const { getByText } = render(<ConsumptionBar used={0} total={0} />)
    expect(getByText('0%')).toBeInTheDocument()
  })
})
