import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AudienceSwitch } from './AudienceSwitch'
import type { HelpCatalogue } from './catalogue'
import { HelpAnchor } from './HelpAnchor'
import { HelpMarkdown } from './HelpMarkdown'
import { HelpPager } from './HelpPager'
import { HelpSidebar } from './HelpSidebar'
import { HelpToolbar } from './HelpToolbar'
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
  header?: ReactNode
  stickyOffset?: string
  labels?: Partial<HelpCenterLabels>
}

const NO_VARIABLES: HelpVariables = {}
const NO_VARIABLES_FOR = () => NO_VARIABLES

const audienceQueryOf = (audience: string, defaultAudience: string) =>
  audience === defaultAudience ? '' : `?${AUDIENCE_PARAM}=${encodeURIComponent(audience)}`

function isHidden(element: HTMLElement): boolean {
  return getComputedStyle(element).visibility === 'hidden'
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
  const [focusSearch, setFocusSearch] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
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

  const go = (href: string) => {
    setNavOpen(false)
    setQuery('')
    navigate(href)
  }

  useEffect(() => {
    document.title = page ? `${page.title} · ${labels.home}` : labels.home
  }, [page, labels.home])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')
      if (event.key !== '/' || typing) return
      event.preventDefault()
      if (searchRef.current && isHidden(searchRef.current)) setNavOpen(true)
      setFocusSearch(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const search = searchRef.current
    if (!focusSearch || !search || isHidden(search)) return
    setFocusSearch(false)
    search.focus()
  }, [focusSearch, navOpen])

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
        <HelpSidebar
          id={sidebarId}
          open={navOpen}
          catalogue={catalogue}
          currentSlug={page?.slug}
          query={query}
          searchedFor={deferredQuery}
          results={results}
          searchRef={searchRef}
          labels={labels}
          hrefOf={pageHref}
          onQueryChange={setQuery}
          onNavigate={go}
        />

        <main className="hc-main">
          <HelpToolbar
            page={page}
            section={section}
            navOpen={navOpen}
            sidebarId={sidebarId}
            labels={labels}
            homeHref={pageHref('')}
            onToggleNav={() => setNavOpen((open) => !open)}
            onNavigate={go}
          >
            {page?.hasAudienceContent && audiences.length > 1 && (
              <AudienceSwitch
                audiences={audiences}
                current={audience}
                defaultAudience={defaultAudience}
                labels={labels}
                hrefFor={(id) => helpHref(basePath, { slug: page.slug, hash: '' }, audienceQueryOf(id, defaultAudience))}
                onNavigate={go}
              />
            )}
          </HelpToolbar>

          {page ? (
            <article className="hc-article" key={`${page.slug}:${audience.id}`}>
              <div className="hc-page-header">
                <h1>{page.title}</h1>
                <p className="hc-lead">{page.description}</p>
              </div>
              <div className="hc-prose">
                <HelpMarkdown body={body} file={page.file} basePath={basePath} query={audienceQuery} onNavigate={go} />
              </div>
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
  )
}
