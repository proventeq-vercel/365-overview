import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { HelpCatalogue } from './catalogue'
import { HelpMarkdown } from './HelpMarkdown'
import { DEFAULT_HELP_LABELS, type HelpCenterLabels } from './labels'
import { helpHref, isPlainClick } from './links'
import { outline, prepareBody } from './prepare'
import { buildSearchIndex, searchHelp } from './search'
import type { HelpAudience, HelpHeading, HelpPage, HelpVariables } from './types'
import { AUDIENCE_PARAM, useHelpLocation } from './useHelpLocation'
import './help-center.css'

export interface HelpCenterProps {
  catalogue: HelpCatalogue
  basePath: string
  audiences: readonly HelpAudience[]
  defaultAudience: string
  variables?: (audience: string) => HelpVariables
  header?: ReactNode
  stickyOffset?: string
  labels?: Partial<HelpCenterLabels>
}

const NO_VARIABLES: HelpVariables = {}
const NO_VARIABLES_FOR = () => NO_VARIABLES

function Link({
  href,
  onNavigate,
  children,
  className,
  current,
}: {
  href: string
  onNavigate: (href: string) => void
  children: ReactNode
  className?: string
  current?: boolean
}) {
  return (
    <a
      href={href}
      className={className}
      aria-current={current ? 'page' : undefined}
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        onNavigate(href)
      }}
    >
      {children}
    </a>
  )
}

