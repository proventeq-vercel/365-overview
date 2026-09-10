import { Card, CardContent } from '@/components/ui/card'

export type PostureTone = 'good' | 'watch' | 'bad' | 'neutral'

const TONE_COLORS: Record<PostureTone, string> = {
  good: '#34a1a0',
  watch: '#eab000',
  bad: '#f98d50',
  neutral: '#6b7280',
}

interface PostureTileProps {
  label: string
  value: string
  tone: PostureTone
  detail?: string
}

export function PostureTile({ label, value, tone, detail }: PostureTileProps) {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: TONE_COLORS[tone] }} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-semibold text-ink">{value}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </CardContent>
    </Card>
  )
}
