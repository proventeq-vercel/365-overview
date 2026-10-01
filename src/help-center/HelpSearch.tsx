import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { HelpAnchor } from './HelpAnchor'
import { SearchIcon } from './icons'
import type { HelpCenterLabels } from './labels'
import type { HelpSearchResult } from './search'
import type { HelpPage, HelpSection } from './types'

export function HelpSearch({
  query,
  searchedFor,
  results,
  sections,
  inputRef,
  labels,
  hrefOf,
  onQueryChange,
  onNavigate,
}: {
  query: string
  searchedFor: string
  results: readonly HelpSearchResult[]
  sections: readonly HelpSection[]
  inputRef: Ref<HTMLInputElement>
  labels: HelpCenterLabels
  hrefOf: (page: HelpPage) => string
  onQueryChange: (query: string) => void
  onNavigate: (href: string) => void
}) {
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const searching = searchedFor.trim()
  const open = searching !== '' && !dismissed
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0))
  const optionId = (index: number) => `${listId}-${index}`
  const sectionLabel = (id: string) => sections.find((section) => section.id === id)?.label ?? ''

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setDismissed(true)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  return (
    <div ref={rootRef} className={open ? 'hc-search hc-search-open' : 'hc-search'}>
      <label className="hc-search-field">
        <SearchIcon size={15} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          aria-label={labels.searchLabel}
          placeholder={labels.searchPlaceholder}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && results.length > 0 ? optionId(activeIndex) : undefined}
          onFocus={() => setDismissed(false)}
          onChange={(event) => {
            setActive(0)
            setDismissed(false)
            onQueryChange(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && query !== '') {
              onQueryChange('')
              return
            }
            if (!open || results.length === 0) return
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              const step = event.key === 'ArrowDown' ? 1 : -1
              setActive((activeIndex + step + results.length) % results.length)
            } else if (event.key === 'Enter') {
              event.preventDefault()
              onNavigate(hrefOf(results[activeIndex].page))
            }
          }}
        />
        <kbd aria-hidden="true">/</kbd>
      </label>
      {open && (
        <div className="hc-search-panel">
          {results.length === 0 ? (
            <p className="hc-muted">{labels.noResults(searching)}</p>
          ) : (
            <ul id={listId} aria-label={labels.searchResults}>
              {results.map((result, index) => (
                <li key={result.page.slug} id={optionId(index)} className={index === activeIndex ? 'hc-result-active' : undefined}>
                  <HelpAnchor href={hrefOf(result.page)} onNavigate={onNavigate}>
                    <span className="hc-result-section">{sectionLabel(result.page.section)}</span>
                    <span className="hc-result-title">{result.page.title}</span>
                    <span className="hc-result-snippet">{result.snippet}</span>
                  </HelpAnchor>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
