import { AlertPanel } from '@/design/AlertPanel'

export function NoReports() {
  return (
    <AlertPanel tone="warn" title="No report is enabled in this build">
      <p className="text-sm text-p365-grey-600">
        VITE_FEATURES names no report this app knows. Enable at least one feature flag and rebuild.
      </p>
    </AlertPanel>
  )
}
