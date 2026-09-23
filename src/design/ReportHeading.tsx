import { useTranslation } from '@/hooks/useTranslation'
import { formatDay } from '@/lib/format'

export function ReportHeading({
  title,
  description,
  reportRefreshDate,
}: {
  title: string
  description: string
  reportRefreshDate: string
}) {
  const t = useTranslation()
  return (
    <div className="enter-rise flex flex-col gap-1">
      <h1 className="text-xl font-semibold text-p365-navy">{title}</h1>
      <p className="text-sm text-p365-grey-500">
        {description}{' '}
        {reportRefreshDate && <>{t('app.dataAsOf', { date: formatDay(reportRefreshDate) })} </>}
        {t('app.reportLagNote')}
      </p>
    </div>
  )
}