function useActiveHeading(headings: readonly HelpHeading[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || headings.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    for (const heading of headings) {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [headings])
  return active
}

function TableOfContents({
  headings,
  label,
  href,
  onNavigate,
}: {
  headings: readonly HelpHeading[]
  label: string
  href: (hash: string) => string
  onNavigate: (href: string) => void
}) {
  const active = useActiveHeading(headings)
  if (headings.length === 0) return null
  return (
    <nav className="hc-toc" aria-label={label}>
      <p className="hc-toc-title">{label}</p>
      <ul>
        {headings.map((heading) => (
          <li key={heading.id} className={heading.depth === 3 ? 'hc-toc-sub' : undefined}>
            <Link
              href={href(heading.id)}
              onNavigate={onNavigate}
              className={heading.id === active ? 'hc-toc-active' : undefined}
            >
              {heading.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function AudienceSwitch({
  audiences,
  current,
  defaultAudience,
  labels,
  hrefFor,
  onNavigate,
}: {
  audiences: readonly HelpAudience[]
  current: HelpAudience
  defaultAudience: string
  labels: HelpCenterLabels
  hrefFor: (audience: string) => string
  onNavigate: (href: string) => void
}) {
  return (
    <div className="hc-audience" role="group" aria-label={labels.audienceGroup}>
      <span className="hc-audience-current">
        {labels.audienceShown(current.label)}
        {current.id === defaultAudience && <span className="hc-badge">{labels.thisSite}</span>}
      </span>
      {audiences
        .filter((audience) => audience.id !== current.id)
        .map((audience) => (
          <Link key={audience.id} href={hrefFor(audience.id)} onNavigate={onNavigate} className="hc-audience-link">
            {labels.showAudience(audience.label)}
            {audience.id === defaultAudience && ` (${labels.thisSite.toLowerCase()})`}
          </Link>
        ))}
    </div>
  )
}

export function HelpCenter({
  catalogue,
  basePath,
  audiences,
  defaultAudience,
  variables = NO_VARIABLES_FOR,
  header,
  stickyOffset = '0px',
  labels: labelOverrides,
}: HelpCenterProps) {
  const labels = { ...DEFAULT_HELP_LABELS, ...labelOverrides }
  const { location, navigate } = useHelpLocation(basePath)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [navOpen, setNavOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const sidebarId = useId()

  const audience =
    audiences.find((each) => each.id === location.audience) ??
    audiences.find((each) => each.id === defaultAudience) ??
    audiences[0]
  const audienceQuery = audience.id === defaultAudience ? '' : `?${AUDIENCE_PARAM}=${encodeURIComponent(audience.id)}`
  const context = useMemo(
    () => ({ audience: audience.id, variables: variables(audience.id) }),
    [audience.id, variables],
  )
  const page = location.slug === null ? undefined : catalogue.page(location.slug)
  const body = useMemo(() => (page ? prepareBody(page.body, context) : ''), [page, context])
  const headings = useMemo(() => outline(body), [body])
  const searchIndex = useMemo(() => buildSearchIndex(catalogue.pages, context), [catalogue, context])
  const results = useMemo(() => searchHelp(searchIndex, deferredQuery), [searchIndex, deferredQuery])

  const pageHref = (target: HelpPage | string, hash = '') =>
    helpHref(basePath, { slug: typeof target === 'string' ? target : target.slug, hash }, audienceQuery)

  const go = (href: string) => {
    setNavOpen(false)
    setQuery('')
    navigate(href)
  }

  useEffect(() => {
    const titled = page ? `${page.title} · ${labels.home}` : labels.home
    document.title = titled
  }, [page, labels.home])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const section = page ? catalogue.sections.find((each) => each.id === page.section) : undefined
  const { previous, next } = page ? catalogue.neighbours(page.slug) : { previous: null, next: null }

  return (
    <div className="hc" style={{ '--hc-sticky-top': stickyOffset } as CSSProperties}>
      {header}
      <div className="hc-layout">
        <div
          className={navOpen ? 'hc-backdrop hc-backdrop-open' : 'hc-backdrop'}
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
        />
        <aside id={sidebarId} className={navOpen ? 'hc-sidebar hc-sidebar-open' : 'hc-sidebar'}>
          <div className="hc-search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              aria-label={labels.searchLabel}
              placeholder={labels.searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd aria-hidden="true">/</kbd>
          </div>
          {deferredQuery.trim() ? (
            <div className="hc-results">
              {results.length === 0 ? (
                <p className="hc-muted">{labels.noResults(deferredQuery.trim())}</p>
              ) : (
                <ul aria-label={labels.searchResults}>
                  {results.map((result) => (
                    <li key={result.page.slug}>
                      <Link href={pageHref(result.page)} onNavigate={go}>
                        <span className="hc-result-title">{result.page.title}</span>
                        <span className="hc-result-snippet">{result.snippet}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <nav className="hc-nav" aria-label={labels.navigation}>
              {catalogue.sections.map((each) => {
                const pages = catalogue.pagesIn(each.id)
                if (pages.length === 0) return null
                return (
                  <div key={each.id} className="hc-nav-group">
                    <p className="hc-nav-heading">{each.label}</p>
                    <ul>
                      {pages.map((entry) => (
                        <li key={entry.slug}>
                          <Link
                            href={pageHref(entry)}
                            onNavigate={go}
                            current={entry.slug === page?.slug}
                            className="hc-nav-link"
                          >
                            {entry.navTitle}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </nav>
          )}
        </aside>

        <main className="hc-main">
          <div className="hc-toolbar">
            <button
              type="button"
              className="hc-browse"
              aria-expanded={navOpen}
              aria-controls={sidebarId}
              onClick={() => setNavOpen((open) => !open)}
            >
              {labels.browse}
            </button>
            {page && (
              <nav className="hc-breadcrumbs" aria-label={labels.breadcrumbs}>
                <ol>
                  <li>
                    <Link href={pageHref('')} onNavigate={go}>
                      {labels.home}
                    </Link>
                  </li>
                  {page.slug !== '' && section && <li>{section.label}</li>}
                  {page.slug !== '' && <li aria-current="page">{page.navTitle}</li>}
                </ol>
              </nav>
            )}
            {page?.hasAudienceContent && audiences.length > 1 && (
              <AudienceSwitch
                audiences={audiences}
                current={audience}
                defaultAudience={defaultAudience}
                labels={labels}
                hrefFor={(id) =>
                  helpHref(
                    basePath,
                    { slug: page.slug, hash: '' },
                    id === defaultAudience ? '' : `?${AUDIENCE_PARAM}=${encodeURIComponent(id)}`,
                  )
                }
                onNavigate={go}
              />
            )}
          </div>

          {page ? (
            <article className="hc-article" key={`${page.slug}:${audience.id}`}>
              <div className="hc-page-header">
                <h1>{page.title}</h1>
                <p className="hc-lead">{page.description}</p>
              </div>
              <div className="hc-prose">
                <HelpMarkdown body={body} file={page.file} basePath={basePath} query={audienceQuery} onNavigate={go} />
              </div>
              {(previous || next) && (
                <nav className="hc-pager" aria-label={labels.pager}>
                  {previous ? (
                    <Link href={pageHref(previous)} onNavigate={go} className="hc-pager-link">
                      <span className="hc-pager-label">{labels.previous}</span>
                      <span className="hc-pager-title">{previous.navTitle}</span>
                    </Link>
                  ) : (
                    <span />
                  )}
                  {next && (
                    <Link href={pageHref(next)} onNavigate={go} className="hc-pager-link hc-pager-next">
                      <span className="hc-pager-label">{labels.next}</span>
                      <span className="hc-pager-title">{next.navTitle}</span>
                    </Link>
                  )}
                </nav>
              )}
            </article>
          ) : (
            <article className="hc-article">
              <div className="hc-page-header">
                <h1>{labels.notFoundTitle}</h1>
                <p className="hc-lead">{labels.notFoundBody}</p>
              </div>
              <Link href={pageHref('')} onNavigate={go} className="hc-button">
                {labels.notFoundBack}
              </Link>
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
  )
}
