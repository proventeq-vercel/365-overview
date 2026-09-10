import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModuleCard } from './ModuleCard'
import { PostureTile } from './PostureTile'
import { SeverityBar } from './SeverityBar'
import { UnavailablePanel } from './UnavailablePanel'
import type { CardStat } from '@/types/oversharing'

const STAT: CardStat = {
  count: 1420,
  affectedItems: 300,
  totalItems: 1000,
  coverage: 0.3,
  severity: 'action',
}

describe('SeverityBar', () => {
  it('exposes the coverage to assistive technology as a labelled progressbar', () => {
    render(<SeverityBar severity="action" coverage={0.3} coverageLabel="Share of sites affected" />)
    const bar = screen.getByRole('progressbar', { name: /Share of sites affected: 30.0%/ })
    expect(bar).toHaveAttribute('aria-valuenow', '30')
  })

  it('shows the P365 severity wording', () => {
    render(<SeverityBar severity="immediate" coverage={0.9} coverageLabel="Share of sites affected" />)
    expect(screen.getByText('Immediate Action Required')).toBeInTheDocument()
  })

  it('keeps a sliver of bar visible for a tiny but non-zero coverage', () => {
    render(<SeverityBar severity="review" coverage={0.0001} coverageLabel="Share of sites affected" />)
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '2%' })
  })
})

describe('ModuleCard', () => {
  it('renders the count with its own description and the severity grading', () => {
    render(
      <ModuleCard
        title="Public or Anyone Links"
        description="Links anyone can open without signing in."
        stat={STAT}
        countDescription={(stat) => `across ${stat.affectedItems} sites`}
        coverageLabel="Share of sites affected"
      />,
    )
    const card = screen.getByText('Public or Anyone Links').closest('[data-slot="card"]')
    expect(card).toHaveTextContent('1,420')
    expect(card).toHaveTextContent('across 300 sites')
    expect(card).toHaveTextContent('Action Required')
  })

  it('shows the unavailable content instead of a zero when the stat is missing', () => {
    render(
      <ModuleCard
        title="Sites open to the whole organisation"
        description="Every internal user can open these."
        stat={null}
        countDescription={() => 'never rendered'}
        coverageLabel="Share of groups affected"
        unavailable={<UnavailablePanel what="Public groups" reason="consent" requiredScope="Group.Read.All" compact />}
      />,
    )
    const card = screen.getByText('Sites open to the whole organisation').closest('[data-slot="card"]')
    expect(card).not.toHaveTextContent('0')
    expect(card).toHaveTextContent('Public groups — unavailable')
    expect(card).toHaveTextContent('Group.Read.All')
  })
})

describe('UnavailablePanel', () => {
  it('names the role a 403 needs', () => {
    render(<UnavailablePanel what="Sharing posture" reason="role" requiredRole="SharePoint Administrator" />)
    expect(screen.getByRole('alert')).toHaveTextContent('needs the SharePoint Administrator role')
  })

  it('offers the admin-consent link only for a consent failure', () => {
    const { rerender } = render(
      <UnavailablePanel what="Guests" reason="consent" requiredScope="User.Read.All" adminConsentUrl="https://consent" />,
    )
    expect(screen.getByRole('link', { name: 'Grant admin consent' })).toHaveAttribute('href', 'https://consent')

    rerender(<UnavailablePanel what="Guests" reason="role" adminConsentUrl="https://consent" />)
    expect(screen.queryByRole('link', { name: 'Grant admin consent' })).not.toBeInTheDocument()
  })

  it('says outright that the blank is not a zero', () => {
    render(<UnavailablePanel what="Guests" reason="unknown" />)
    expect(screen.getByRole('alert')).toHaveTextContent('this is not a zero')
  })

  it('explains a capability Graph simply does not have', () => {
    render(<UnavailablePanel what="Edit rights" reason="notInGraph" />)
    expect(screen.getByRole('alert')).toHaveTextContent('does not expose this')
  })
})

describe('PostureTile', () => {
  it('shows the setting and its reading', () => {
    render(<PostureTile label="Anyone links" value="Allowed" tone="bad" detail="Links that need no sign-in" />)
    const tile = screen.getByText('Anyone links').closest('[data-slot="card"]')
    expect(tile).toHaveTextContent('Allowed')
    expect(tile).toHaveTextContent('Links that need no sign-in')
  })
})
