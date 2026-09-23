import { EmptyState } from '../components/common/States'
import { PageHeader } from '../components/navigation/PageHeader'
import { useAppStore } from '../app/state/store-context'
import { formatCount, formatRelativeTime } from '../utils/format'

export function HistoryPage() {
  const { state, dispatch } = useAppStore()

  if (state.history.length === 0) {
    return (
      <>
        <PageHeader eyebrow="DATA" title="History" description="Every completed run is recorded here." />
        <EmptyState title="No runs yet" body="Run a task from the Records page and it will show up here." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="DATA"
        title="History"
        description="Every completed run is recorded here."
        actions={
          <button type="button" className="btn danger" onClick={() => dispatch({ type: 'clear-history' })}>
            Clear history
          </button>
        }
      />

      <div className="stack-list">
        {state.history.map((record) => (
          <div key={record.id} className="stack-item">
            <div>
              <div className="stack-title">
                <span className={`status-badge ${toneFor(record.outcome)}`}>
                  <span className="mark" />
                  {record.outcome}
                </span>
                <span>{formatCount(record.recordCount, 'record')}</span>
              </div>
              <p className="mono">{record.recordNames.slice(0, 5).join(', ')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>
                {record.processed} processed · {record.skipped} skipped · {record.failed} failed
              </div>
              <p>{formatRelativeTime(record.finishedAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function toneFor(outcome: string): string {
  if (outcome === 'success') return 'ready'
  if (outcome === 'partial') return 'warning'
  return 'error'
}
