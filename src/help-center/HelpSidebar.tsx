import type { Ref } from 'react'
import type { HelpCatalogue } from './catalogue'
import { HelpAnchor } from './HelpAnchor'
import type { HelpCenterLabels } from './labels'
import type { HelpSearchResult } from './search'
import type { HelpPage } from './types'

export function HelpSidebar({
  id,
  open,
  catalogue,
  currentSlug,
  query,
  searchedFor,
  results,
  searchRef,
  labels,
  hrefOf,
  onQueryChange,
  onNavigate,
}: {
  id: string
  open: boolean
  catalogue: HelpCatalogue
  currentSlug: string | undefined
  query: string
  searchedFor: string
  results: readonly HelpSearchResult[]
  searchRef: Ref<HTMLInputElement>
  labels: HelpCenterLabels
  hrefOf: (page: HelpPage) => string
  onQueryChange: (query: string) => void
  onNavigate: (href: string) => void
}) {
  const searching = searchedFor.trim()
  return (
    <aside id={id} className={open ? 'hc-sidebar hc-sidebar-open' : 'hc-sidebar'}>
      <div className="hc-search">
        <input
          ref={searchRef}
          type="search"
          value={query}
          aria-label={labels.searchLabel}
          placeholder={labels.searchPlaceholder}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <kbd aria-hidden="true">/</kbd>
      </div>
      {searching ? (
        <div className="hc-results">
          {results.length === 0 ? (
            <p className="hc-muted">{labels.noResults(searching)}</p>
          ) : (
            <ul aria-label={labels.searchResults}>
              {results.map((result) => (
                <li key={result.page.slug}>
                  <HelpAnchor href={hrefOf(result.page)} onNavigate={onNavigate}>
                    <span className="hc-result-title">{result.page.title}</span>
                    <span className="hc-result-snippet">{result.snippet}</span>
                  </HelpAnchor>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <nav className="hc-nav" aria-label={labels.navigation}>
          {catalogue.sections.map((section) => {
            const pages = catalogue.pagesIn(section.id)
            if (pages.length === 0) return null
            return (
              <div key={section.id} className="hc-nav-group">
                <p className="hc-nav-heading">{section.label}</p>
                <ul>
                  {pages.map((entry) => (
                    <li key={entry.slug}>
                      <HelpAnchor
                        href={hrefOf(entry)}
                        onNavigate={onNavigate}
                        current={entry.slug === currentSlug}
                        className="hc-nav-link"
                      >
                        {entry.navTitle}
                      </HelpAnchor>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>
      )}
    </aside>
  )
}
