import type { TranslateKey } from '@/hooks/useTranslation'

export interface RequiredPermission {
  name: string
  label: TranslateKey
}

export const REQUIRED_PERMISSIONS: readonly RequiredPermission[] = [
  { name: 'Reports.Read.All', label: 'access.permissions.reports' },
]
