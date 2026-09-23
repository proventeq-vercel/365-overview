import { capacityRatio } from '@/lib/share'
import type { StorageRow } from '@/types/storage'
import type { TranslateKey } from '@/hooks/useTranslation'

export type ColumnKey =
  | 'name'
  | 'owner'
  | 'files'
  | 'active'
  | 'used'
  | 'share'
  | 'lastActivity'
  | 'template'
  | 'capacity'

export interface ColumnSpec {
  label: TranslateKey
  help: TranslateKey
  sortable: boolean
  width: string
  sortValue?: (row: StorageRow) => number
}

export const COLUMNS: Record<ColumnKey, ColumnSpec> = {
  name: {
    label: 'table.column.site',
    help: 'table.column.help.site',
    sortable: false,
    width: 'minmax(0,2fr)',
  },
  owner: {
    label: 'table.column.owner',
    help: 'table.column.help.owner',
    sortable: false,
    width: 'minmax(0,1.5fr)',
  },
  files: {
    label: 'table.column.files',
    help: 'table.column.help.files',
    sortable: true,
    width: '80px',
    sortValue: (r) => r.fileCount,
  },
  active: {
    label: 'table.column.active',
    help: 'table.column.help.active',
    sortable: true,
    width: '96px',
    sortValue: (r) => r.activeFileCount,
  },
  used: {
    label: 'table.column.used',
    help: 'table.column.help.used',
    sortable: true,
    width: '120px',
    sortValue: (r) => r.storageUsedBytes,
  },
  share: {
    label: 'table.column.share',
    help: 'table.column.help.share',
    sortable: true,
    width: 'minmax(120px,1.4fr)',
    sortValue: (r) => r.storageUsedBytes,
  },
  lastActivity: {
    label: 'table.column.lastActivity',
    help: 'table.column.help.lastActivity',
    sortable: true,
    width: '120px',
    sortValue: (r) => (r.lastActivityDate ? Date.parse(r.lastActivityDate) : 0),
  },
  template: {
    label: 'table.column.template',
    help: 'table.column.help.template',
    sortable: false,
    width: 'minmax(0,1fr)',
  },
  capacity: {
    label: 'table.column.capacity',
    help: 'table.column.help.capacity',
    sortable: true,
    width: '120px',
    sortValue: (row) => capacityRatio(row) ?? 0,
  },
}

export const DEFAULT_SORT: ColumnKey = 'used'
