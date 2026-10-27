import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@/test/render'
import type * as EnvModule from '@/config/env'
import { FeatureFlags } from '@/config/featureFlags'
import { OneDrivePoolPanel } from './OneDrivePoolPanel'
import { base } from './testFixtures'

const GB = 1_073_741_824

const features = vi.hoisted(() => ({ oneDrive: true }))

vi.mock('@/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof EnvModule>()
  return {
    ...actual,
    env: {
      ...actual.env,
      get features() {
        return new Set(features.oneDrive ? [FeatureFlags.OptimizationStorageReportOneDrive] : [])
      },
    },
  }
})

afterEach(cleanup)

const renderPanel = (overview = base) =>
  render(
    <MemoryRouter>
      <OneDrivePoolPanel overview={overview} />
    </MemoryRouter>,
  )

describe('OneDrivePoolPanel', () => {
  it('names the inactive, deleted and unlicensed OneDrive storage apart, never as one total', () => {
    features.oneDrive = true
    renderPanel()
    expect(screen.getByText(/inactive OneDrives hold 30 GB, deleted ones under retention 0 B, and those of owners without a OneDrive licence 40 GB \(1 owner inferred from not being in Microsoft's licence report\)\./)).toBeInTheDocument()
  })

  it('links to the OneDrive report when it is switched on', () => {
    features.oneDrive = true
    renderPanel()
    expect(screen.getByRole('link', { name: 'See the OneDrive report' })).toHaveAttribute('href', '/onedrive-usage')
  })

  it('offers no link to a OneDrive report that is switched off', () => {
    features.oneDrive = false
    renderPanel()
    expect(screen.queryByRole('link', { name: 'See the OneDrive report' })).not.toBeInTheDocument()
  })

  it('names the OneDrives quiet for 93 days in place of the unlicensed ones when the licence report is missing', () => {
    features.oneDrive = true
    const unlicensed = { basis: 'noActivity', count: 5, bytes: 25 * GB, days: 93, since: '2026-05-29' } as const
    renderPanel({ ...base, oneDrive: { ...base.oneDrive, attention: { ...base.oneDrive.attention, unlicensed } } })
    expect(
      screen.getByText(/and those with no activity for 93 days 25 GB\. Microsoft's active-user report did not come back or matched none of the owners, so the quiet ones stand in for the owners without a licence\./),
    ).toBeInTheDocument()
    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument()
  })
})
