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
    expect(card('Remaining')).toHaveTextContent('50.0% headroom')
  })

  it('reports headroom as the unused share, to one decimal', () => {
    render(
      <KpiRow
        overview={{ ...base, sharePoint: { ...base.sharePoint, headroomRatio: 0.218 } }}
      />,
    )
    expect(card('Remaining')).toHaveTextContent('21.8% headroom')
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

  it('says "No change today" instead of £0.00 when growth fits inside the entitlement', () => {
    render(<KpiRow overview={base} />)
    expect(card('Cost of doing nothing')).toHaveTextContent('No change today')
    expect(card('Cost of doing nothing')).not.toHaveTextContent('£0.00')
  })

  it('shows the billable cost as money once growth exceeds the headroom', () => {
    render(
      <KpiRow overview={{ ...base, cost: { ...base.cost, growthBillableAnnual: 1234.5 } }} />,
    )
    expect(card('Cost of doing nothing')).toHaveTextContent('£1,234.50')
  })

  it('quotes the configured rate in the cost hint', () => {
    render(<KpiRow overview={base} />)
    expect(card('Cost of doing nothing')).toHaveTextContent('£0.16/GB per month')
  })

  it('does not present a forecast when history is too short', () => {
    render(<KpiRow overview={shortHistory} />)
    expect(card('Forecast exhaustion')).toHaveTextContent(/not enough history/i)
  })

  it('states the exhaustion month when one is forecast, qualified by the growth assumption', () => {
    render(<KpiRow overview={base} />)
    expect(card('Forecast exhaustion')).toHaveTextContent('January 2030')
    expect(card('Forecast exhaustion')).toHaveTextContent('At current growth')
  })

  it('says the forecast needs the entitlement when it is unknown', () => {
    render(<KpiRow overview={unknownEntitlement} />)
    expect(card('Forecast exhaustion')).toHaveTextContent('Unknown')
    expect(card('Forecast exhaustion')).toHaveTextContent('Needs tenant entitlement')
  })

  it('states the used figure against the entitlement, tenant-wide', () => {
    render(<KpiRow overview={base} />)
    expect(card('Storage used')).toHaveTextContent('500 GB of 1000 GB entitlement')
    expect(card('Storage used')).toHaveTextContent('Tenant-wide, as reported by Microsoft 365')
  })

  it('says the entitlement is unavailable on the used card when it is unknown', () => {
    render(<KpiRow overview={unknownEntitlement} />)
    expect(card('Storage used')).toHaveTextContent('Tenant entitlement unavailable')
    expect(card('Storage used')).not.toHaveTextContent(/ of /)
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

  it('colours the used card by the utilisation grade the model assigned', () => {
    const attention = {
      ...base,
      sharePoint: { ...base.sharePoint, utilization: 'attention' as const },
    }
    render(<KpiRow overview={attention} />)
    expect(card('Storage used')).toHaveTextContent('attention')
  })

  it('shows no utilisation grade on the used card without an entitlement', () => {
    render(<KpiRow overview={unknownEntitlement} />)
    expect(card('Storage used')).not.toHaveTextContent(/healthy|watch|attention/)
  })

  it('renders exactly four cards', () => {
    const { container } = render(<KpiRow overview={base} />)
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(4)
  })
})
