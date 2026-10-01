import { createHelpCatalogue } from '@/help-center/catalogue'
import { HELP_SECTIONS } from './helpSections'

export const HELP_SOURCE_ROOT = '/docs/help/'

export const HELP_SOURCES = import.meta.glob<string>('/docs/help/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export const helpCatalogue = createHelpCatalogue(HELP_SOURCES, HELP_SECTIONS, HELP_SOURCE_ROOT)
