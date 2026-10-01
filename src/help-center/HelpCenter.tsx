import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AudienceSwitch } from './AudienceSwitch'
import type { HelpCatalogue } from './catalogue'
import { HelpAnchor } from './HelpAnchor'
import { HelpBreadcrumbs } from './HelpBreadcrumbs'
import { HelpHome } from './HelpHome'
import { HelpMarkdown } from './HelpMarkdown'
import { HelpPager } from './HelpPager'
import { HelpSearch } from './HelpSearch'
import { HelpSidebar } from './HelpSidebar'
import { HelpTopBar } from './HelpTopBar'
import { FileTextIcon } from './icons'
import { DEFAULT_HELP_LABELS, type HelpCenterLabels } from './labels'
import { helpHref } from './links'
import { outline, prepareBody } from './prepare'
import { buildHelpSearchIndex, searchHelp } from './search'
import { TableOfContents } from './TableOfContents'
import type { HelpAudience, HelpPage, HelpVariables } from './types'
import { AUDIENCE_PARAM, useHelpLocation } from './useHelpLocation'
import './help-center.css'

export interface HelpCenterProps {
  catalogue: HelpCatalogue
  basePath: string
  audiences: readonly HelpAudience[]
  defaultAudience: string
  variables?: (audience: string) => HelpVariables
  brand?: ReactNode
  actions?: ReactNode
  sectionIcons?: Readonly<Record<string, ReactNode>>
  markdownLinks?: boolean
  labels?: Partial<HelpCenterLabels>
}

const NO_VARIABLES: HelpVariables = {}
const NO_VARIABLES_FOR = () => NO_VARIABLES
const NO_ICONS: Readonly<Record<string, ReactNode>> = {}

const audienceQueryOf = (audience: string, defaultAudience: string) =>
  audience === defaultAudience ? '' : `?${AUDIENCE_PARAM}=${encodeURIComponent(audience)}`

function isSearchShortcut(event: KeyboardEvent, typing: boolean): boolean {
  if (event.key === '/') return !typing && !event.metaKey && event.ctrlKey === event.altKey
  return event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey
}

