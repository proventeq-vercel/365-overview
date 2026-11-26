import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { HiddenName } from '@/design/HiddenName'
import { Pagination } from '@/design/Pagination'
import { EmptyBlock } from '@/design/primitives'
import { WORKLOAD_COLOR } from '@/design/theme'
import { TruncatedText } from '@/design/TruncatedText'
import { usePagination } from '@/hooks/usePagination'
import { useSiteDetails } from '@/hooks/useSiteDetails'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes, formatShortDate } from '@/lib/format'
import { rowName } from '@/lib/rowName'
import { workloadOf } from '@/model/workload'
import type { NameMask, StorageRow } from '@/types/storage'
import { useArchiveDraft } from './useArchivePicks'
import { workloadLabel } from './workloadLabel'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sites: StorageRow[]
  pickedIds: ReadonlySet<string>
  inactiveSince: string
  inactiveYears: number
  nameMask: NameMask | null
  onApply: (ids: ReadonlySet<string>) => void
}

export function ArchiveSitePicker({ open, onOpenChange, ...body }: Props) {
  const t = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(40rem,calc(100vh-4rem))] w-[min(36rem,calc(100vw-2rem))] flex-col gap-3">
        <div>
          <DialogTitle>{t('storageOptimisation.archivePicker.title')}</DialogTitle>
          <DialogDescription>
            {t('storageOptimisation.archivePicker.subtitle', {
              date: formatShortDate(body.inactiveSince),
            })}
          </DialogDescription>
        </div>
        <PickerBody {...body} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function PickerBody({
  sites,
  pickedIds,
  inactiveYears,
  nameMask,
  onApply,
  onDone,
}: Omit<Props, 'open' | 'onOpenChange' | 'inactiveSince'> & { onDone: () => void }) {
  const t = useTranslation()
  const draft = useArchiveDraft(sites, pickedIds)
  const pagination = usePagination(sites.length)
  const { start, end } = pagination
  const pageSlice = useMemo(() => sites.slice(start, end), [sites, start, end])
  const { rows: pageRows, isPending: namesPending } = useSiteDetails(pageSlice, nameMask === null)

  return (
    <>
      {sites.length === 0 ? (
        <EmptyBlock>{t('storageOptimisation.archivePicker.empty', { years: inactiveYears })}</EmptyBlock>
      ) : (
        <div className="flex min-h-0 flex-col gap-2">
          <label className="flex items-center gap-2 border-b border-p365-grey-100 pb-2 text-sm text-p365-grey-500">
            <input
              type="checkbox"
              className="size-4 accent-p365-teal"
              checked={draft.allChosen}
              ref={(input) => {
                if (input) input.indeterminate = !draft.allChosen && draft.chosen.length > 0
              }}
              onChange={draft.toggleAll}
            />
            {t('storageOptimisation.archivePicker.selectAll')}
          </label>
          <ul className="min-h-0 overflow-y-auto py-1">
            {pageRows.map((site) => {
              const name = rowName(site)
              const resolving = namesPending && !site.name && !site.url
              const size = formatBytes(site.storageUsedBytes)
              const lastActivity = formatShortDate(site.lastActivityDate ?? '')
              return (
                <li key={site.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 transition-colors duration-150 ease-out hover:bg-p365-grey-50">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-p365-teal"
                      checked={draft.ids.has(site.id)}
                      onChange={() => draft.toggle(site.id)}
                      aria-label={t('storageOptimisation.archivePicker.rowLabel', {
                        name: nameMask === null ? name : t('hiddenName.label'),
                        size,
                        date: lastActivity,
                      })}
                    />
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: WORKLOAD_COLOR[workloadOf(site)] }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      {nameMask !== null ? (
                        <HiddenName mask={nameMask} seed={name} className="text-sm text-p365-navy" />
                      ) : resolving ? (
                        <Skeleton className="h-3.5 w-1/2" aria-label={t('table.resolvingName')} />
                      ) : (
                        <TruncatedText text={name} className="text-sm text-p365-navy" />
                      )}
                      <span className="text-xs text-p365-grey-500">
                        {t('storageOptimisation.archivePicker.lastActivity', {
                          workload: workloadLabel(workloadOf(site), t),
                          date: lastActivity,
                        })}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm font-bold text-p365-navy">{size}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          <Pagination pagination={pagination} label={t('storageOptimisation.archivePicker.title')} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-p365-grey-100 pt-3">
        <span className="text-sm text-p365-grey-500">
          {t('storageOptimisation.archivePicker.chosen', {
            count: draft.chosen.length,
            size: formatBytes(draft.chosenBytes),
          })}
        </span>
        <div className="flex gap-2">
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t('storageOptimisation.archivePicker.cancel')}
          </DialogClose>
          <Button
            type="button"
            onClick={() => {
              onApply(draft.chosenIds)
              onDone()
            }}
          >
            {t('storageOptimisation.archivePicker.apply')}
          </Button>
        </div>
      </div>
    </>
  )
}
