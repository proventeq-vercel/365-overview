export const COPY = {
  title: 'OneDrive Usage',
  description:
    'How much of the tenant sits in personal OneDrives, who holds the most, and which drives are running out of room.',
  kpi: {
    used: 'OneDrive storage',
    usedHint: 'Tenant-wide, as reported by Microsoft 365',
    drives: 'OneDrives',
    drivesHint: 'Active drives in the usage report',
    nearCap: 'Drives near capacity',
    nearCapHint: 'At 90% or more of their own allocation',
    nearCapNone: 'No drive is close to its cap',
    retained: 'Deleted but still billing',
    retainedHint: (count: string) => `${count} deleted drives still consuming quota under retention`,
    retainedNone: 'Nothing retained',
  },
  top: {
    title: 'Top OneDrives by storage',
    subtitle: 'The five largest personal drives',
    empty: 'No results',
  },
  table: {
    title: 'All OneDrives',
    subtitle: 'Every personal drive in the usage report, with how much of its own allocation it uses',
    label: 'OneDrives',
  },
  allocationNote:
    'Each OneDrive has its own allocation, so capacity is meaningful per drive. It is not pooled with SharePoint.',
} as const
