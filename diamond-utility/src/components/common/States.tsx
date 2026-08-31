import type { ScanProgress } from '../../models/diamond'
import { IconClose, IconFolder } from './Icon'

export function ScanPanel({ progress }: { progress: ScanProgress }) {
  return (
    <div className="scan-panel">
      <h2>Scanning Diamond Data</h2>
      <div className="scan-orb" aria-hidden="true" />
      <p>{progress.message}</p>
      <p>
        <strong>{progress.foldersScanned.toLocaleString()}</strong> folders scanned
      </p>
      <div className="progress-track" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} role="progressbar">
        <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <p style={{ marginTop: 8 }}>{progress.percent}%</p>
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
    <div className="empty-state">
      <div className="empty-icon">
        <IconFolder size={22} />
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
  path,
  detail,
  onRetry,
}: {
  title: string
  path?: string
  detail: string
  onRetry: () => void
}) {
  return (
    <div className="error-state">
      <div className="hero-mark bad">
        <IconClose size={22} />
      </div>
      <h2>{title}</h2>
      {path ? <p className="mono">{path}</p> : null}
      <p>{detail}</p>
      <div className="btn-row" style={{ marginTop: 16 }}>
        <button type="button" className="btn primary" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  )
}

export function SkeletonGrid() {
  return (
    <div className="card-grid">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="skeleton skel-card" />
      ))}
    </div>
  )
}
