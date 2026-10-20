interface SelectionToolbarProps {
  count: number
  disabled: boolean
  reason?: string
  onClear: () => void
  onProcess: () => void
  onMerge: () => void
}

export function SelectionToolbar({ count, disabled, reason, onClear, onProcess, onMerge }: SelectionToolbarProps) {
  return (
    <div className="selection-bar">
      <div>
        <div className="selection-copy">
          {count} folder{count === 1 ? '' : 's'} selected
        </div>
        {reason ? <div className="selection-sub">{reason}</div> : null}
        <button type="button" className="btn" onClick={onClear} disabled={count === 0}>
          Clear Selection
        </button>
      </div>
      <div className="btn-row">
        <button type="button" className="btn" onClick={onMerge} disabled={disabled} title={reason}>
          Edit & merge
        </button>
        <button type="button" className="btn primary" onClick={onProcess} disabled={disabled} title={reason}>
          Get MP4 →
        </button>
      </div>
    </div>
  )
}
