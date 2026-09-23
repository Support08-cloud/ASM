import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
  meta?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-desc">{description}</p>
        {meta ? <div className="header-meta">{meta}</div> : null}
      </div>
      {actions}
    </header>
  )
}
