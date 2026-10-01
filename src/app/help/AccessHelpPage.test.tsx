import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { render } from '@/test/render'
import { AccessHelpPage } from './AccessHelpPage'

afterEach(cleanup)

const CONSENT_URL =
  'https://login.microsoftonline.com/organizations/adminconsent?client_id=0cedd025-e545-44f2-b3f8-82969e56547a'

const CLIENT_ID = '84e24db0-8904-41f8-8556-14a2b6863b1a'

function panelOf(title: string) {
  return screen.getByRole('heading', { name: title, level: 3 }).closest('div.rounded-lg') as HTMLElement
}

describe('AccessHelpPage', () => {
  it('explains both permission modes and marks the one this site was built for', () => {
    render(<AccessHelpPage mode="delegated" consentUrl={null} clientId={CLIENT_ID} />)
    expect(screen.getByRole('heading', { name: 'Enabling access to the storage report', level: 1 })).toBeInTheDocument()
    expect(within(panelOf('Delegated permissions')).getByText('This site')).toBeInTheDocument()
    expect(within(panelOf('Application permissions')).queryByText('This site')).not.toBeInTheDocument()
  })

  it('moves the mark when the site reads Graph with application permissions', () => {
    render(<AccessHelpPage mode="application" consentUrl={null} clientId={CLIENT_ID} />)
    expect(within(panelOf('Application permissions')).getByText('This site')).toBeInTheDocument()
    expect(within(panelOf('Delegated permissions')).queryByText('This site')).not.toBeInTheDocument()
  })

  it('tells delegated users which role to hold and application tenants to be switched on', () => {
    render(<AccessHelpPage mode="delegated" consentUrl={null} clientId={CLIENT_ID} />)
    expect(screen.getByRole('list', { name: 'How to enable Delegated permissions' })).toHaveTextContent(
      'Reports Reader, Global Reader, SharePoint Administrator or Global Administrator',
    )
    expect(screen.getByRole('list', { name: 'How to enable Application permissions' })).toHaveTextContent(
      'limits the report to named tenants',
    )
  })

  it('says how each mode gets site names, as a last step', () => {
    render(<AccessHelpPage mode="application" consentUrl={null} clientId={CLIENT_ID} />)
    const application = within(screen.getByRole('list', { name: 'How to enable Application permissions' })).getAllByRole('listitem')
    const delegated = within(screen.getByRole('list', { name: 'How to enable Delegated permissions' })).getAllByRole('listitem')
    expect(application).toHaveLength(4)
    expect(application[3]).toHaveTextContent("Sites.Read.All application permission (Graph PowerShell: New-MgServicePrincipalAppRoleAssignment)")
    expect(delegated).toHaveLength(4)
    expect(delegated[3]).toHaveTextContent('a site gets its name only when the signed-in user can open it')
    expect(delegated[1]).toHaveTextContent('Roles & admins → Reports Reader → Add assignments')
  })

  it('offers the admin consent link on this site’s mode only', () => {
    render(<AccessHelpPage mode="delegated" consentUrl={CONSENT_URL} clientId={CLIENT_ID} />)
    expect(within(panelOf('Delegated permissions')).getByRole('link', { name: 'Grant admin consent for this site' })).toHaveAttribute(
      'href',
      CONSENT_URL,
    )
    expect(screen.getAllByRole('link', { name: 'Grant admin consent for this site' })).toHaveLength(1)
  })

  it('shows no consent link when the site cannot build one', () => {
    render(<AccessHelpPage mode="delegated" consentUrl={null} clientId={CLIENT_ID} />)
    expect(screen.queryByRole('link', { name: 'Grant admin consent for this site' })).not.toBeInTheDocument()
  })

  it('marks only Reports.Read.All as required', () => {
    render(<AccessHelpPage mode="delegated" consentUrl={null} clientId={CLIENT_ID} />)
    const permissions = screen.getByRole('list', { name: 'Permissions for Delegated permissions' })
    const rows = within(permissions).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      'Reports.Read.AllRequiredMicrosoft 365 usage reports: storage per site and per OneDrive',
      'Organization.Read.AllOptionaltenant name and licences, for the storage entitlement and OneDrive storage per user',
      "Sites.Read.AllOptionalevery site's name; without it a site is listed by its id unless the viewer can open it on the delegated site",
    ])
  })

  it('names each failure screen by the heading the user saw', () => {
    render(<AccessHelpPage mode="application" consentUrl={null} clientId={CLIENT_ID} />)
    for (const title of [
      'Your organisation has not approved this app yet',
      'This tenant is not enabled for the report yet',
      'Your account cannot read usage reports',
      'Your account is not allowed to use this app',
      'Sign-in failed',
      'Sites are listed by an id instead of a name',
    ]) {
      expect(screen.getByRole('heading', { name: title, level: 3 })).toBeInTheDocument()
    }
  })

  it('shows how to limit the report to assigned groups, naming this site’s app', () => {
    render(<AccessHelpPage mode="application" consentUrl={null} clientId={CLIENT_ID} />)
    const steps = screen.getByRole('list', { name: 'How to limit who can open the report' })
    expect(steps).toHaveTextContent(`Application ID: ${CLIENT_ID}`)
    expect(steps).toHaveTextContent('set Assignment required to Yes')
    expect(steps).toHaveTextContent('add the groups or users who may open the report')
  })

  it('leads back to the report', () => {
    render(<AccessHelpPage mode="application" consentUrl={null} clientId={CLIENT_ID} />)
    expect(screen.getByRole('link', { name: 'Open the report' })).toHaveAttribute('href', '/')
  })
})
