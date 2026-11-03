import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { TruncatedText } from './TruncatedText'

const LONG_NAME = 'Global Procurement and Vendor Management Programme Office – EMEA Regional Collaboration Workspace'

function layout(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth)
}

const popup = () => document.querySelector('[data-slot="popover-content"]')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function stubResizeObserver() {
  const observed: { target: Element; callback: () => void }[] = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: () => void
      constructor(callback: () => void) {
        this.callback = callback
      }
      observe(target: Element) {
        observed.push({ target, callback: this.callback })
      }
      unobserve() {}
      disconnect() {}
    },
  )
  return (element: Element) =>
    act(() => observed.filter((entry) => entry.target === element).forEach((entry) => entry.callback()))
}

describe('TruncatedText', () => {
  it('cuts the name with an ellipsis inside its box', () => {
    layout(120, 120)
    render(<TruncatedText text={LONG_NAME} />)
    expect(screen.getByText(LONG_NAME)).toHaveClass('truncate', 'min-w-0', 'block')
  })

  it('adds no button and no popover when the name fits', async () => {
    layout(120, 120)
    const user = userEvent.setup()
    render(<TruncatedText text={LONG_NAME} />)
    const name = screen.getByText(LONG_NAME)
    expect(screen.queryByRole('button')).toBeNull()
    expect(name).not.toHaveAttribute('tabindex')
    await user.hover(name)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(popup()).toBeNull()
  })

  it('shows the full name on keyboard focus when it is cut short', async () => {
    layout(640, 120)
    const user = userEvent.setup()
    render(<TruncatedText text={LONG_NAME} />)
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    await waitFor(() => expect(popup()).toHaveTextContent(LONG_NAME))
    expect(screen.getByRole('button')).toHaveFocus()
  })

  it('shows the full name on hover when it is cut short', async () => {
    layout(640, 120)
    const user = userEvent.setup()
    render(<TruncatedText text={LONG_NAME} />)
    await user.hover(screen.getByRole('button'))
    await waitFor(() => expect(popup()).toHaveTextContent(LONG_NAME))
  })

  it('shows the full name on click or tap when it is cut short', async () => {
    layout(640, 120)
    const user = userEvent.setup()
    render(<TruncatedText text={LONG_NAME} />)
    expect(popup()).toBeNull()
    await user.click(screen.getByRole('button'))
    await waitFor(() => expect(popup()).toHaveTextContent(LONG_NAME))
  })

  it('closes the full name when focus leaves', async () => {
    layout(640, 120)
    const user = userEvent.setup()
    render(<TruncatedText text={LONG_NAME} />)
    await user.tab()
    await waitFor(() => expect(popup()).not.toBeNull())
    await user.tab()
    await waitFor(() => expect(popup()).toBeNull())
  })

  it('measures again when its box is resized', () => {
    const resize = stubResizeObserver()
    layout(120, 120)
    render(<TruncatedText text={LONG_NAME} />)
    const name = screen.getByText(LONG_NAME)
    expect(screen.queryByRole('button')).toBeNull()
    layout(640, 120)
    resize(name)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('measures again when the name changes', () => {
    layout(120, 120)
    const { rerender } = render(<TruncatedText text="Finance" />)
    layout(640, 120)
    rerender(<TruncatedText text={LONG_NAME} />)
    expect(screen.getByRole('button')).toHaveTextContent(LONG_NAME)
  })

  it('measures again once the web fonts have loaded', async () => {
    let fontsLoaded = () => {}
    const ready = new Promise<void>((resolve) => {
      fontsLoaded = resolve
    })
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } })
    onTestFinished(() => {
      Reflect.deleteProperty(document, 'fonts')
    })
    layout(120, 120)
    render(<TruncatedText text={LONG_NAME} />)
    expect(screen.queryByRole('button')).toBeNull()
    layout(640, 120)
    await act(async () => fontsLoaded())
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
