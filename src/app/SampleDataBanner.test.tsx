import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { SampleDataBanner } from './SampleDataBanner'

afterEach(cleanup)

const SAMPLE = /Sample data: this is a fictional tenant, not yours/

describe('SampleDataBanner', () => {
  it('stays out of the way on live data', () => {
    render(<SampleDataBanner env={{ useMock: false, overrides: {} }} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('says the report is sample data when the build runs on fixtures', () => {
    render(<SampleDataBanner env={{ useMock: true, overrides: {} }} />)
    expect(screen.getByRole('status')).toHaveTextContent(SAMPLE)
    expect(screen.queryByRole('link', { name: 'Reset the modes for this tab' })).not.toBeInTheDocument()
  })

  it('offers the way back to live data when the URL switched the tab to fixtures', () => {
    render(<SampleDataBanner env={{ useMock: true, overrides: { useMock: 'true' } }} />)
    expect(screen.getByRole('status')).toHaveTextContent(SAMPLE)
    expect(screen.getByRole('link', { name: 'Reset the modes for this tab' })).toHaveAttribute('href', '?modes=reset')
  })
})
