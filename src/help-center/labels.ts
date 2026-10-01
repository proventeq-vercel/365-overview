export interface HelpCenterLabels {
  home: string
  navigation: string
  browse: string
  searchLabel: string
  searchPlaceholder: string
  searchResults: string
  noResults: (query: string) => string
  breadcrumbs: string
  onThisPage: string
  pager: string
  previous: string
  next: string
  notFoundTitle: string
  notFoundBody: string
  notFoundBack: string
  audienceGroup: string
  audienceShown: (audience: string) => string
  thisSite: string
  showAudience: (audience: string) => string
  homeEyebrow: string
  quickLinks: string
  browseByArea: string
  areaCount: (areas: number, articles: number) => string
  areaArticles: (articles: number) => string
  viewMarkdown: string
}

export const DEFAULT_HELP_LABELS: HelpCenterLabels = {
  home: 'Help',
  navigation: 'Help topics',
  browse: 'Browse help',
  searchLabel: 'Search help',
  searchPlaceholder: 'Search help…',
  searchResults: 'Search results',
  noResults: (query) => `Nothing in the help matches “${query}”.`,
  breadcrumbs: 'Breadcrumb',
  onThisPage: 'On this page',
  pager: 'More help',
  previous: 'Previous',
  next: 'Next',
  notFoundTitle: 'This help page does not exist',
  notFoundBody: 'It may have moved. Start from the overview, or search the help.',
  notFoundBack: 'Go to the help overview',
  audienceGroup: 'Setup shown on this page',
  audienceShown: (audience) => `Showing: ${audience}`,
  thisSite: 'This site',
  showAudience: (audience) => `Show ${audience}`,
  homeEyebrow: 'Help centre',
  quickLinks: 'Quick links',
  browseByArea: 'Browse by area',
  areaCount: (areas, articles) => `${areas} ${areas === 1 ? 'area' : 'areas'} · ${articles} ${articles === 1 ? 'article' : 'articles'}`,
  areaArticles: (articles) => `${articles} ${articles === 1 ? 'article' : 'articles'}`,
  viewMarkdown: 'View as Markdown',
}
