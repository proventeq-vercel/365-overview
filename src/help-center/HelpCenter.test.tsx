import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createHelpCatalogue } from './catalogue'
import { HelpCenter } from './HelpCenter'

const catalogue = createHelpCatalogue(
  {
    'index.md': '---\ntitle: Help home\nnav: Overview\ndescription: Start here.\nsection: start\norder: 0\n---\nRead [setup](setup.md#steps).',
    'setup.md': [
      '---',
      'title: Set it up',
      'nav: Setup',
      'description: How to enable it.',
      'section: start',
      'order: 1',
      '---',
      '## Steps',
      '::: audience delegated',
      'Assign Reports Reader.',
      ':::',
      '::: audience application',
      'Approve the app at {{consentUrl}}.',
      ':::',
      '## Afterwards',
      'See the [settings](reference/settings.md).',
    ].join('\n'),
    'reference/settings.md': '---\ntitle: Settings\ndescription: Every option.\nsection: reference\norder: 0\n---\n## Currency\nPick one.',
  },
  [
    { id: 'start', label: 'Get started' },
    { id: 'reference', label: 'Reference' },
  ],
)

const AUDIENCES = [
  { id: 'delegated', label: 'Delegated permissions' },
  { id: 'application', label: 'Application permissions' },
]

const variables = (audience: string) => (audience === 'application' ? { consentUrl: 'https://consent.example' } : {})

