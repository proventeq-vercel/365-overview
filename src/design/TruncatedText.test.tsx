import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { TruncatedText } from './TruncatedText'

const LONG_NAME = 'Global Procurement and Vendor Management Programme Office – EMEA Regional Collaboration Workspace'

function layout(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth)
}

const tooltip = () => document.querySelector('[data-slot="tooltip-content"]')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('TruncatedText', () => {
  it('cuts the name with an ellipsis inside its box', () => {
    layout(120, 120)
    render(<TruncatedText text={LONG_NAME} />)
    expect(screen.getByText(LONG_NAME)).toHaveClass('truncate', 'min-w-0', 'block')
  })

  it('adds no tab stop and no tooltip when the name fits', async () => {
    layout(120, 120)
    const user = userEvent.setup()
    render(<TruncatedText text={LONG_NAME} />)
    const name = screen.getByText(LONG_NAME)
    expect(name).not.toHaveAttribute('tabindex')
    await user.hover(name)
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(tooltip()).toBeNull()
  })

  it('shows the full name on focus when it is cut short', async () => {
    layout(640, 120)
    const user = userEvent.setup()
    render(<TruncatedText text={LONG_NAME} />)
    const name = screen.getByText(LONG_NAME)
    expect(name).toHaveAttribute('tabindex', '0')
    await user.tab()
    expect(name).toHaveFocus()
    await waitFor(() => expect(tooltip()).toHaveTextContent(LONG_NAME))
  })

  it('shows the full name on hover when it is cut short', async () => {
    layout(640, 120)
    const user = userEvent.setup()
    render(<TruncatedText text={LONG_NAME} />)
    await user.hover(screen.getByText(LONG_NAME))
    await waitFor(() => expect(tooltip()).toHaveTextContent(LONG_NAME))
  })
})
