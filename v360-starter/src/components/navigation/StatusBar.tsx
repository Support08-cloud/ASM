import { APP } from '../../app.config'
import { useAppStore } from '../../app/state/store-context'
import { formatCount, formatRelativeTime } from '../../utils/format'
import { phaseDotClass, phaseLabel } from '../../utils/phase'

export function StatusBar() {
  const { state } = useAppStore()
  const running = state.phase === 'running' ? state.runProgress : null

  return (
    <footer className="status-bar">
      <span className={`dot${phaseDotClass(state.phase)}`} />
      <strong>{phaseLabel(state.phase)}</strong>
      {running ? (
        <span>
          {Math.min(running.index + 1, running.total)} of {running.total} completed
        </span>
      ) : (
        <span>{formatCount(state.records.length, 'record')}</span>
      )}
      <span>Last load: {formatRelativeTime(state.lastLoadedAt)}</span>
      <span className="push">v{APP.version}</span>
    </footer>
  )
}
