export const HELP_SECTIONS = [
  {
    id: 'start',
    label: 'Get started',
    description: 'Enable access for your organisation, see what the report may read, and fix the screens that stop it loading.',
  },
  {
    id: 'storage-optimisation',
    label: 'Storage Optimisation',
    description: 'Where tenant storage sits, what archiving would save, when the entitlement runs out and which sites hold the most.',
  },
  {
    id: 'onedrive-usage',
    label: 'OneDrive Usage',
    description: 'How much sits in personal OneDrives, who holds the most, and which drives are near their cap or over their licence.',
  },
  {
    id: 'reference',
    label: 'Reference',
    description: 'Report settings, how every figure is calculated, how sites are named, and what leaves your browser.',
  },
] as const

export const HELP_LLMS = {
  title: 'Proventeq 365 storage report',
  summary:
    'A sneak peek of the Proventeq 365 storage-optimisation report, built from a Microsoft 365 tenant’s own Graph usage reports. These pages document every report, figure, setting and access step.',
}
