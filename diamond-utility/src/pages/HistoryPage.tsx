import { useAppStore } from '../app/state/AppStateContext'
import { EmptyState } from '../components/common/States'
import { PageHeader } from '../components/navigation/PageHeader'
import { StatusBadge } from '../components/diamond/DiamondCard'
import type { DiamondStatus } from '../models/diamond'

export function HistoryPage() {
  const { state, dispatch } = useAppStore()

  return (
    <>
      <PageHeader
        eyebrow="Data"
        title="History"
        description="Previous Get MP4 runs on this machine."
        actions={
          state.history.length > 0 ? (
            <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'clear-history' })}>
              Clear history
            </button>
          ) : null
        }
      />
      {state.history.length === 0 ? (
        <EmptyState title="No history yet" body="Completed operations will be listed here." />
      ) : (
        <div className="history-list">
          {state.history.map((record) => (
            <article key={record.id} className="history-item">
              <div>
                <strong>
                  {record.diamondCount} diamond{record.diamondCount === 1 ? '' : 's'}
                </strong>
                <p>
                  {new Date(record.finishedAt).toLocaleString()} · {record.copied} copied
                  {record.failed ? ` · ${record.failed} failed` : ''}
                </p>
                <p className="mono">{record.outputPath}</p>
              </div>
              <StatusBadge status={outcomeStatus(record.outcome)} />
            </article>
          ))}
        </div>
      )}
    </>
  )
}

function outcomeStatus(outcome: 'success' | 'partial' | 'error'): DiamondStatus {
  if (outcome === 'success') return 'ready'
  if (outcome === 'partial') return 'warning'
  return 'error'
}
