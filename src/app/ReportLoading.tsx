import { env } from '@/config/env'
import { LoadingOverlay, type LoadingChecklistItem } from '@/design/LoadingOverlay'
import { ReportSkeleton } from '@/design/ReportSkeleton'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import { LOADING_STAGES, type LoadingStage } from './loadingStage'

function checklistFor(stage: LoadingStage, t: TranslateFn): LoadingChecklistItem[] {
  const current = LOADING_STAGES.indexOf(stage)
  return LOADING_STAGES.map((key, index) => ({
    key,
    label: t(`loading.${key}.checklist`),
    state: index < current ? 'done' : index === current ? 'active' : 'pending',
  }))
}

export function ReportLoading({ stage, signsIn = env.usesMsal }: { stage: LoadingStage; signsIn?: boolean }) {
  const t = useTranslation()
  return (
    <div className="relative">
      <ReportSkeleton />
      <LoadingOverlay
        badge={t(`loading.${stage}.badge`)}
        title={t(`loading.${stage}.title`)}
        subtitle={t(`loading.${stage}.subtitle`)}
        footer={t(`loading.${stage}.footer`)}
        step={t(`loading.${stage}.step`)}
        checklist={signsIn ? checklistFor(stage, t) : undefined}
      />
    </div>
  )
}
