interface RenderOverlayProps {
  percent: number
  message: string
  onCancel: () => void
  remainingLabel?: string
}

export function RenderOverlay({ percent, message, onCancel, remainingLabel }: RenderOverlayProps) {
  const radius = 54
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ

  return (
    <div className="v360-render">
      <h1>Rendering Project</h1>
      <div className="v360-ring">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} />
          <circle cx="60" cy="60" r={radius} strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <div>
          <strong>{Math.round(percent)}%</strong>
          <span>Complete</span>
        </div>
      </div>
      <div className="v360-render-meta">
        <div>
          <span>Current Task</span>
          <strong>{message || 'Preparing export'}</strong>
        </div>
        <div>
          <span>Time Remaining</span>
          <strong className="is-accent">{remainingLabel ?? (percent >= 100 ? '00:00' : '—')}</strong>
        </div>
        <div>
          <span>Progress</span>
          <strong>{Math.round(percent)} / 100</strong>
        </div>
      </div>
      <button type="button" className="v360-ghost" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
