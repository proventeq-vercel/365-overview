import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { HiddenName } from '@/design/HiddenName'
import { EmptyBlock } from '@/design/primitives'
import { WORKLOAD_COLOR } from '@/design/theme'
import { useTranslation } from '@/hooks/useTranslation'
import { formatBytes, formatLongDate } from '@/lib/format'
import { rowName } from '@/lib/rowName'
import { workloadOf } from '@/model/storageOverview'
import type { NameMask, StorageRow } from '@/types/storage'
import { useArchiveDraft } from './useArchivePicks'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sites: StorageRow[]
  picked: StorageRow[]
  inactiveSince: string
  inactiveYears: number
  nameMask: NameMask | null
  onApply: (sites: StorageRow[]) => void
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
              date: formatLongDate(body.inactiveSince),
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
  picked,
  inactiveYears,
  nameMask,
  onApply,
  onDone,
}: Omit<Props, 'open' | 'onOpenChange' | 'inactiveSince'> & { onDone: () => void }) {
  const t = useTranslation()
  const draft = useArchiveDraft(sites, picked)

  return (
    <>
      {sites.length === 0 ? (
        <EmptyBlock>{t('storageOptimisation.archivePicker.empty', { years: inactiveYears })}</EmptyBlock>
      ) : (
        <div className="flex min-h-0 flex-col">
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
            {sites.map((site) => {
              const name = rowName(site)
              return (
                <li key={site.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 transition-colors duration-150 ease-out hover:bg-p365-grey-50">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-p365-teal"
                      checked={draft.ids.has(site.id)}
                      onChange={() => draft.toggle(site.id)}
                      aria-label={nameMask === null ? name : t('hiddenName.label')}
                    />
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: WORKLOAD_COLOR[workloadOf(site)] }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      {nameMask === null ? (
                        <span className="truncate text-sm text-p365-navy" title={name}>
                          {name}
                        </span>
                      ) : (
                        <HiddenName mask={nameMask} seed={name} className="text-sm text-p365-navy" />
                      )}
                      <span className="text-xs text-p365-grey-500">
                        {site.lastActivityDate === null
                          ? t('storageOptimisation.archivePicker.noActivity')
                          : t('storageOptimisation.archivePicker.lastActivity', {
                              date: formatLongDate(site.lastActivityDate),
                            })}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-sm font-bold text-p365-navy">
                      {formatBytes(site.storageUsedBytes)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
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
              onApply(draft.chosen)
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
