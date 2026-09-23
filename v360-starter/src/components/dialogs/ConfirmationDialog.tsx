import { useAppStore } from '../../app/state/store-context'
import { formatBytes, formatCount } from '../../utils/format'

export function ConfirmationDialog() {
  const { state, dispatch, confirmSummary, confirmRun } = useAppStore()
  if (state.phase !== 'confirming' || !confirmSummary) return null

  const preview = confirmSummary.records.slice(0, 4).map((record) => record.code)
  const remainder = confirmSummary.records.length - preview.length

  return (
    <>
      <div className="modal-scrim" onClick={() => dispatch({ type: 'cancel-confirm' })} />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="modal-head">
          <h2 id="confirm-title">Run task</h2>
        </div>
        <div className="modal-body">
          <p>
            <strong>{formatCount(confirmSummary.recordCount, 'record')}</strong> selected —{' '}
            {formatCount(confirmSummary.itemCount, 'item')}, {formatBytes(confirmSummary.sizeBytes)}.
          </p>
          <p className="mono">
            {preview.join(', ')}
            {remainder > 0 ? ` +${remainder} more` : ''}
          </p>
          <p>Source records are never modified.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'cancel-confirm' })}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={() => void confirmRun()}>
            Start run
          </button>
        </div>
      </div>
    </>
  )
}
