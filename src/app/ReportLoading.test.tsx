import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { render } from '@/test/render'
import { ReportLoading } from './ReportLoading'

function checklistStates() {
  return within(screen.getByRole('status'))
    .getAllByRole('listitem')
    .map((item) => [item.textContent, item.dataset.state])
}

describe('ReportLoading', () => {
  it('lays the stage card over the report skeleton', () => {
    render(<ReportLoading stage="loadingReport" signsIn />)
    expect(screen.getByLabelText('Loading report')).toHaveAttribute('aria-busy', 'true')
    const card = screen.getByRole('status')
    expect(card).toHaveTextContent('Loading')
    expect(card).toHaveTextContent('Building your storage report')
    expect(card).toHaveTextContent('This usually takes under a minute')
  })

  it('ticks off the stages before the current one when the app signs in', () => {
    render(<ReportLoading stage="signingIn" signsIn />)
    expect(checklistStates()).toEqual([
      ['Prepare sign-in', 'done'],
      ['Sign in to Microsoft 365', 'active'],
      ['Read SharePoint and OneDrive usage', 'pending'],
    ])
  })

  it('names only the report step when there is no sign-in to show', () => {
    render(<ReportLoading stage="loadingReport" signsIn={false} />)
    expect(within(screen.getByRole('status')).queryByRole('list')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Reading SharePoint and OneDrive usage…')
  })
})
