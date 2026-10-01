import type { ReactNode } from 'react'
import type { HelpCatalogue } from './catalogue'
import { HelpAnchor } from './HelpAnchor'
import { ArrowRightIcon, FileTextIcon } from './icons'
import type { HelpCenterLabels } from './labels'
import type { HelpPage } from './types'

export function HelpHome({
  home,
  catalogue,
  sectionIcons,
  labels,
  hrefOf,
  onNavigate,
  children,
}: {
  home: HelpPage
  catalogue: HelpCatalogue
  sectionIcons: Readonly<Record<string, ReactNode>>
  labels: HelpCenterLabels
  hrefOf: (page: HelpPage) => string
  onNavigate: (href: string) => void
  children: ReactNode
}) {
  const quickLinks = catalogue.pagesIn(home.section).filter((page) => page.slug !== home.slug)
  const areas = catalogue.sections
    .map((section) => ({ section, pages: catalogue.pagesIn(section.id).filter((page) => page.slug !== home.slug) }))
    .filter((area) => area.pages.length > 0)
  const articleCount = areas.reduce((total, area) => total + area.pages.length, 0)

  return (
    <div className="hc-home">
      <div className="hc-hero">
        <p className="hc-eyebrow">
          <span className="hc-eyebrow-dot" aria-hidden="true" />
          {labels.homeEyebrow}
        </p>
        <h1>{home.title}</h1>
        <p className="hc-hero-lead">{home.description}</p>
        {quickLinks.length > 0 && (
          <ul className="hc-chips" aria-label={labels.quickLinks}>
            {quickLinks.map((page) => (
              <li key={page.slug}>
                <HelpAnchor href={hrefOf(page)} onNavigate={onNavigate} className="hc-chip">
                  {page.navTitle}
                </HelpAnchor>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="hc-areas" aria-labelledby="hc-areas-title">
        <div className="hc-areas-header">
          <h2 id="hc-areas-title">{labels.browseByArea}</h2>
          <span className="hc-areas-count">{labels.areaCount(areas.length, articleCount)}</span>
        </div>
        <ul className="hc-area-grid">
          {areas.map(({ section, pages }) => (
            <li key={section.id}>
              <HelpAnchor href={hrefOf(pages[0])} onNavigate={onNavigate} className="hc-area-card">
                <span className="hc-area-icon">{sectionIcons[section.id] ?? <FileTextIcon />}</span>
                <span className="hc-area-arrow">
                  <ArrowRightIcon size={14} />
                </span>
                <span className="hc-area-title">{section.label}</span>
                <span className="hc-area-description">
                  {section.description ?? pages.map((page) => page.navTitle).join(' · ')}
                </span>
                <span className="hc-area-cta">{labels.areaArticles(pages.length)}</span>
              </HelpAnchor>
            </li>
          ))}
        </ul>
      </section>

      <div className="hc-prose hc-home-prose">{children}</div>
    </div>
  )
}
