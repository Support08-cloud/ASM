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
          <p>
            Output folder: <span className="mono">{diamond.baseName}</span>
          </p>
          <div className="eyebrow" style={{ marginTop: 24 }}>
            Related folders
          </div>
          {diamond.folders.map((folder) => {
            const mp4 = countKind(folder, 'mp4')
            const icon = !folder.accessible ? '✕' : mp4 === 0 ? (folder.isBase ? '○' : '⚠') : '✓'
            return (
              <div key={folder.id} className="view-block">
                <h4>
                  {icon} {folder.folderName}
                  {folder.isBase ? ' · Base' : ` · ${folder.variant}`}
                </h4>
                {folder.accessible ? (
                  <div className="file-meta">
                    <span>{mp4 ? `MP4 ✓ → ${folder.folderName}.mp4` : folder.isBase ? 'No MP4 (not required)' : 'MP4 Missing'}</span>
                  </div>
                ) : (
                  <p>
                    Unable to read this folder.
                    <br />
                    {folder.relativePath}
                    <br />
                    {folder.errorMessage}
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
