import { ShellLayout } from './AppShell'
import { HeaderFrame, TenantSkeleton } from './Header'
import type { LoadingStage } from './loadingStage'
import { ReportLoading } from './ReportLoading'

export function LoadingShell({ stage }: { stage: LoadingStage }) {
  return (
    <ShellLayout header={<HeaderFrame tenant={<TenantSkeleton />} />}>
      <ReportLoading stage={stage} />
    </ShellLayout>
  )
}
