import { EyeOff } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { ConcealmentSource } from '@/types/storage'

interface ConcealedNameMarkProps {
  source: ConcealmentSource
}

export function ConcealedNameMark({ source }: ConcealedNameMarkProps) {
  const t = useTranslation()
  const label =
    source === 'setting' ? t('table.concealedName.setting') : t('table.concealedName.inferred')
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 cursor-help text-p365-grey-500"
    >
      <EyeOff className="size-3.5" aria-hidden="true" />
    </span>
  )
}
