import { describe, expect, it } from 'vitest'
import { REPORTS, enabledReports } from '@/features/registry'
import { FeatureFlags, type FeatureFlag } from '@/config/featureFlags'
import { isExternalHref, resolveDocLink } from '@/help-center/links'
import { featuresUsed, outline, prepareBody, variablesUsed } from '@/help-center/prepare'
import { ACCESS_MODES } from '@/config/accessMode'
import messages from '@/intl/en.json'
import { helpCatalogueFor } from './helpContent'
import { HELP_TOPICS } from './topics'

const KNOWN_VARIABLES = ['consentUrl', 'clientId']
const FILLED = { consentUrl: 'https://consent', clientId: 'client' }
const CONTEXTS = ACCESS_MODES.flatMap((audience) => [
  { audience, variables: FILLED },
  { audience, variables: {} },
])

const ALL_FLAGS = Object.values(FeatureFlags)
const FLAG_SETS: FeatureFlag[][] = ALL_FLAGS.reduce<FeatureFlag[][]>(
  (sets, flag) => [...sets, ...sets.map((set) => [...set, flag])],
  [[]],
)
const helpCatalogue = helpCatalogueFor(new Set(ALL_FLAGS))
const SOURCES = import.meta.glob<string>('/docs/help/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const FAILURE_SCREENS = [
  messages['access.consent.title'],
  messages['auth.consent.title'],
  messages['access.tenant.title'],
  messages['access.permission.title'],
  messages['auth.notAssigned.title'],
  messages['auth.signInFailed'],
  messages['app.bootstrap.title'],
  messages['errors.insufficientPermissions'].split(' — ')[0],
  messages['errors.linkNotAllowed.title'],
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

  it('links only to pages and headings that exist, for every audience and every set of features', () => {
    const broken: string[] = []
    for (const flags of FLAG_SETS) {
    const helpCatalogue = helpCatalogueFor(new Set(flags))
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
            broken.push(`${page.file} (${context.audience}, [${flags.join(', ')}]) → ${href}`)
          }
        }
      }
    }
    }
    expect([...new Set(broken)]).toEqual([])
  })

  it('names only feature flags the app knows, in frontmatter and in blocks', () => {
    const unknown = Object.entries(SOURCES).flatMap(([file, raw]) => {
      const named = [...featuresUsed(raw), ...[...raw.matchAll(/^feature:\s*(\S+)/gm)].map((match) => match[1])]
      return named.filter((flag) => !ALL_FLAGS.includes(flag as FeatureFlag)).map((flag) => `${file}: ${flag}`)
    })
    expect(unknown).toEqual([])
  })

  it('shows the pages of enabled reports only', () => {
    const storageOnly = helpCatalogueFor(new Set([FeatureFlags.OptimizationStorageReportOverview]))
    expect(storageOnly.page('reports/storage-optimisation')).toBeDefined()
    expect(storageOnly.page('reports/onedrive-usage')).toBeUndefined()
    expect(storageOnly.page('reports/onedrive-usage/over-licence')).toBeUndefined()
    expect(storageOnly.sections.map((section) => section.id)).not.toContain('onedrive-usage')
    expect(storageOnly.page('')!.body).not.toContain('OneDrive Usage')
  })

  it('documents every enabled report and no other, for every set of features', () => {
    const wrong = FLAG_SETS.flatMap((flags) => {
      const catalogue = helpCatalogueFor(new Set(flags))
      const enabled = enabledReports(new Set(flags)).map((report) => report.id)
      return REPORTS.filter((report) => enabled.includes(report.id) !== Boolean(catalogue.page(`reports/${report.id}`))).map(
        (report) => `${report.id} with [${flags.join(', ')}]`,
      )
    })
    expect(wrong).toEqual([])
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
