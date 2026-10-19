import { createHelpCatalogue } from '@/help-center/catalogue'
import { env } from '@/config/env'
import { HELP_SECTIONS } from './helpSections'

const HELP_SOURCE_ROOT = '/docs/help/'

const HELP_SOURCES = import.meta.glob<string>('/docs/help/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export function helpCatalogueFor(features: ReadonlySet<string>) {
  return createHelpCatalogue(HELP_SOURCES, HELP_SECTIONS, HELP_SOURCE_ROOT, (feature) =>
    features.has(feature),
  )
}

export const helpCatalogue = helpCatalogueFor(env.features)
