import { useEffect, useRef } from 'react'
import { IconSearch } from '../common/Icon'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  resultLabel: string
}

export function SearchBar({ value, onChange, resultLabel }: SearchBarProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        ref.current?.focus()
        ref.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <label className="search-field">
      <IconSearch />
      <input
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search diamond (e.g. 260602-362)"
        aria-label="Search diamonds"
      />
      <span className="kbd" title={resultLabel}>
        ⌘ / Ctrl+F
      </span>
    </label>
  )
}
