import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { ReportHeading } from './ReportHeading'

afterEach(cleanup)

describe('ReportHeading', () => {
  it('titles the report and dates its data in the page date format', () => {
    render(<ReportHeading title="Storage" description="What is stored." reportRefreshDate="2026-08-30" />)
    expect(screen.getByRole('heading', { name: 'Storage', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Data as of 30 Aug 2026\./)).toBeInTheDocument()
  })

  it('leaves the date sentence out when the report carries no date, instead of "Data as of ."', () => {
    render(<ReportHeading title="Storage" description="What is stored." reportRefreshDate="" />)
    expect(screen.getByText(/What is stored\./)).not.toHaveTextContent('Data as of')
  })
})
