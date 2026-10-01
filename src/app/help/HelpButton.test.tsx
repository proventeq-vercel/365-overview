import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { HelpButton } from './HelpButton'

afterEach(cleanup)

describe('HelpButton', () => {
  it('is a small question mark named after the topic', () => {
    render(<HelpButton topic="tenantCapacity" />)
    const button = screen.getByRole('button', { name: 'About Tenant capacity' })
    expect(button).toHaveTextContent('?')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('explains the topic from its help page and links to the full page in a new tab', async () => {
    render(<HelpButton topic="tenantCapacity" />)
    await userEvent.click(screen.getByRole('button', { name: 'About Tenant capacity' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tenant capacity' })
    expect(dialog).toHaveTextContent(
      'The four cards for what archiving inactive sites would save, what growth beyond the entitlement costs, and when the entitlement runs out.',
    )
    const seeMore = within(dialog).getByRole('link', { name: 'See more' })
    expect(seeMore).toHaveAttribute('href', '/help/reports/storage-optimisation/tenant-capacity')
    expect(seeMore).toHaveAttribute('target', '_blank')
    expect(seeMore).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
