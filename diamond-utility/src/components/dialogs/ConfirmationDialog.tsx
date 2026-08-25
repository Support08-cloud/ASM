import { countKind } from '../../models/diamond'
import type { ConfirmSummary } from '../../models/processing'

interface ConfirmationDialogProps {
  summary: ConfirmSummary
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmationDialog({ summary, onCancel, onConfirm }: ConfirmationDialogProps) {
  return (
    <>
      <button type="button" className="modal-scrim" aria-label="Cancel" onClick={onCancel} />
      <div className="modal" role="dialog" aria-labelledby="confirm-title">
        <header className="modal-head">
          <h2 id="confirm-title" style={{ margin: 0, fontSize: 18 }}>
            Get MP4
          </h2>
        </header>
        <div className="modal-body">
          <p>You're about to process:</p>
          <p>
            <strong>
              {summary.diamondCount} diamond group{summary.diamondCount === 1 ? '' : 's'}
            </strong>
            <br />
            <strong>
              {summary.folderCount} selected folder{summary.folderCount === 1 ? '' : 's'}
            </strong>
            <br />
            {summary.mp4Count} MP4 file{summary.mp4Count === 1 ? '' : 's'} copied into one folder per diamond
          </p>
          <div className="output-preview">
            <div className="mono">{summary.outputPath}</div>
            {summary.diamonds.map((diamond) => (
              <div key={diamond.id} className="output-group">
                <div className="folder-name">└── {diamond.baseName}</div>
                {diamond.folders.map((folder, index) => {
                  const last = index === diamond.folders.length - 1
                  const mp4 = countKind(folder, 'mp4')
                  return (
                    <div key={folder.id} className="folder-meta" style={{ marginLeft: 24 }}>
                      {last ? '└──' : '├──'} {folder.folderName}.mp4
                      {mp4 === 0 ? ' (skipped — no MP4)' : ''}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <p>MP4s are renamed to the source folder name. The base folder is included only if you selected it. Source files will not be modified.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={onConfirm} autoFocus>
            Get MP4 →
          </button>
        </div>
      </div>
    </>
  )
}
