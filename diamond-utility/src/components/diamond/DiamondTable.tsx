import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import type { Diamond } from '../../models/diamond'
import { IconCheck } from '../common/Icon'
import { StatusBadge } from './DiamondCard'

interface DiamondTableProps {
  diamonds: Diamond[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onDetails: (id: string) => void
}

export function DiamondTable({ diamonds, selectedIds, onToggle, onDetails }: DiamondTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: diamonds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 12,
  })

  return (
    <div className="list-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 44 }} />
            <th>Diamond</th>
            <th>Views</th>
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
            const selected = selectedIds.includes(diamond.id)
            return (
              <div
                key={diamond.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${row.start}px)`,
                }}
              >
                <table className="data-table">
                  <tbody>
                    <tr
                      className={selected ? 'is-selected' : undefined}
                      onClick={() => onToggle(diamond.id)}
                    >
                      <td style={{ width: 44 }}>
                        <span className={`check row-check${selected ? ' is-on' : ''}`}>
                          <IconCheck size={12} />
                        </span>
                      </td>
                      <td className="table-name">{diamond.baseName}</td>
                      <td>{diamond.views.length}</td>
                      <td>
                        {diamond.mp4.found} / {diamond.mp4.expected}
                      </td>
                      <td>
                        <StatusBadge status={diamond.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn"
                          onClick={(event) => {
                            event.stopPropagation()
                            onDetails(diamond.id)
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
