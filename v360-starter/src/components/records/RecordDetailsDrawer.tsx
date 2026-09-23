import { useEffect } from 'react'
import { IconClose } from '../common/Icon'
import { useAppStore } from '../../app/state/store-context'
import { formatBytes, formatCount, formatRelativeTime } from '../../utils/format'

export function RecordDetailsDrawer() {
  const { dispatch, detailsRecord } = useAppStore()

  useEffect(() => {
    if (!detailsRecord) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'close-details' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [detailsRecord, dispatch])

  if (!detailsRecord) return null

  return (
    <>
      <div className="drawer-scrim" onClick={() => dispatch({ type: 'close-details' })} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">Record</div>
            <h2 id="details-title" style={{ margin: '4px 0 0', fontSize: 18 }}>
              {detailsRecord.code}
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close details"
            onClick={() => dispatch({ type: 'close-details' })}
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="drawer-body">
          <div className="view-block">
            <h4>Label</h4>
            <p className="drawer-value">{detailsRecord.label}</p>
          </div>
          <div className="view-block">
            <h4>Status</h4>
            <span className={`status-badge ${detailsRecord.status}`}>
              <span className="mark" />
              {detailsRecord.status}
            </span>
          </div>
          <div className="view-block">
            <h4>Contents</h4>
            <p className="drawer-value">
              {formatCount(detailsRecord.itemCount, 'item')} · {formatBytes(detailsRecord.sizeBytes)}
            </p>
          </div>
          <div className="view-block">
            <h4>Updated</h4>
            <p className="drawer-value">{formatRelativeTime(detailsRecord.updatedAt)}</p>
          </div>
          <div className="view-block">
            <h4>Tags</h4>
            <div className="view-pills">
              {detailsRecord.tags.map((tag) => (
                <span key={tag} className="view-pill">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
