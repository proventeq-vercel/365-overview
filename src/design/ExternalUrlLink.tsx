import { urlPathname } from '@/lib/url'

interface ExternalUrlLinkProps {
  href: string
  label?: string
}

export function ExternalUrlLink({ href, label }: ExternalUrlLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      onClick={(event) => event.stopPropagation()}
      className="block max-w-full truncate text-xs font-normal text-p365-teal transition-colors duration-150 ease-out hover:underline"
    >
      {label ?? urlPathname(href)}
    </a>
  )
}
