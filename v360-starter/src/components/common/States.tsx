import type { LoadProgress } from '../../models/app'

export function LoadingPanel({ progress }: { progress: LoadProgress }) {
  const percent = Math.round(progress.percent)

  return (
    <div className="hero-panel">
      <h2>Loading records</h2>
      <div className="scan-orb" aria-hidden="true" />
      <p>{progress.message}</p>
      <p>
        <strong>{progress.itemsSeen.toLocaleString()}</strong> records seen
      </p>
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
    </div>
  )
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}) {
  return (
    <div className="hero-panel">
      <div className="hero-mark neutral" aria-hidden="true">
        ◇
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      {actionLabel && onAction ? (
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn primary" onClick={onAction}>
            {actionLabel}
          </button>
          {secondaryLabel && onSecondary ? (
            <button type="button" className="btn ghost" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title,
  source,
  detail,
  onRetry,
}: {
  title: string
  source?: string
  detail: string
  onRetry: () => void
}) {
  return (
    <div className="hero-panel">
      <div className="hero-mark bad" aria-hidden="true">
        ✕
      </div>
      <h2>{title}</h2>
      {source ? <p className="mono">{source}</p> : null}
      <p>{detail}</p>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button type="button" className="btn primary" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="card-grid">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton skel-card" />
      ))}
    </div>
  )
}
