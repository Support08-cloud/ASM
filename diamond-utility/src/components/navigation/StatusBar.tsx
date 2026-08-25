import { useAppStore } from '../../app/state/AppStateContext'
import { formatRelativeTime } from '../../utils/format'

export function StatusBar() {
  const { state } = useAppStore()
  const processing = state.phase === 'processing' && state.processProgress

  return (
    <footer className="status-bar">
      <span className={`dot${processing ? ' busy' : state.phase === 'scan_error' ? ' err' : ''}`} />
      <strong>{processing ? 'Processing' : state.phase === 'scanning' ? 'Scanning' : 'Ready'}</strong>
      {processing ? (
        <span>
          {Math.min(processing.diamondIndex + 1, processing.diamondTotal)} of {processing.diamondTotal} completed
        </span>
      ) : (
        <span>{state.diamonds.length.toLocaleString()} diamonds</span>
      )}
      <span>Last scan: {formatRelativeTime(state.lastScanAt)}</span>
      <span className="push">v1.0.0</span>
    </footer>
  )
}
