import type { ReactNode } from 'react'

function Icon({ size = 16, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const SearchIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

export const ChevronRightIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)

export const ChevronDownIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

export const ArrowRightIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const HomeIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" />
  </Icon>
)

export const MenuIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
)

export const BookIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19" />
  </Icon>
)

export const FileTextIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6" />
  </Icon>
)
