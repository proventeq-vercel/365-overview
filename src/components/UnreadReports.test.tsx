import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMockDataSource } from '@/data/fixtures'
import { renderWithData } from '@/test/render'
import { UnreadReports } from './UnreadReports'

describe('UnreadReports', () => {
  it('says nothing when every report came back and the last load landed', () => {
    renderWithData(<UnreadReports reports={[]} notReloaded={null} />, createMockDataSource())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('says the page still shows the earlier load when the last reload failed without losing a named report', () => {
    renderWithData(<UnreadReports reports={[]} notReloaded={[]} />, createMockDataSource())
    expect(screen.getByRole('status')).toHaveTextContent(
      "The last reload of Microsoft's reports did not bring every report back, so this page still shows the earlier load.",
    )
  })

  it('names several reports in one sentence', () => {
    renderWithData(<UnreadReports reports={['sites', 'oneDriveTrend']} notReloaded={null} />, createMockDataSource())
    expect(screen.getByRole('status')).toHaveTextContent(
      "Microsoft's SharePoint site usage report and OneDrive storage trend did not come back this time, so the figures drawn from them are left out of this page. Refresh data asks for them again.",
    )
  })
})
