import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useTranslation } from '@/hooks/useTranslation'
import { hiddenNamePlaceholder } from '@/lib/hiddenNames'
import { cn } from '@/lib/utils'
import type { NameMask } from '@/types/storage'

const HOVER_OPEN_DELAY = 80
const HOVER_CLOSE_DELAY = 120

export function HiddenName({
  mask,
  seed,
  className,
}: {
  mask: NameMask
  seed: string
  className?: string
}) {
  const t = useTranslation()
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={HOVER_OPEN_DELAY}
        closeDelay={HOVER_CLOSE_DELAY}
        render={
          <button
            type="button"
            aria-label={t('hiddenName.label')}
            className={cn(
              'block max-w-full truncate rounded-sm text-left select-none focus-visible:outline-2 focus-visible:outline-p365-teal',
              className,
            )}
          >
            <span aria-hidden="true" className="blur-[3px]">
              {hiddenNamePlaceholder(seed)}
            </span>
          </button>
        }
      />
      <PopoverContent>
        <PopoverTitle>
          {mask === 'concealed' ? t('hiddenName.concealed.title') : t('hiddenName.hidden.title')}
        </PopoverTitle>
        <PopoverDescription className="mt-1">
          {mask === 'concealed' ? t('hiddenName.concealed.body') : t('hiddenName.hidden.body')}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
