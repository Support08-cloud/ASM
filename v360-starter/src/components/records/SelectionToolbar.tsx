import { IconPlay } from '../common/Icon'
import { useAppStore } from '../../app/state/store-context'
import { formatBytes, formatCount } from '../../utils/format'
import { summarize } from '../../services/task-runner'

export function SelectionToolbar() {
  const { state, dispatch, selectedRecords, startRun } = useAppStore()
  if (selectedRecords.length === 0) return null

  const totals = summarize(selectedRecords)

  return (
    <div className="selection-bar">
      <div>
        <div className="selection-copy">{formatCount(selectedRecords.length, 'record')} selected</div>
        <div className="selection-sub">
          {formatCount(totals.itemCount, 'item')} · {formatBytes(totals.sizeBytes)}
        </div>
      </div>
      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'clear-selection' })}>
          Clear
        </button>
        <button type="button" className="btn primary" onClick={startRun} disabled={state.phase !== 'ready'}>
          <IconPlay size={16} />
          Run task
        </button>
      </div>
    </div>
  )
}
