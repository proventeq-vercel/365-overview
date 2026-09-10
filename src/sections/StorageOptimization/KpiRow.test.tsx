import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { KpiRow } from './KpiRow'
import { base, shortHistory, unknownEntitlement } from './testFixtures'

afterEach(cleanup)

const card = (label: string) => screen.getByText(label).closest('[data-slot="card"]')!

describe('KpiRow', () => {
  it('shows storage used against the entitlement', () => {
    render(<KpiRow overview={base} />)
    expect(card('Storage used')).toHaveTextContent('500 GB')
  })

  it('shows remaining headroom with its percentage', () => {
    render(<KpiRow overview={base} />)
    expect(card('Remaining')).toHaveTextContent('500 GB')
    expect(card('Remaining')).toHaveTextContent('50%')
  })

  it('says Unknown, never a zero figure, when the entitlement is unknown', () => {
    render(<KpiRow overview={unknownEntitlement} />)
    expect(card('Remaining')).toHaveTextContent(/unknown/i)
    expect(card('Remaining')).not.toHaveTextContent('0 B')
    expect(card('Remaining')).not.toHaveTextContent('0%')
  })

  it('says the cost is unknown rather than showing a zero bill', () => {
    render(<KpiRow overview={unknownEntitlement} />)
    expect(card('Cost of doing nothing')).toHaveTextContent(/unknown/i)
    expect(card('Cost of doing nothing')).not.toHaveTextContent('£0.00')
  })

  it('shows the billable cost as money when the entitlement is known', () => {
    render(<KpiRow overview={base} />)
    expect(card('Cost of doing nothing')).toHaveTextContent('£')
  })

  it('does not present a forecast when history is too short', () => {
    render(<KpiRow overview={shortHistory} />)
    expect(card('Forecast exhaustion')).toHaveTextContent(/not enough history/i)
  })

  it('states the exhaustion date when one is forecast', () => {
    render(<KpiRow overview={base} />)
    expect(card('Forecast exhaustion')).toHaveTextContent('2030-01-01')
  })

  it('marks every entitlement-derived card as estimated while it is an estimate', () => {
    render(<KpiRow overview={base} />)
    expect(card('Remaining')).toHaveTextContent(/estimated/i)
    expect(card('Cost of doing nothing')).toHaveTextContent(/estimated/i)
    expect(card('Forecast exhaustion')).toHaveTextContent(/estimated/i)
  })

  it('drops the estimated marker once the entitlement is measured', () => {
    const measured = {
      ...base,
      sharePoint: { ...base.sharePoint, entitlementIsMeasured: true },
      caveats: { ...base.caveats, entitlementIsEstimated: false },
    }
    render(<KpiRow overview={measured} />)
    expect(card('Remaining')).not.toHaveTextContent(/estimated/i)
    expect(card('Cost of doing nothing')).not.toHaveTextContent(/estimated/i)
  })

  it('renders exactly four cards', () => {
    const { container } = render(<KpiRow overview={base} />)
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(4)
  })
})
