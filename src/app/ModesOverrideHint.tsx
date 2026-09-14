import { MODES_RESET_PARAM, MODES_RESET_VALUE } from '@/config/modes'
import { useTranslation } from '@/hooks/useTranslation'

export function ModesOverrideHint() {
  const t = useTranslation()
  return (
    <p className="text-sm text-p365-grey-600">
      {t('app.modes.overridden')}{' '}
      <a
        href={`?${MODES_RESET_PARAM}=${MODES_RESET_VALUE}`}
        className="font-semibold text-p365-teal underline-offset-2 hover:underline"
      >
        {t('app.modes.reset')}
      </a>
    </p>
  )
}
