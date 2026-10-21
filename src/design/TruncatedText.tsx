import { useLayoutEffect, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function isCut(element: HTMLElement) {
  return element.scrollWidth > element.clientWidth
}

export function TruncatedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setTruncated(isCut(element))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [text])

  return (
    <Tooltip disabled={!truncated}>
      <TooltipTrigger
        render={
          <span
            ref={ref}
            tabIndex={truncated ? 0 : undefined}
            className={cn(
              'block min-w-0 truncate rounded-sm focus-visible:outline-2 focus-visible:outline-p365-teal',
              className,
            )}
          />
        }
      >
        {text}
      </TooltipTrigger>
      <TooltipContent className="max-w-80 text-left leading-snug font-normal break-words">{text}</TooltipContent>
    </Tooltip>
  )
}
