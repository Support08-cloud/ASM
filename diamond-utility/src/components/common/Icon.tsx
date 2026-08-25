import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconDiamond(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 4.8 9.6 12 21l7.2-11.4L12 3Z" />
      <path d="M4.8 9.6h14.4M8.2 9.6 12 21 15.8 9.6 12 3 8.2 9.6Z" />
    </Svg>
  )
}

export function IconDashboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </Svg>
  )
}

export function IconOperations(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M12 5v14" />
      <circle cx="12" cy="12" r="8" />
    </Svg>
  )
}

export function IconHistory(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 13a8 8 0 1 0 2.2-5.5" />
      <path d="M4 5v4h4" />
      <path d="M12 8v5l3 2" />
    </Svg>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" />
    </Svg>
  )
}

export function IconFolder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H9l2 2h7.5A2.5 2.5 0 0 1 21 10.5v7A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z" />
    </Svg>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12 5 5 9-10" />
    </Svg>
  )
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function IconArrow(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  )
}

export function IconWarning(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4 3 19h18L12 4Z" />
      <path d="M12 10v4M12 16.5v.5" />
    </Svg>
  )
}
