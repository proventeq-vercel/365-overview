import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { base } from '@/features/storageOptimization/testFixtures'
import { OneDriveKpiCards } from './OneDriveKpiCards'

afterEach(cleanup)

const usedCard = () => screen.getByText('OneDrive storage').closest('[data-slot="stat-card"]')!

describe('OneDriveKpiCards', () => {
  it('names the account report as the source of the OneDrive total when the trend lists no day', () => {
    render(<OneDriveKpiCards overview={{ ...base, oneDrive: { ...base.oneDrive, usedFromAccountReport: true } }} />)
    expect(usedCard()).toHaveTextContent("The total of Microsoft's OneDrive usage report, which lists every OneDrive.")
  })

  it('keeps the tenant-wide wording when the trend gives the total', () => {
    render(<OneDriveKpiCards overview={base} />)
    expect(usedCard()).toHaveTextContent('Tenant-wide, as reported by Microsoft 365')
  })

  it('leaves the over-licence card out, never Unknown, when nothing gives a limit to measure against', () => {
    render(<OneDriveKpiCards overview={{ ...base, oneDrive: { ...base.oneDrive, overEntitlement: null } }} />)
    expect(screen.queryByText(/^Over /)).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="stat-card"]')).toHaveLength(4)
    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument()
  })
})
