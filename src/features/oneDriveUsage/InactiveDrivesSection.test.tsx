import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import type * as EnvModule from '@/config/env'
import { FeatureFlags } from '@/config/featureFlags'
import type { OneDriveAttention, StorageOverview } from '@/types/storage'
import { base, baseAttention } from '@/features/storageOptimization/testFixtures'
import { P365 } from '@/design/theme'
import { InactiveDrivesSection } from './InactiveDrivesSection'

const GB = 1_073_741_824

vi.mock('@/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof EnvModule>()
  return {
    ...actual,
    env: {
      ...actual.env,
      features: new Set([...actual.env.features, FeatureFlags.OptimizationStorageReportOneDrive]),
    },
  }
})

afterEach(cleanup)

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

const card = (label: string) => screen.getByText(label).closest('[data-slot="stat-card"]')!

const withAttention = (attention: Partial<OneDriveAttention>): StorageOverview => ({
  ...base,
  oneDrive: { ...base.oneDrive, attention: { ...baseAttention, ...attention } },
})

describe('InactiveDrivesSection', () => {
  it('renders nothing without the OneDrive usage report', () => {
    const { container } = render(
      <InactiveDrivesSection overview={{ ...base, oneDrive: { ...base.oneDrive, attention: null } }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows inactive, deleted and unlicensed OneDrives as three cards, never one total', () => {
    render(<InactiveDrivesSection overview={base} />)
    expect(card('Inactive OneDrives')).toHaveTextContent('30 GB')
    expect(card('Inactive OneDrives')).toHaveTextContent('6 live OneDrives have had no activity since August 2023, or none recorded, and their owners hold a OneDrive licence')
    expect(card('Deleted, under retention')).toHaveTextContent('0 B')
    expect(card('Owner unlicensed')).toHaveTextContent('40 GB')
    expect(card('Owner unlicensed')).toHaveTextContent("2 live OneDrives belong to owners without a OneDrive licence. 1 of them is counted because Microsoft's licence report, which lists licensed users, does not list its owner")
    expect(screen.queryByText('70 GB')).not.toBeInTheDocument()
  })

  it('says unlicensed storage is billed only as Microsoft states, $0.05 per GB a month once archived with billing on', () => {
    render(<InactiveDrivesSection overview={base} />)
    expect(card('Owner unlicensed')).toHaveTextContent(
      'read-only after 60 days and archives it after 93; once billing for unlicensed OneDrives is on, archived storage costs $0.05 per GB a month',
    )
  })

  it('shows the OneDrives quiet for 93 days in place of the unlicensed group when the licence report is missing', () => {
    render(
      <InactiveDrivesSection
        overview={withAttention({
          unlicensed: { basis: 'noActivity', count: 5, bytes: 25 * GB, days: 93, since: '2026-05-29' },
        })}
      />,
    )
    expect(card('No activity for over 93 days')).toHaveTextContent('25 GB')
    expect(card('No activity for over 93 days')).toHaveTextContent(
      '5 live OneDrives have had no activity since 29 May 2026, though they were active within the last 3 years (longer quiet ones count as inactive).',
    )
    expect(card('No activity for over 93 days')).toHaveTextContent('Microsoft archives it 93 days after the licence goes')
    expect(screen.queryByText('Owner unlicensed')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Inactive, deleted and quiet OneDrives' })).toBeInTheDocument()
    expect(screen.getByText(/and so can unlicensed ones, which the quiet group stands in for\.$/)).toBeInTheDocument()
    cleanup()
    render(
      <InactiveDrivesSection
        overview={withAttention({
          inactiveYears: 1,
          unlicensed: { basis: 'noActivity', count: 1, bytes: 2 * GB, days: 93, since: '2026-05-29' },
        })}
      />,
    )
    expect(card('No activity for over 93 days')).toHaveTextContent(
      '1 live OneDrive has had no activity since 29 May 2026, though it was active within the last 1 year (longer quiet ones count as inactive).',
    )
    expect(card('Inactive OneDrives')).toHaveTextContent(
      "Microsoft's active-user report did not come back or matched none of the owners, so some of these may belong to owners without a licence",
    )
  })

  it('bands the inactive OneDrives by years past the window, leaving out empty bands', () => {
    const bands = baseAttention.inactive.bands.map((band) => (band.band === 'never' ? { ...band, count: 0, bytes: 0 } : band))
    render(<InactiveDrivesSection overview={withAttention({ inactive: { ...baseAttention.inactive, bands } })} />)
    expect(screen.getByText('3–4 years')).toBeInTheDocument()
    expect(screen.getByText('4–5 years')).toBeInTheDocument()
    expect(screen.getByText('More than 5 years')).toBeInTheDocument()
    expect(screen.getByText('6 inactive OneDrives, by time since the last activity')).toBeInTheDocument()
    expect(screen.queryByText('No activity recorded')).not.toBeInTheDocument()
  })

  it('tints the inactive OneDrive bands in OneDrive blue, like every other OneDrive list', () => {
    render(<InactiveDrivesSection overview={base} />)
    const bars = screen
      .getByRole('list', { name: 'How long the inactive OneDrives have been inactive' })
      .querySelectorAll<HTMLElement>('[data-slot="facet-bar"]')
    expect(bars).toHaveLength(4)
    bars.forEach((bar) => expect(bar.style.background).toContain(rgb('#0364b8')))
  })

  it('says no OneDrive is inactive instead of drawing empty bars', () => {
    const bands = baseAttention.inactive.bands.map((band) => ({ ...band, count: 0, bytes: 0 }))
    render(<InactiveDrivesSection overview={withAttention({ inactive: { count: 0, bytes: 0, bands } })} />)
    expect(screen.getByText('No live OneDrive has gone 3 years without activity.')).toBeInTheDocument()
  })

  it('colours the deleted card like the Deleted but still billing card above it, and the uncharged inactive one apart', () => {
    render(<InactiveDrivesSection overview={withAttention({})} />)
    expect((card('Inactive OneDrives') as HTMLElement).style.borderLeftColor).toBe(rgb(P365.blue))
    const deleted = { ...base, oneDrive: { ...base.oneDrive, deletedButBilling: { bytes: 5, count: 1 } } }
    cleanup()
    render(<InactiveDrivesSection overview={deleted} />)
    expect((card('Deleted, under retention') as HTMLElement).style.borderLeftColor).toBe(rgb(P365.yellow))
  })
})
