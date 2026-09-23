import { EmptyState, ErrorState, LoadingPanel } from '../components/common/States'
import { IconRefresh, IconSource } from '../components/common/Icon'
import { PageHeader } from '../components/navigation/PageHeader'
import { RecordCard } from '../components/records/RecordCard'
import { APP } from '../app.config'
import { useAppStore } from '../app/state/store-context'
import { summarize } from '../services/task-runner'
import { formatBytes, formatCount, formatRelativeTime } from '../utils/format'

export function DashboardPage() {
  const { state, dispatch, loadSample, reload } = useAppStore()

  if (state.phase === 'loading' && state.loadProgress) {
    return <LoadingPanel progress={state.loadProgress} />
  }

  if (state.phase === 'load_error' && state.loadError) {
    return (
      <ErrorState
        title={state.loadError.title}
        detail={state.loadError.detail}
        source={state.loadError.source}
        onRetry={() => void reload()}
      />
    )
  }

  if (state.records.length === 0) {
    return (
      <EmptyState
        title={`Welcome to ${APP.name}`}
        body="No source is connected yet. Load the sample dataset to explore the full workflow, then replace the loader with your own data source."
        actionLabel="Load sample dataset"
        onAction={() => void loadSample()}
      />
    )
  }

  const totals = summarize(state.records)
  const attention = state.records.filter((record) => record.status !== 'ready').length

  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE"
        title="Dashboard"
        description="Overview of everything loaded from the connected source."
        meta={<span>Last load: {formatRelativeTime(state.lastLoadedAt)}</span>}
        actions={
          <div className="btn-row">
            <button type="button" className="btn ghost" onClick={() => void reload()}>
              <IconRefresh size={16} />
              Reload
            </button>
            <button type="button" className="btn primary" onClick={() => dispatch({ type: 'navigate', route: 'records' })}>
              Open records
            </button>
          </div>
        }
      />

      <div className="path-grid">
        <div className="path-card">
          <div className="path-card-top">
            <div className="path-row">
              <span className="path-icon">
                <IconSource size={16} />
              </span>
              <div>
                <div className="eyebrow">Source</div>
                <div className="path-value">{state.sourceLabel ?? 'Not connected'}</div>
              </div>
            </div>
          </div>
          <div className="path-foot">
            <span>{formatCount(state.records.length, 'record')}</span>
            <span>{formatBytes(totals.sizeBytes)}</span>
          </div>
        </div>

        <div className="path-card">
          <div className="path-card-top">
            <div className="path-row">
              <div>
                <div className="eyebrow">Summary</div>
                <div className="results-count">{formatCount(totals.itemCount, 'item')}</div>
              </div>
            </div>
          </div>
          <div className="path-foot">
            <span>{attention === 0 ? 'All records ready' : `${attention} need attention`}</span>
            <span>{formatCount(state.history.length, 'run')} in history</span>
          </div>
        </div>
      </div>

      <h2 className="section-label">Recently updated</h2>
      <div className="card-grid">
        {state.records.slice(0, 4).map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            selected={state.selectedIds.includes(record.id)}
            onToggle={() => dispatch({ type: 'toggle-select', id: record.id })}
            onOpenDetails={() => dispatch({ type: 'open-details', id: record.id })}
          />
        ))}
      </div>
    </>
  )
}
