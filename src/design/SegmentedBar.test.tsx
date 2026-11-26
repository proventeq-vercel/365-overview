import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { SegmentedBar, type BarRow, type BarSegment } from './SegmentedBar'

afterEach(cleanup)

const segment = (id: string, label: string, share: number, color = '#34a1a0'): BarSegment => ({
  id,
  label,
  color,
  share,
  value: '1 TB',
  shareLabel: '50% of stored',
  description: `${label} explained`,
})

const row = (id: string, label: string, scale: number, segments: BarSegment[]): BarRow => ({
  id,
  label,
  color: '#038387',
  value: '2 TB',
  caption: '80% of stored',
  description: `${label} row explained`,
  scale,
  segments,
})

const storage = row('storage', 'Storage', 1, [segment('files', 'Files', 0.75), segment('teams', 'Teams', 0.25, '#5b5fc7')])
const drives = row('drives', 'Drives', 0.25, [segment('drives', 'Drives', 1)])

function renderBar(rows: BarRow[] = [storage]) {
  const view = render(
    <>
      <SegmentedBar ariaLabel="Storage usage" rows={rows} />
      <p>Outside</p>
    </>,
  )
  const part = (name: string) => within(screen.getByRole('list', { name: 'Storage' })).getByRole('button', { name: new RegExp(name) })
  return { ...view, part }
}

const popover = (name: string) => screen.queryByRole('dialog', { name })

describe('SegmentedBar', () => {
  it('lists one entry per row, each headed by its label, size and caption', () => {
    renderBar([storage, drives])
    const rows = within(screen.getByRole('list', { name: 'Storage usage' })).getAllByRole('listitem')
    expect(rows.filter((item) => item.parentElement?.getAttribute('aria-label') === 'Storage usage')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Drives2 TB80% of stored' })).toBeInTheDocument()
  })

  it('draws each row against the largest one', () => {
    const { container } = renderBar([storage, drives])
    const bars = [...container.querySelectorAll<HTMLElement>('[data-bar-scale]')]
    expect(bars.map((bar) => bar.style.width)).toEqual(['100%', '25%'])
  })

  it('keeps a row too small to see at its width as a visible sliver, and draws nothing for no storage', () => {
    const { container } = renderBar([
      storage,
      row('tiny', 'Tiny', 0.0000003, [segment('tiny', 'Tiny', 1)]),
      row('empty', 'Empty', 0, [segment('empty', 'Empty', 1)]),
    ])
    const [, tiny, empty] = [...container.querySelectorAll<HTMLElement>('[data-bar-scale]')]
    expect(tiny).toHaveClass('min-w-1')
    expect(empty).not.toHaveClass('min-w-1')
  })

  it('sizes the parts of a row by their share and draws each in its own colour', () => {
    const { container } = renderBar()
    const parts = [...container.querySelectorAll<HTMLElement>('[data-segment]')]
    expect(parts.map((part) => [part.dataset.segment, part.style.background, part.style.flexGrow])).toEqual([
      ['files', 'rgb(52, 161, 160)', '0.75'],
      ['teams', 'rgb(91, 95, 199)', '0.25'],
    ])
  })

  it('leaves a part with no share off the bar but keeps it in the list', () => {
    const { container } = renderBar([row('storage', 'Storage', 1, [segment('files', 'Files', 1), segment('teams', 'Teams', 0)])])
    expect([...container.querySelectorAll<HTMLElement>('[data-segment]')].map((part) => part.dataset.segment)).toEqual(['files'])
    expect(within(screen.getByRole('list', { name: 'Storage' })).getAllByRole('button')).toHaveLength(2)
  })

  it('lists the parts of a row only when it has more than one', () => {
    renderBar([storage, drives])
    expect(screen.getByRole('list', { name: 'Storage' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Drives' })).not.toBeInTheDocument()
  })

  it('explains a row in a popover when its header is selected', async () => {
    const user = userEvent.setup()
    renderBar([storage, drives])
    await user.click(screen.getByRole('button', { name: /^Drives/ }))
    expect(await screen.findByRole('dialog', { name: 'Drives' })).toHaveTextContent('Drives row explained')
  })

  it('writes the row caption and the share of each part in the grey text shade', () => {
    renderBar([storage, drives])
    expect(screen.getAllByText('80% of stored').every((caption) => caption.classList.contains('text-p365-grey-text'))).toBe(true)
    expect(screen.getAllByText('50% of stored').every((share) => share.classList.contains('text-p365-grey-text'))).toBe(true)
  })

  it('writes the popover value in the text shade of its colour', async () => {
    const user = userEvent.setup()
    const { part } = renderBar()
    await user.click(part('Files'))
    const dialog = await screen.findByRole('dialog', { name: 'Files' })
    expect(within(dialog).getByText('1 TB')).toHaveStyle({ color: '#267574' })
  })

  it('closes a clicked part when the pointer moves on to another, so one popover shows', async () => {
    const user = userEvent.setup()
    const { part } = renderBar()
    await user.click(part('Files'))
    expect(await screen.findByRole('dialog', { name: 'Files' })).toBeInTheDocument()

    await user.hover(part('Teams'))
    expect(await screen.findByRole('dialog', { name: 'Teams' })).toBeInTheDocument()
    await waitFor(() => expect(popover('Files')).not.toBeInTheDocument())
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('keeps a clicked part open until Escape', async () => {
    const user = userEvent.setup()
    const { part } = renderBar()
    await user.click(part('Files'))
    expect(await screen.findByRole('dialog', { name: 'Files' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(popover('Files')).not.toBeInTheDocument())
  })

  it('closes a clicked part on a click outside', async () => {
    const user = userEvent.setup()
    const { part } = renderBar()
    await user.click(part('Teams'))
    expect(await screen.findByRole('dialog', { name: 'Teams' })).toBeInTheDocument()
    await user.click(screen.getByText('Outside'))
    await waitFor(() => expect(popover('Teams')).not.toBeInTheDocument())
  })
})
