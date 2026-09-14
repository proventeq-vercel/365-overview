import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface Props extends Omit<ComponentProps<'input'>, 'prefix'> {
  prefix?: string
  suffix?: string
}

export function AdornedInput({ prefix, suffix, className, ...props }: Props) {
  return (
    <div
      className={cn(
        'flex h-9 items-center rounded-lg border border-p365-grey-100 bg-white text-sm transition-[border-color,box-shadow] duration-150 focus-within:border-p365-teal focus-within:ring-3 focus-within:ring-p365-teal/20',
        className,
      )}
    >
      {prefix && (
        <span className="pl-3 text-p365-grey-500" aria-hidden="true">
          {prefix}
        </span>
      )}
      <input
        className="tabular min-w-0 flex-1 bg-transparent px-2 py-1.5 text-p365-navy outline-none placeholder:text-p365-grey-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...props}
      />
      {suffix && (
        <span className="whitespace-nowrap pr-3 text-p365-grey-500" aria-hidden="true">
          {suffix}
        </span>
      )}
    </div>
  )
}
