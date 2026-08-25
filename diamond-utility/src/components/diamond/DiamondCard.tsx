import { VIEW_TYPES, countKind, type Diamond, type DiamondStatus, type ViewKey } from '../../models/diamond'
import { IconArrow, IconCheck } from '../common/Icon'

interface DiamondCardProps {
  diamond: Diamond
  selected: boolean
  onToggle: () => void
  onDetails: () => void
}

export function DiamondCard({ diamond, selected, onToggle, onDetails }: DiamondCardProps) {
  return (
    <article className={`diamond-card${selected ? ' is-selected' : ''}`}>
      <div className="card-top">
        <button type="button" className="check" aria-pressed={selected} onClick={onToggle} aria-label={`Select ${diamond.baseName}`}>
          <IconCheck size={12} />
        </button>
        <div>
          <div className="card-title">{diamond.baseName}</div>
          <div className="card-sub">Diamond group</div>
        </div>
        <div className="push">
          {diamond.views.length} view{diamond.views.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="view-pills">
        {VIEW_TYPES.map((view) => {
          const match = diamond.views.find((item) => item.view === view)
          return (
            <span key={view} className="view-pill">
              <StatusDot view={view} present={Boolean(match)} ok={Boolean(match && match.accessible && countKind(match, 'mp4') > 0)} error={Boolean(match && !match.accessible)} />
              {view}
            </span>
          )
        })}
      </div>
      <div className="file-meta">
        <span>MP4 {diamond.mp4.found}/{diamond.mp4.expected}</span>
        <span>JSON {diamond.json.found}/{diamond.json.expected}</span>
        <span>Images {diamond.images.found}/{diamond.images.expected}</span>
      </div>
      <div className="card-actions">
        <StatusBadge status={diamond.status} />
        <button type="button" className="btn" onClick={onDetails}>
          View Details
          <IconArrow size={14} />
        </button>
      </div>
    </article>
  )
}

export function StatusBadge({ status }: { status: DiamondStatus }) {
  const label = status === 'ready' ? 'Ready' : status === 'warning' ? 'Warning' : 'Error'
  return (
    <span className={`status-badge ${status}`}>
      <span className="mark" />
      {label}
    </span>
  )
}

function StatusDot({
  present,
  ok,
  error,
}: {
  view: ViewKey
  present: boolean
  ok: boolean
  error: boolean
}) {
  const color = error ? 'var(--status-error)' : ok ? 'var(--status-success)' : present ? 'var(--status-warning)' : 'var(--text-tertiary)'
  return <span className="mark" style={{ width: 8, height: 8, borderRadius: 99, background: color, display: 'inline-block' }} />
}
