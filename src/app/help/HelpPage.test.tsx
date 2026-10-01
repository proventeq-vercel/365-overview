import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/render'
import { HelpPage } from './HelpPage'

const CONSENT_URL =
  'https://login.microsoftonline.com/organizations/adminconsent?client_id=0cedd025-e545-44f2-b3f8-82969e56547a'

const CLIENT_ID = '84e24db0-8904-41f8-8556-14a2b6863b1a'

function openHelp(path: string, mode: 'delegated' | 'application', consentUrl: string | null = null) {
  window.history.replaceState(null, '', path)
  render(<HelpPage mode={mode} consentUrl={consentUrl} clientId={CLIENT_ID} />)
}

const steps = () => screen.getByRole('heading', { name: 'Steps', level: 2 }).nextElementSibling as HTMLElement

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  window.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('HelpPage', () => {
  it('opens on the overview inside the app header, leading back to the report', () => {
    openHelp('/help', 'delegated')
    expect(screen.getByRole('heading', { level: 1, name: 'Proventeq 365 storage report help' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveTextContent('Help centre')
    expect(screen.getByRole('link', { name: 'Open the report' })).toHaveAttribute('href', '/')
  })

  it('shows a delegated site only the delegated steps, marked as this site', () => {
    openHelp('/help/getting-started/enable-access', 'delegated')
    const group = screen.getByRole('group', { name: 'Setup shown on this page' })
    expect(group).toHaveTextContent('Showing: Delegated permissionsThis site')
    expect(steps()).toHaveTextContent('Reports Reader, Global Reader, SharePoint Administrator or Global Administrator')
    expect(screen.queryByText(/Get your tenant switched on/)).not.toBeInTheDocument()
  })

  it('shows an application site only the application steps', () => {
    openHelp('/help/getting-started/enable-access', 'application')
    expect(screen.getByRole('group', { name: 'Setup shown on this page' })).toHaveTextContent(
      'Showing: Application permissionsThis site',
    )
    expect(steps()).toHaveTextContent('If Proventeq limits the report to named tenants, it adds yours.')
    expect(steps()).toHaveTextContent('New-MgServicePrincipalAppRoleAssignment')
    expect(screen.queryByText(/Give readers a reporting role/)).not.toBeInTheDocument()
  })

  it('switches to the other mode on request, without this site’s consent link', async () => {
    openHelp('/help/getting-started/enable-access', 'delegated', CONSENT_URL)
    expect(screen.getByRole('link', { name: 'Grant admin consent for this site' })).toHaveAttribute('href', CONSENT_URL)
    await userEvent.click(screen.getByRole('link', { name: 'Show Application permissions' }))
    expect(screen.getByRole('group', { name: 'Setup shown on this page' })).toHaveTextContent(
      'Showing: Application permissions',
    )
    expect(steps()).toHaveTextContent('Get your tenant switched on')
    expect(screen.queryByRole('link', { name: 'Grant admin consent for this site' })).not.toBeInTheDocument()
    expect(screen.getByText(/Proventeq can also send it to you/)).toBeInTheDocument()
  })

  it('shows no consent link when the site cannot build one', () => {
    openHelp('/help/getting-started/enable-access', 'delegated')
    expect(screen.queryByRole('link', { name: 'Grant admin consent for this site' })).not.toBeInTheDocument()
  })

  it('marks only Reports.Read.All as required', () => {
    openHelp('/help/getting-started/permissions', 'delegated')
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell').slice(0, 2).map((cell) => cell.textContent))).toEqual([
      ['Reports.Read.All', 'Required'],
      ['Organization.Read.All', 'Optional'],
      ['Sites.Read.All', 'Optional'],
    ])
  })

  it('names each failure screen by the heading the user saw', () => {
    openHelp('/help/getting-started/troubleshooting', 'application')
    for (const title of [
      'Your organisation has not approved this app yet',
      'This tenant is not enabled for the report yet',
      'Your account cannot read usage reports',
      'Your account is not allowed to use this app',
      'Sign-in failed',
      'Sites are listed by an id instead of a name',
    ]) {
      expect(screen.getByRole('heading', { name: title, level: 2 })).toBeInTheDocument()
    }
  })

  it('shows how to limit the report to assigned groups, naming this site’s app', () => {
    openHelp('/help/getting-started/limit-access', 'application')
    expect(steps()).toHaveTextContent(`Application ID: ${CLIENT_ID}`)
    expect(steps()).toHaveTextContent('set Assignment required to Yes')
    expect(steps()).toHaveTextContent('add the groups or users who may open the report')
  })

  it('does not name this site’s app id in the other mode’s steps', async () => {
    openHelp('/help/getting-started/limit-access', 'application')
    await userEvent.click(screen.getByRole('link', { name: 'Show Delegated permissions' }))
    expect(steps()).not.toHaveTextContent(CLIENT_ID)
    expect(steps()).toHaveTextContent('after client_id=')
  })
})
