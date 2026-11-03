import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { FacetBars } from './charts'
import { Legend } from './primitives'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const GB = 1_073_741_824

describe('FacetBars', () => {
  it('draws each bar relative to the largest item and prints the formatted value', () => {
    render(
      <FacetBars
        items={[
          { name: 'engineering', value: 200 * GB },
          { name: 'team-1', value: 50 * GB },
        ]}
        formatValue={(v) => `${v / GB} GB`}
        emptyText="No results"
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    const fills = rows.map((row) => (row.querySelector('[aria-hidden]') as HTMLElement).style.width)
    expect(fills).toEqual(['100%', '25%'])
    expect(rows[0]).toHaveTextContent('engineering')
    expect(rows[0]).toHaveTextContent('200 GB')
  })

  it('renders two sites that share a display name as two distinct rows, without a key clash', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <FacetBars
        items={[
          { name: 'Bill Gates', value: 200 },
          { name: 'Bill Gates', value: 100 },
        ]}
        formatValue={String}
        emptyText="No results"
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('tints a bar with its colour and a solid left edge, and leaves an uncoloured bar on the facet cycle', () => {
    render(
      <FacetBars
        items={[
          { name: 'coloured', value: 200, color: '#5b5fc7' },
          { name: 'plain', value: 100 },
        ]}
        formatValue={String}
        emptyText="No results"
      />,
    )
    const [coloured, plain] = screen
      .getAllByRole('listitem')
      .map((row) => row.querySelector('[aria-hidden]') as HTMLElement)
    expect(coloured).toHaveAttribute('data-color', '#5b5fc7')
    expect(coloured.style.borderLeft).toBe('3px solid rgb(91, 95, 199)')
    expect(coloured.style.background).toContain('color-mix')
    expect(plain).not.toHaveAttribute('data-color')
    expect(plain.style.borderLeft).toBe('')
  })

  it('shows the full name of a cut-short name on focus', async () => {
    const longName = 'Global Procurement and Vendor Management Programme Office – EMEA Regional Collaboration Workspace'
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(640)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(120)
    const user = userEvent.setup()
    render(<FacetBars items={[{ name: longName, value: 5 }]} formatValue={String} emptyText="No results" />)
    await user.tab()
    expect(document.querySelector('[data-slot="tooltip-trigger"]')).toHaveFocus()
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent(longName),
    )
  })

  it('shows the empty text instead of an empty list', () => {
    render(<FacetBars items={[]} formatValue={String} emptyText="No results" />)
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})

describe('Legend', () => {
  it('lists two slices that share a name without a key clash', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Legend
        items={[
          { name: 'Bill Gates', color: '#000' },
          { name: 'Bill Gates', color: '#111' },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
