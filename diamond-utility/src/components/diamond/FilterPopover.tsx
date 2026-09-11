import { useEffect, useRef, useState } from 'react'
import { COMMON_VARIANTS, type Filters } from '../../models/diamond'
import { activeFilterCount } from '../../services/search'

interface FilterPopoverProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function FilterPopover({ filters, onChange }: FilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const count = activeFilterCount(filters)

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const toggle = <T extends string>(key: keyof Filters, value: T) => {
    const list = filters[key] as T[]
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
    onChange({ ...filters, [key]: next })
  }

  return (
    <div className="filter-wrap" ref={wrapRef}>
      <button type="button" className="btn ghost" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        Filters{count ? ` · ${count}` : ''} ▾
      </button>
      {open ? (
        <div className="filter-pop" role="dialog" aria-label="Filters">
          <div className="filter-group">
            <h4>Variants</h4>
            <button type="button" className="check-line" onClick={() => toggle('variants', 'base')}>
              <span className={`check${filters.variants.includes('base') ? ' is-on' : ''}`} />
              Base folder
            </button>
            {COMMON_VARIANTS.map((variant) => (
              <button key={variant} type="button" className="check-line" onClick={() => toggle('variants', variant)}>
                <span className={`check${filters.variants.includes(variant) ? ' is-on' : ''}`} />
                -{variant}
              </button>
            ))}
          </div>
          <div className="filter-group">
            <h4>MP4</h4>
            {(['available', 'missing', 'multiple'] as const).map((item) => (
              <button key={item} type="button" className="check-line" onClick={() => toggle('mp4', item)}>
                <span className={`check${filters.mp4.includes(item) ? ' is-on' : ''}`} />
                {labelMp4(item)}
              </button>
            ))}
          </div>
          <div className="filter-group">
            <h4>Status</h4>
            {(['ready', 'warning', 'error'] as const).map((item) => (
              <button key={item} type="button" className="check-line" onClick={() => toggle('status', item)}>
                <span className={`check${filters.status.includes(item) ? ' is-on' : ''}`} />
                {capitalize(item)}
              </button>
            ))}
          </div>
          {count > 0 ? (
            <button
              type="button"
              className="btn"
              onClick={() => onChange({ variants: [], mp4: [], status: [] })}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function labelMp4(value: string): string {
  if (value === 'available') return 'Available'
  if (value === 'missing') return 'Missing'
  return 'Multiple'
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}
