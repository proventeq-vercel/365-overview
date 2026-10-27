import { useTranslation } from '@/hooks/useTranslation'

export function ReportDate({ date }: { date: string }) {
  const t = useTranslation()
  return (
    <>
      {date && `${t('app.dataAsOf', { date })} `}
      {t('app.reportLagNote')}
    </>
  )
}
