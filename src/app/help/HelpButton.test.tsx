import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { HelpButton } from './HelpButton'

afterEach(cleanup)

describe('HelpButton', () => {
  it('is a small question mark named after the topic', () => {
    render(<HelpButton topic="storageDistribution" />)
    const button = screen.getByRole('button', { name: 'About Current storage distribution' })
    expect(button).toHaveTextContent('?')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('explains the topic from its help page and links to the full page in a new tab', async () => {
    render(<HelpButton topic="storageDistribution" />)
    await userEvent.click(screen.getByRole('button', { name: 'About Current storage distribution' }))
    const dialog = await screen.findByRole('dialog', { name: 'Current storage distribution' })
    expect(dialog).toHaveTextContent(
      'Where storage sits today — every workload on one line against the SharePoint entitlement, and how SharePoint splits by site template.',
    )
    const seeMore = within(dialog).getByRole('link', { name: 'See more' })
    expect(seeMore).toHaveAttribute('href', '/help/reports/storage-optimisation/storage-distribution')
    expect(seeMore).toHaveAttribute('target', '_blank')
    expect(seeMore).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
