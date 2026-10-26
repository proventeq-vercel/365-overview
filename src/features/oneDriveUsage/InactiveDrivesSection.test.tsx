import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import type * as EnvModule from '@/config/env'
import { FeatureFlags } from '@/config/featureFlags'
import type { StorageOverview } from '@/types/storage'
import { base } from '@/features/storageOptimization/testFixtures'
import { InactiveDrivesSection } from './InactiveDrivesSection'

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

const card = (label: string) => screen.getByText(label).closest('[data-slot="stat-card"]')!

const withAttention = (attention: Partial<StorageOverview['oneDrive']['attention']>): StorageOverview => ({
  ...base,
  oneDrive: { ...base.oneDrive, attention: { ...base.oneDrive.attention, ...attention } },
})

describe('InactiveDrivesSection', () => {
  it('shows inactive, deleted and unlicensed OneDrives as three cards, never one total', () => {
    render(<InactiveDrivesSection overview={base} />)
    expect(card('Inactive OneDrives')).toHaveTextContent('30 GB')
    expect(card('Inactive OneDrives')).toHaveTextContent('6 live OneDrives have had no activity since 2023-08-30')
    expect(card('Deleted, under retention')).toHaveTextContent('0 B')
    expect(card('Owner unlicensed')).toHaveTextContent('40 GB')
    expect(card('Owner unlicensed')).toHaveTextContent('2 live OneDrives belong to owners without a OneDrive licence')
    expect(screen.queryByText('70 GB')).not.toBeInTheDocument()
  })

  it('says unlicensed storage is billed only as Microsoft states, $0.05 per GB a month once archived with billing on', () => {
    render(<InactiveDrivesSection overview={base} />)
    expect(card('Owner unlicensed')).toHaveTextContent(
      'read-only after 60 days and archives it after 93; once billing for unlicensed OneDrives is on, archived storage costs $0.05 per GB a month',
    )
  })

  it('shows the unlicensed group as unknown, not zero, when the licence report could not be read', () => {
    render(<InactiveDrivesSection overview={withAttention({ unlicensed: null })} />)
    expect(card('Owner unlicensed')).toHaveTextContent('Unknown')
    expect(card('Owner unlicensed')).toHaveTextContent('not known which owners have a OneDrive licence')
  })

  it('bands the inactive OneDrives by years past the window, leaving out empty bands', () => {
    render(<InactiveDrivesSection overview={base} />)
    expect(screen.getByText('3–4 years')).toBeInTheDocument()
    expect(screen.getByText('4–5 years')).toBeInTheDocument()
    expect(screen.getByText('More than 5 years')).toBeInTheDocument()
    expect(screen.queryByText('No activity recorded')).not.toBeInTheDocument()
  })

  it('says no OneDrive is inactive instead of drawing empty bars', () => {
    const bands = base.oneDrive.attention.inactive.bands.map((band) => ({ ...band, count: 0, bytes: 0 }))
    render(<InactiveDrivesSection overview={withAttention({ inactive: { count: 0, bytes: 0, bands } })} />)
    expect(screen.getByText('No live OneDrive has gone 3 years without activity.')).toBeInTheDocument()
  })
})
