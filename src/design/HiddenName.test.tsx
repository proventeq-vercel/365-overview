import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { HiddenName } from './HiddenName'

afterEach(cleanup)

const SEED = '3f9a1c0b7e2d4a65'

describe('HiddenName', () => {
  it('is a focusable button named "Hidden name" that shows a blurred placeholder, never its seed', () => {
    const { container } = render(<HiddenName mask="hidden" seed={SEED} />)
    const standIn = screen.getByRole('button', { name: 'Hidden name' })
    expect(standIn).toHaveClass('select-none')
    expect(standIn.firstElementChild).toHaveClass('blur-[3px]')
    expect(standIn.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(standIn).toHaveTextContent(/^Lorem ipsum/)
    expect(container.innerHTML).not.toContain(SEED)
    standIn.focus()
    expect(standIn).toHaveFocus()
  })

  it('explains on click that the hide-names setting hid the name and how to show it', async () => {
    const user = userEvent.setup()
    render(<HiddenName mask="hidden" seed={SEED} />)
    await user.click(screen.getByRole('button', { name: 'Hidden name' }))
    const popover = await screen.findByRole('dialog', { name: 'Name hidden in this report' })
    expect(popover).toHaveTextContent('?hideNames=')
    expect(popover).not.toHaveTextContent(/Org settings/)
  })

  it('explains on hover that Microsoft concealed the name and where an admin turns it off', async () => {
    const user = userEvent.setup()
    render(<HiddenName mask="concealed" seed={SEED} />)
    await user.hover(screen.getByRole('button', { name: 'Hidden name' }))
    const popover = await screen.findByRole('dialog', { name: 'Name concealed by Microsoft' })
    expect(popover).toHaveTextContent(
      'Microsoft 365 admin centre → Settings → Org settings → Reports → uncheck "Display concealed user, group, and site names"',
    )
    expect(popover).not.toHaveTextContent('?hideNames=')
  })

  it('shows one explanation at a time across stand-ins', async () => {
    const user = userEvent.setup()
    render(
      <>
        <HiddenName mask="hidden" seed="a" />
        <HiddenName mask="hidden" seed="b" />
      </>,
    )
    const [first, second] = screen.getAllByRole('button', { name: 'Hidden name' })
    await user.click(first)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.hover(second)
    await waitFor(() => expect(second).toHaveAttribute('data-popup-open'))
    expect(first).not.toHaveAttribute('data-popup-open')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })
})
