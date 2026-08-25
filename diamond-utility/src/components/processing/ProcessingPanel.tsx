import type { ProcessProgress } from '../../models/processing'

export function ProcessingPanel({
  progress,
  onCancel,
}: {
  progress: ProcessProgress
  onCancel: () => void
}) {
  const currentJob = progress.jobs[progress.diamondIndex] ?? progress.jobs[0]
  return (
    <div className="process-layout">
      <div className="process-card">
        <div className="eyebrow">Get MP4</div>
        <h2 style={{ marginTop: 8 }}>
          Processing {Math.min(progress.diamondIndex + 1, progress.diamondTotal)} of {progress.diamondTotal}
        </h2>
        <p className="card-title" style={{ marginTop: 12 }}>
          {progress.currentDiamond}
        </p>
        <div className="process-steps">
          {(currentJob?.steps ?? []).map((step) => (
            <div
              key={step.viewId}
              className={`step${step.status === 'running' ? ' is-run' : ''}${step.status === 'done' ? ' is-done' : ''}${step.status === 'error' ? ' is-err' : ''}`}
            >
              <span>{stepMark(step.status)}</span>
              <span>
                {step.viewLabel}
                {step.currentFile ? ` · ${step.currentFile}` : ''}
              </span>
            </div>
          ))}
        </div>
        {progress.currentFile ? (
          <p>
            Current:
            <br />
            <span className="mono">{progress.currentFile}</span>
          </p>
        ) : null}
        <div className="progress-track" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <p style={{ marginTop: 8 }}>{progress.percent}%</p>
        <button type="button" className="btn danger" onClick={onCancel} style={{ marginTop: 16 }}>
          Cancel Processing
        </button>
      </div>
    </div>
  )
}

function stepMark(status: string): string {
  if (status === 'done') return '✓'
  if (status === 'running') return '⟳'
  if (status === 'error') return '✕'
  if (status === 'skipped') return '–'
  return '○'
}
