import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function DescribedMenuItem({
  icon: Icon,
  label,
  description,
  iconClassName,
  ...props
}: Omit<ComponentProps<typeof DropdownMenuItem>, 'children'> & {
  icon: LucideIcon
  label: string
  description: string
  iconClassName?: string
}) {
  return (
    <DropdownMenuItem {...props}>
      <Icon aria-hidden="true" className={cn('mt-0.5 text-p365-teal', iconClassName)} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold text-p365-navy">{label}</span>
        <span className="text-xs text-p365-grey-500">{description}</span>
      </span>
    </DropdownMenuItem>
  )
}
