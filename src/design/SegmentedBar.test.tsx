import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { SegmentedBar, type BarSegment } from './SegmentedBar'

afterEach(cleanup)

const segment = (id: string, label: string): BarSegment => ({
  id,
  label,
  color: '#34a1a0',
  share: 0.5,
  value: '1 TB',
  shareLabel: null,
  description: `${label} explained`,
})

function renderBar() {
  render(
    <>
      <SegmentedBar ariaLabel="Storage usage" segments={[segment('files', 'Files'), segment('teams', 'Teams')]} />
      <p>Outside</p>
    </>,
  )
  const part = (name: string) => screen.getByRole('button', { name: new RegExp(name) })
  return { part }
}

const popover = (name: string) => screen.queryByRole('dialog', { name })

describe('SegmentedBar', () => {
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
