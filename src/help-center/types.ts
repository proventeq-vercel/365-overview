export interface HelpSection {
  id: string
  label: string
}

export interface HelpAudience {
  id: string
  label: string
}

export interface HelpPage {
  slug: string
  file: string
  title: string
  navTitle: string
  description: string
  section: string
  order: number
  body: string
  hasAudienceContent: boolean
}

export interface HelpHeading {
  id: string
  text: string
  depth: 2 | 3
}

export type HelpVariables = Readonly<Record<string, string | null | undefined>>

export interface HelpContext {
  audience: string
  variables: HelpVariables
}
