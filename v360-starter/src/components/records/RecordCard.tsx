import { IconCheck } from '../common/Icon'
import { formatBytes, formatCount, formatRelativeTime } from '../../utils/format'
import type { RecordItem } from '../../models/app'

interface RecordCardProps {
  record: RecordItem
  selected: boolean
  dense?: boolean
  onToggle: () => void
  onOpenDetails: () => void
}

export function RecordCard({ record, selected, dense = false, onToggle, onOpenDetails }: RecordCardProps) {
  return (
    <article className={`record-card${selected ? ' is-selected' : ''}${dense ? ' is-dense' : ''}`}>
      <div className="card-top">
        <button
          type="button"
          className={`check${selected ? ' is-on' : ''}`}
          aria-pressed={selected}
          aria-label={`Select ${record.code}`}
          onClick={onToggle}
        >
          <IconCheck size={12} />
        </button>
        <div>
          <div className="card-title">{record.code}</div>
          <div className="card-sub">{record.label}</div>
        </div>
        <span className={`status-badge ${record.status} push`}>
          <span className="mark" />
          {record.status}
        </span>
      </div>

      <div className="file-meta">
        <span>{formatCount(record.itemCount, 'item')}</span>
        <span>{formatBytes(record.sizeBytes)}</span>
        <span>{formatRelativeTime(record.updatedAt)}</span>
      </div>

      <div className="card-actions">
        <div className="view-pills">
          {record.tags.map((tag) => (
            <span key={tag} className="view-pill">
              {tag}
            </span>
          ))}
        </div>
        <button type="button" className="btn" onClick={onOpenDetails}>
          Details
        </button>
      </div>
    </article>
  )
}
