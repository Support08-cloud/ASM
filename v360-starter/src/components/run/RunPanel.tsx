import { useAppStore } from '../../app/state/store-context'
import type { RunProgress } from '../../models/app'

export function RunPanel({ progress }: { progress: RunProgress }) {
  const { cancelRun } = useAppStore()
  const percent = Math.round(progress.percent)

  return (
    <div className="run-layout">
      <div className="run-card">
        <div className="eyebrow">Task running</div>
        <h2>
          {Math.min(progress.index + 1, progress.total)} of {progress.total}
        </h2>
        <p className="mono">{progress.currentLabel || 'Finishing up'}</p>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="mono">{percent}%</p>
        <div className="btn-row" style={{ justifyContent: 'center', marginTop: 20 }}>
          <button type="button" className="btn ghost" onClick={cancelRun}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
