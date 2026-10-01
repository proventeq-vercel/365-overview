import { describe, expect, it } from 'vitest'
import { REPORTS } from '@/features/registry'
import { isExternalHref, resolveDocLink } from '@/help-center/links'
import { outline, prepareBody, variablesUsed } from '@/help-center/prepare'
import { ACCESS_MODES } from '@/config/accessMode'
import messages from '@/intl/en.json'
import { helpCatalogue } from './helpContent'
import { HELP_TOPICS } from './topics'

const KNOWN_VARIABLES = ['consentUrl', 'clientId']
const FILLED = { consentUrl: 'https://consent', clientId: 'client' }
const CONTEXTS = ACCESS_MODES.flatMap((audience) => [
  { audience, variables: FILLED },
  { audience, variables: {} },
])

const FAILURE_SCREENS = [
  messages['access.consent.title'],
  messages['auth.consent.title'],
  messages['access.tenant.title'],
  messages['access.permission.title'],
  messages['auth.notAssigned.title'],
  messages['auth.signInFailed'],
  messages['app.bootstrap.title'],
  messages['errors.insufficientPermissions'].split(' — ')[0],
]

function linksOf(body: string): string[] {
  return [...body.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1])
}

describe('help content', () => {
  it('has pages, each with a title and a description and no second h1', () => {
    expect(helpCatalogue.pages.length).toBeGreaterThan(10)
    for (const page of helpCatalogue.pages) {
      expect(page.title, page.file).not.toBe('')
      expect(page.description, page.file).not.toBe('')
      expect(page.body, page.file).not.toMatch(/^# /m)
    }
  })

  it('links only to pages and headings that exist, for every audience', () => {
    const broken: string[] = []
    for (const page of helpCatalogue.pages) {
      for (const context of CONTEXTS) {
        for (const href of linksOf(prepareBody(page.body, context))) {
          const target = resolveDocLink(page.file, href)
          if (!target) {
            if (!isExternalHref(href)) broken.push(`${page.file} (${context.audience}) → ${href} is not a page link`)
            continue
          }
          const linked = helpCatalogue.page(target.slug)
          const anchors = linked ? outline(prepareBody(linked.body, context)).map((heading) => heading.id) : []
          if (!linked || (target.hash && !anchors.includes(target.hash))) {
            broken.push(`${page.file} (${context.audience}) → ${href}`)
          }
        }
      }
    }
    expect([...new Set(broken)]).toEqual([])
  })

  it('uses only the variables the site fills in', () => {
    const unknown = helpCatalogue.pages.flatMap((page) =>
      variablesUsed(page.body).filter((name) => !KNOWN_VARIABLES.includes(name)).map((name) => `${page.file}: ${name}`),
    )
    expect(unknown).toEqual([])
  })

  it('has a page for every help topic the app links to', () => {
    const missing = Object.entries(HELP_TOPICS).filter(([, slug]) => !helpCatalogue.page(slug))
    expect(missing).toEqual([])
  })

  it('documents every report in the registry', () => {
    const undocumented = REPORTS.filter((report) => !helpCatalogue.page(`reports/${report.id}`)).map((report) => report.id)
    expect(undocumented).toEqual([])
  })

  it('names every failure screen as a troubleshooting heading', () => {
    const troubleshooting = helpCatalogue.page(HELP_TOPICS.troubleshooting)!
    const headings = outline(troubleshooting.body).map((heading) => heading.text)
    expect(FAILURE_SCREENS.filter((title) => !headings.includes(title))).toEqual([])
  })

  it('never tells an application-mode reader that Microsoft needs a role from them', () => {
    const page = helpCatalogue.page(HELP_TOPICS.troubleshooting)!
    const delegated = prepareBody(page.body, { audience: 'delegated', variables: {} })
    const application = prepareBody(page.body, { audience: 'application', variables: {} })
    expect(delegated).toContain('assign you **Reports Reader**')
    expect(application).not.toContain('Reports Reader')
    expect(application).toContain('Microsoft does not check your role here')
  })

  it('explains enabling access separately for each permission mode', () => {
    const page = helpCatalogue.page(HELP_TOPICS.enableAccess)!
    const delegated = prepareBody(page.body, { audience: 'delegated', variables: {} })
    const application = prepareBody(page.body, { audience: 'application', variables: {} })
    expect(delegated).toContain('Reports Reader')
    expect(delegated).not.toContain('switched on')
    expect(application).toContain('Get your tenant switched on')
    expect(application).not.toContain('Give readers a reporting role')
  })
})