function open(path: string, defaultAudience = 'delegated') {
  window.history.replaceState(null, '', path)
  return render(
    <HelpCenter
      catalogue={catalogue}
      basePath="/help"
      audiences={AUDIENCES}
      defaultAudience={defaultAudience}
      variables={variables}
      header={<header>Host header</header>}
    />,
  )
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('HelpCenter', () => {
  it('renders the page the address names, with its title, lead and the host header', () => {
    open('/help/reference/settings')
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Every option.')).toBeInTheDocument()
    expect(screen.getByText('Host header')).toBeInTheDocument()
    expect(document.title).toBe('Settings · Help')
  })

  it('lists every page under its section and marks the current one', () => {
    open('/help/setup')
    const nav = screen.getByRole('navigation', { name: 'Help topics' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Overview', 'Setup', 'Settings'])
    expect(within(nav).getByRole('link', { name: 'Setup' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows breadcrumbs, the page outline and the next page', () => {
    open('/help/setup')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('HelpGet startedSetup')
    const outline = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(outline).getByRole('link', { name: 'Afterwards' })).toHaveAttribute('href', '/help/setup#afterwards')
    const pager = screen.getByRole('navigation', { name: 'More help' })
    expect(within(pager).getByRole('link', { name: /Next\s*Settings/ })).toHaveAttribute('href', '/help/reference/settings')
    expect(within(pager).getByRole('link', { name: /Previous\s*Overview/ })).toHaveAttribute('href', '/help')
  })

  it('follows a markdown link without reloading the page', async () => {
    open('/help')
    await userEvent.click(screen.getByRole('link', { name: 'setup' }))
    expect(window.location.pathname).toBe('/help/setup')
    expect(window.location.hash).toBe('#steps')
    expect(screen.getByRole('heading', { level: 1, name: 'Set it up' })).toBeInTheDocument()
  })

  it('goes back to the previous page on browser back', async () => {
    open('/help')
    await userEvent.click(screen.getByRole('link', { name: 'Setup' }))
    window.history.back()
    expect(await screen.findByRole('heading', { level: 1, name: 'Help home' })).toBeInTheDocument()
  })

  it('shows only the default audience’s steps and offers the other one', () => {
    open('/help/setup')
    expect(screen.getByText('Assign Reports Reader.')).toBeInTheDocument()
    expect(screen.queryByText(/Approve the app/)).not.toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Setup shown on this page' })
    expect(group).toHaveTextContent('Showing: Delegated permissionsThis site')
    expect(within(group).getByRole('link', { name: 'Show Application permissions' })).toHaveAttribute(
      'href',
      '/help/setup?audience=application',
    )
  })

  it('switches the page to the other audience, fills its variables and keeps it while browsing', async () => {
    open('/help/setup')
    await userEvent.click(screen.getByRole('link', { name: 'Show Application permissions' }))
    expect(window.location.search).toBe('?audience=application')
    expect(screen.getByText(/Approve the app at/)).toHaveTextContent('Approve the app at https://consent.example.')
    expect(screen.queryByText('Assign Reports Reader.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Show Delegated permissions (this site)' })).toHaveAttribute('href', '/help/setup')
    expect(screen.getByRole('link', { name: 'settings' })).toHaveAttribute('href', '/help/reference/settings?audience=application')
  })

  it('does not offer the audience switch on a page that is the same for everyone', () => {
    open('/help/reference/settings')
    expect(screen.queryByRole('group', { name: 'Setup shown on this page' })).not.toBeInTheDocument()
  })

  it('searches the help and opens a result', async () => {
    open('/help')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search help' }), 'currency')
    const results = await screen.findByRole('list', { name: 'Search results' })
    await userEvent.click(within(results).getByRole('link', { name: /Settings/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search help' })).toHaveValue('')
  })

  it('says so when nothing matches the search', async () => {
    open('/help')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search help' }), 'sharks')
    expect(await screen.findByText('Nothing in the help matches “sharks”.')).toBeInTheDocument()
  })

  it('focuses the search on slash', async () => {
    open('/help')
    await userEvent.keyboard('/')
    expect(screen.getByRole('searchbox', { name: 'Search help' })).toHaveFocus()
  })

  it('opens the topic list on slash when it is hidden on a small screen, then focuses the search', async () => {
    const drawer = document.createElement('style')
    drawer.textContent = '.hc-sidebar { visibility: hidden } .hc-sidebar-open { visibility: visible }'
    document.head.append(drawer)
    try {
      open('/help')
      await userEvent.keyboard('/')
      expect(screen.getByRole('button', { name: 'Browse help' })).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('searchbox', { name: 'Search help' })).toHaveFocus()
    } finally {
      drawer.remove()
    }
  })

  it('closes the topic list on Escape', async () => {
    open('/help')
    const toggle = screen.getByRole('button', { name: 'Browse help' })
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    screen.getByRole('searchbox', { name: 'Search help' }).focus()
    await userEvent.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('hands focus back to the toggle when a topic picked from the open list closes it', async () => {
    open('/help')
    const toggle = screen.getByRole('button', { name: 'Browse help' })
    await userEvent.click(toggle)
    within(screen.getByRole('navigation', { name: 'Help topics' })).getByRole('link', { name: 'Settings' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(toggle).toHaveFocus()
  })

  it('hands focus back to the toggle without scrolling the page', async () => {
    open('/help')
    const toggle = screen.getByRole('button', { name: 'Browse help' })
    await userEvent.click(toggle)
    const focus = vi.spyOn(toggle, 'focus')
    await userEvent.keyboard('{Escape}')
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('hands focus back to the toggle when the backdrop closes the topic list', async () => {
    const { container } = open('/help')
    const toggle = screen.getByRole('button', { name: 'Browse help' })
    await userEvent.click(toggle)
    screen.getByRole('searchbox', { name: 'Search help' }).focus()
    await userEvent.click(container.querySelector('.hc-backdrop') as HTMLElement)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('keeps the topic list open on an Escape that only cancels an input-method composition', async () => {
    open('/help')
    const toggle = screen.getByRole('button', { name: 'Browse help' })
    await userEvent.click(toggle)
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('leaves focus where it is on Escape when the topic list is already closed', async () => {
    open('/help')
    const search = screen.getByRole('searchbox', { name: 'Search help' })
    search.focus()
    await userEvent.keyboard('{Escape}')
    expect(search).toHaveFocus()
  })

  it.each([
    ['Ctrl', '{Control>}/{/Control}'],
    ['Cmd', '{Meta>}/{/Meta}'],
    ['Alt', '{Alt>}/{/Alt}'],
  ])('leaves a browser shortcut such as %s+/ alone', async (_name, keys) => {
    open('/help')
    await userEvent.keyboard(keys)
    expect(screen.getByRole('searchbox', { name: 'Search help' })).not.toHaveFocus()
  })

  it('still focuses the search when / is typed with AltGr, which Windows reports as Ctrl+Alt', async () => {
    open('/help')
    await userEvent.keyboard('{Control>}{Alt>}/{/Alt}{/Control}')
    expect(screen.getByRole('searchbox', { name: 'Search help' })).toHaveFocus()
  })

  it('leaves the topic list closed on slash when the search is already on screen', async () => {
    open('/help')
    await userEvent.keyboard('/')
    expect(screen.getByRole('button', { name: 'Browse help' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows a way back for an address with no page', () => {
    open('/help/no-such-page')
    expect(screen.getByRole('heading', { level: 1, name: 'This help page does not exist' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the help overview' })).toHaveAttribute('href', '/help')
  })

  it('shows the missing page, not a blank screen, for an address with a malformed escape', () => {
    open('/help/%E0%A4%A#%E0')
    expect(screen.getByRole('heading', { level: 1, name: 'This help page does not exist' })).toBeInTheDocument()
  })

  it('opens and closes the topic list on small screens', async () => {
    open('/help')
    const toggle = screen.getByRole('button', { name: 'Browse help' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('link', { name: 'Settings' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
