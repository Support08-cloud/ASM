import { countKind, type Diamond } from '../../models/diamond'
import { IconClose } from '../common/Icon'

interface DiamondDetailsDrawerProps {
  diamond: Diamond
  sourcePath: string | null
  onClose: () => void
}

export function DiamondDetailsDrawer({ diamond, sourcePath, onClose }: DiamondDetailsDrawerProps) {
  return (
    <>
      <button type="button" className="drawer-scrim" aria-label="Close details" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-labelledby="drawer-title">
        <header className="drawer-head">
          <div>
            <div className="eyebrow">Diamond</div>
            <h2 id="drawer-title" className="card-title" style={{ margin: '4px 0 0' }}>
              {diamond.baseName}
            </h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>
        <div className="drawer-body">
          <div className="eyebrow">Source</div>
          <p className="mono" style={{ marginTop: 8 }}>
            {sourcePath ?? '—'}
          </p>
          <div className="eyebrow" style={{ marginTop: 24 }}>
            Views
          </div>
          {diamond.views.map((view) => {
            const mp4 = countKind(view, 'mp4')
            const json = countKind(view, 'json')
            const images = countKind(view, 'image')
            const icon = !view.accessible ? '✕' : mp4 === 0 ? '⚠' : '✓'
            return (
              <div key={view.id} className="view-block">
                <h4>
                  {icon} {view.view} · {view.folderName}
                </h4>
                {view.accessible ? (
                  <div className="file-meta">
                    <span>{mp4 ? 'MP4 ✓' : 'MP4 Missing'}</span>
                    <span>{json ? 'JSON ✓' : 'JSON Missing'}</span>
                    <span>{images ? `Images ${images}` : 'Images Missing'}</span>
                  </div>
                ) : (
                  <p>
                    Unable to read this folder.
                    <br />
                    {view.relativePath}
                    <br />
                    {view.errorMessage}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}
