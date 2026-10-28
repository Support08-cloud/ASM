import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { countKind, folderIds, type Diamond } from '../../models/diamond'
import { IconCheck } from '../common/Icon'
import { StatusBadge } from './DiamondCard'

interface DiamondTableProps {
  diamonds: Diamond[]
  selectedIds: string[]
  onToggleDiamond: (diamond: Diamond) => void
  onToggleFolder: (id: string) => void
  onDetails: (id: string) => void
}

export function DiamondTable({
  diamonds,
  selectedIds,
  onToggleDiamond,
  onToggleFolder,
  onDetails,
}: DiamondTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: diamonds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => 52 + diamonds[index].folders.length * 40,
    overscan: 8,
  })

  return (
    <div className="list-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 44 }} />
            <th>Diamond</th>
            <th>Related folders</th>
            <th>MP4</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
      </table>
      <div className="virtual-list" ref={parentRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((row) => {
            const diamond = diamonds[row.index]
            const ids = folderIds(diamond)
            const selectedCount = ids.filter((id) => selectedIds.includes(id)).length
            const allSelected = ids.length > 0 && selectedCount === ids.length
            const someSelected = selectedCount > 0 && !allSelected
            return (
              <div
                key={diamond.id}
                data-index={row.index}
                ref={virtualizer.measureElement}
                className="list-group"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${row.start}px)`,
                }}
              >
                <div
                  className={`list-group-head${allSelected ? ' is-selected' : ''}${someSelected ? ' is-partial' : ''}`}
                >
                  <button
                    type="button"
                    className={`check${allSelected ? ' is-on' : ''}${someSelected ? ' is-partial' : ''}`}
                    aria-pressed={allSelected}
                    onClick={() => onToggleDiamond(diamond)}
                    aria-label={`Select all folders for ${diamond.baseName}`}
                  >
                    <IconCheck size={12} />
                  </button>
                  <div>
                    <div className="table-name">{diamond.baseName}</div>
                    <div className="card-sub">
                      {diamond.folders.length} related folder{diamond.folders.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="folder-meta" style={{ marginLeft: 0 }}>
                    {diamond.mp4.found} / {diamond.mp4.expected} MP4
                  </div>
                  <StatusBadge status={diamond.status} />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onDetails(diamond.id)}
                  >
                    Details
                  </button>
                </div>
                <div className="folder-list list-folders">
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
                          {folder.isBase ? 'Base' : `-${folder.variant}`}
                          {' · '}
                          {!folder.accessible ? 'Error' : mp4 > 0 ? `MP4 ${mp4}` : 'No MP4'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
