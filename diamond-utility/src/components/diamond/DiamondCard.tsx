import { countKind, folderIds, type Diamond, type DiamondStatus } from '../../models/diamond'
import { IconArrow, IconCheck } from '../common/Icon'

interface DiamondCardProps {
  diamond: Diamond
  selectedIds: string[]
  onToggleDiamond: () => void
  onToggleFolder: (id: string) => void
  onDetails: () => void
}

export function DiamondCard({
  diamond,
  selectedIds,
  onToggleDiamond,
  onToggleFolder,
  onDetails,
}: DiamondCardProps) {
  const ids = folderIds(diamond)
  const selectedCount = ids.filter((id) => selectedIds.includes(id)).length
  const allSelected = ids.length > 0 && selectedCount === ids.length
  const someSelected = selectedCount > 0 && !allSelected

  return (
    <article className={`diamond-card${allSelected ? ' is-selected' : ''}${someSelected ? ' is-partial' : ''}`}>
      <div className="card-top">
        <button
          type="button"
          className={`check${allSelected ? ' is-on' : ''}${someSelected ? ' is-partial' : ''}`}
          aria-pressed={allSelected}
          onClick={onToggleDiamond}
          aria-label={`Select all folders for ${diamond.baseName}`}
        >
          <IconCheck size={12} />
        </button>
        <div>
          <div className="card-title">{diamond.baseName}</div>
          <div className="card-sub">Diamond group</div>
        </div>
        <div className="push">
          {diamond.folders.length} folder{diamond.folders.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="folder-list">
        {diamond.folders.map((folder) => {
          const selected = selectedIds.includes(folder.id)
          const mp4 = countKind(folder, 'mp4')
          return (
            <button
              key={folder.id}
              type="button"
              className={`folder-row${selected ? ' is-selected' : ''}`}
              onClick={() => onToggleFolder(folder.id)}
            >
              <span className={`check${selected ? ' is-on' : ''}`}>
                <IconCheck size={12} />
              </span>
              <span className="folder-name">{folder.folderName}</span>
              <span className="folder-meta">
                {folder.isBase ? 'Base' : folder.variant}
                {' · '}
                {!folder.accessible ? 'Error' : mp4 > 0 ? `MP4 ${mp4}` : 'No MP4'}
              </span>
            </button>
          )
        })}
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
