import { useLayoutEffect, useRef, useState } from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useExclusiveOpen } from '@/hooks/useExclusiveOpen'
import { cn } from '@/lib/utils'

const HOVER_OPEN_DELAY = 80
const HOVER_CLOSE_DELAY = 120

function isCut(element: HTMLElement) {
  return element.scrollWidth > element.clientWidth
}

export function TruncatedText({ text, className }: { text: string; className?: string }) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [open, setOpen] = useExclusiveOpen()
  const pointerDown = useRef(false)
  const textClassName = cn('block min-w-0 truncate rounded-sm', className)

  useLayoutEffect(() => {
    if (!element) return
    const measure = () => setTruncated(isCut(element))
    measure()
    document.fonts?.ready.then(measure)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [text, element])

  if (!truncated) {
    return (
      <span ref={setElement} className={textClassName}>
        {text}
      </span>
    )
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <PopoverTrigger
        openOnHover
        delay={HOVER_OPEN_DELAY}
        closeDelay={HOVER_CLOSE_DELAY}
        onPointerDown={() => {
          pointerDown.current = true
        }}
        onClick={() => {
          pointerDown.current = false
        }}
        onFocus={() => {
          if (!pointerDown.current) setOpen(true)
          pointerDown.current = false
        }}
        render={
          <button
            ref={setElement}
            type="button"
            className={cn(textClassName, 'w-full text-left focus-visible:outline-2 focus-visible:outline-p365-teal')}
          />
        }
      >
        {text}
      </PopoverTrigger>
      <PopoverContent aria-label={text} initialFocus={false} finalFocus={false} className="leading-snug wrap-anywhere">
        {text}
      </PopoverContent>
    </PopoverPrimitive.Root>
  )
}
