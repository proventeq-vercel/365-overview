import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { render } from '@/test/render'
import { KpiCards } from './KpiCards'
import { base, shortHistory, unknownEntitlement } from './testFixtures'

afterEach(cleanup)

const card = (label: string) => screen.getByText(label).closest('[data-slot="stat-card"]')!

describe('KpiCards', () => {
  it('shows storage used against the entitlement', () => {
    render(<KpiCards overview={base} />)
    expect(card('Storage used')).toHaveTextContent('500 GB')
  })

  it('shows remaining headroom with its percentage', () => {
    render(<KpiCards overview={base} />)
    expect(card('Remaining')).toHaveTextContent('500 GB')
    expect(card('Remaining')).toHaveTextContent('50.0% headroom')
  })

  it('reports headroom as the unused share, to one decimal', () => {
    render(
      <KpiCards
        overview={{ ...base, sharePoint: { ...base.sharePoint, headroomRatio: 0.218 } }}
      />,
    )
    expect(card('Remaining')).toHaveTextContent('21.8% headroom')
  })

  it('says Unknown, never a zero figure, when the entitlement is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card('Remaining')).toHaveTextContent(/unknown/i)
    expect(card('Remaining')).not.toHaveTextContent('0 B')
    expect(card('Remaining')).not.toHaveTextContent('0%')
  })

  it('prices growth as money even when the entitlement is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card('Cost of doing nothing')).toHaveTextContent('£288.00')
    expect(card('Cost of doing nothing')).not.toHaveTextContent(/unknown/i)
  })

  it('shows the annual cost of growth as money', () => {
    render(<KpiCards overview={{ ...base, cost: { ...base.cost, growthAnnual: 1234.5 } }} />)
    expect(card('Cost of doing nothing')).toHaveTextContent('£1,234.50')
  })

  it('quotes the configured rate in the cost hint', () => {
    render(<KpiCards overview={base} />)
    expect(card('Cost of doing nothing')).toHaveTextContent('£0.02/GB per month')
  })

  it('does not present a forecast when history is too short', () => {
    render(<KpiCards overview={shortHistory} />)
    expect(card('Forecast exhaustion')).toHaveTextContent(/not enough history/i)
  })

  it('states the exhaustion month when one is forecast, qualified by the growth assumption', () => {
    render(<KpiCards overview={base} />)
    expect(card('Forecast exhaustion')).toHaveTextContent('January 2030')
    expect(card('Forecast exhaustion')).toHaveTextContent('At current growth')
  })

  it('says the forecast needs the entitlement when it is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card('Forecast exhaustion')).toHaveTextContent('Unknown')
    expect(card('Forecast exhaustion')).toHaveTextContent('Needs tenant entitlement')
  })

  it('states the used figure against the entitlement, tenant-wide', () => {
    render(<KpiCards overview={base} />)
    expect(card('Storage used')).toHaveTextContent('500 GB of 1000 GB entitlement')
    expect(card('Storage used')).toHaveTextContent('Tenant-wide, as reported by Microsoft 365')
  })

  it('says the entitlement is unavailable on the used card when it is unknown', () => {
    render(<KpiCards overview={unknownEntitlement} />)
    expect(card('Storage used')).toHaveTextContent('Tenant entitlement unavailable')
    expect(card('Storage used')).not.toHaveTextContent(/ of /)
  })

  it('renders exactly four cards', () => {
    const { container } = render(<KpiCards overview={base} />)
    expect(container.querySelectorAll('[data-slot="stat-card"]')).toHaveLength(4)
  })
})
