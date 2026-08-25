interface SelectionToolbarProps {
  count: number
  disabled: boolean
  onClear: () => void
  onProcess: () => void
}

export function SelectionToolbar({ count, disabled, onClear, onProcess }: SelectionToolbarProps) {
  if (count === 0) return null

  return (
    <div className="selection-bar">
      <div>
        <div className="selection-copy">
          {count} diamond{count === 1 ? '' : 's'} selected
        </div>
        <button type="button" className="btn" onClick={onClear}>
          Clear Selection
        </button>
      </div>
      <button type="button" className="btn primary" onClick={onProcess} disabled={disabled}>
        Get MP4 →
      </button>
    </div>
  )
}
