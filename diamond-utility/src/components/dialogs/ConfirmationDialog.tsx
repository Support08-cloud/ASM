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
            <strong>{summary.diamondCount} diamonds</strong>
            <br />
            <strong>{summary.folderCount} source folders</strong>
            <br />
            {summary.mp4Count} MP4 files
          </p>
          <p>
            Output:
            <br />
            <span className="mono">{summary.outputPath}</span>
          </p>
          <p>Source files will not be modified.</p>
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