export function HelpCenter({
  catalogue,
  basePath,
  audiences,
  defaultAudience,
  variables = NO_VARIABLES_FOR,
  brand,
  actions,
  sectionIcons = NO_ICONS,
  markdownLinks = false,
  labels: labelOverrides,
}: HelpCenterProps) {
  const labels = { ...DEFAULT_HELP_LABELS, ...labelOverrides }
  const { location, navigate } = useHelpLocation(basePath)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [navOpen, setNavOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const navOpenRef = useRef(navOpen)
  const sidebarId = useId()

  const audience =
    audiences.find((each) => each.id === location.audience) ??
    audiences.find((each) => each.id === defaultAudience) ??
    audiences[0]
  const audienceQuery = audienceQueryOf(audience.id, defaultAudience)
  const context = useMemo(
    () => ({ audience: audience.id, variables: variables(audience.id) }),
    [audience.id, variables],
  )
  const page = location.slug === null ? undefined : catalogue.page(location.slug)
  const body = useMemo(() => (page ? prepareBody(page.body, context) : ''), [page, context])
  const headings = useMemo(() => outline(body), [body])
  const searchIndex = useMemo(() => buildHelpSearchIndex(catalogue.pages, context), [catalogue, context])
  const results = useMemo(() => searchHelp(searchIndex, deferredQuery), [searchIndex, deferredQuery])

  const pageHref = (target: HelpPage | string, hash = '') =>
    helpHref(basePath, { slug: typeof target === 'string' ? target : target.slug, hash }, audienceQuery)

  const closeNav = useCallback(() => {
    if (!navOpenRef.current) return
    setNavOpen(false)
    toggleRef.current?.focus({ preventScroll: true })
  }, [])

  const go = (href: string) => {
    closeNav()
    setQuery('')
    navigate(href)
  }

  useEffect(() => {
    document.title = page ? `${page.title} · ${labels.home}` : labels.home
  }, [page, labels.home])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if (event.key === 'Escape') {
        closeNav()
        return
      }
      const typing =
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable]') !== null
      if (!isSearchShortcut(event, typing)) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeNav])

  useEffect(() => {
    navOpenRef.current = navOpen
  }, [navOpen])

  const section = page ? catalogue.sections.find((each) => each.id === page.section) : undefined
  const { previous, next } = page ? catalogue.neighbours(page.slug) : { previous: null, next: null }
  const showAudienceSwitch = page !== undefined && page.hasAudienceContent && audiences.length > 1
  const markdown = page && (
    <HelpMarkdown body={body} file={page.file} basePath={basePath} query={audienceQuery} onNavigate={go} />
  )

  return (
    <div className="hc">
      <HelpTopBar
        brand={brand}
        actions={actions}
        navOpen={navOpen}
        sidebarId={sidebarId}
        toggleRef={toggleRef}
        labels={labels}
        onToggleNav={() => setNavOpen((open) => !open)}
        search={
          <HelpSearch
            query={query}
            searchedFor={deferredQuery}
            results={results}
            sections={catalogue.sections}
            inputRef={searchRef}
            labels={labels}
            hrefOf={pageHref}
            onQueryChange={setQuery}
            onNavigate={go}
          />
        }
      />
      <div className="hc-layout">
        <div
          className={navOpen ? 'hc-backdrop hc-backdrop-open' : 'hc-backdrop'}
          aria-hidden="true"
          onClick={closeNav}
        />
        <HelpSidebar
          id={sidebarId}
          open={navOpen}
          catalogue={catalogue}
          currentSlug={page?.slug}
          sectionIcons={sectionIcons}
          labels={labels}
          hrefOf={pageHref}
          onNavigate={go}
        />

        <div className="hc-content">
          <main className="hc-main">
            {page?.slug === '' ? (
              <article className="hc-article hc-article-home" key={`${page.slug}:${audience.id}`}>
                <HelpHome
                  home={page}
                  catalogue={catalogue}
                  sectionIcons={sectionIcons}
                  labels={labels}
                  hrefOf={pageHref}
                  onNavigate={go}
                >
                  {markdown}
                </HelpHome>
              </article>
            ) : page ? (
              <article className="hc-article" key={`${page.slug}:${audience.id}`}>
                <div className="hc-page-header">
                  <HelpBreadcrumbs
                    page={page}
                    section={section}
                    labels={labels}
                    homeHref={pageHref('')}
                    onNavigate={go}
                  />
                  <h1>{page.title}</h1>
                  <p className="hc-lead">{page.description}</p>
                  {(showAudienceSwitch || markdownLinks) && (
                    <div className="hc-meta">
                      {showAudienceSwitch && (
                        <AudienceSwitch
                          audiences={audiences}
                          current={audience}
                          defaultAudience={defaultAudience}
                          labels={labels}
                          hrefFor={(id) =>
                            helpHref(basePath, { slug: page.slug, hash: '' }, audienceQueryOf(id, defaultAudience))
                          }
                          onNavigate={go}
                        />
                      )}
                      {markdownLinks && (
                        <a className="hc-meta-action" href={`${basePath}/${page.file}`} target="_blank" rel="noopener">
                          <FileTextIcon size={13} />
                          {labels.viewMarkdown}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="hc-prose">{markdown}</div>
                <HelpPager previous={previous} next={next} labels={labels} hrefOf={pageHref} onNavigate={go} />
              </article>
            ) : (
              <article className="hc-article">
                <div className="hc-page-header">
                  <h1>{labels.notFoundTitle}</h1>
                  <p className="hc-lead">{labels.notFoundBody}</p>
                </div>
                <HelpAnchor href={pageHref('')} onNavigate={go} className="hc-button">
                  {labels.notFoundBack}
                </HelpAnchor>
              </article>
            )}
          </main>

          <TableOfContents
            headings={headings}
            label={labels.onThisPage}
            href={(hash) => (page ? pageHref(page, hash) : '#')}
            onNavigate={go}
          />
        </div>
      </div>
    </div>
  )
}
