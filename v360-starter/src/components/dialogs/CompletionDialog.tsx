import { useAppStore } from '../../app/state/store-context'
import { formatCount } from '../../utils/format'

const HERO: Record<string, { mark: string; tone: string; title: string }> = {
  success: { mark: '✓', tone: 'ok', title: 'Run complete' },
  partial: { mark: '⚠', tone: 'warn', title: 'Completed with issues' },
  error: { mark: '✕', tone: 'bad', title: 'Run failed' },
}

export function CompletionDialog() {
  const { state, dispatch } = useAppStore()
  const result = state.runResult
  if (state.phase !== 'completed' || !result) return null

  const hero = HERO[result.outcome] ?? HERO.success!

  return (
    <>
      <div className="modal-scrim" onClick={() => dispatch({ type: 'dismiss-completion' })} />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <div className="modal-body" style={{ textAlign: 'center', paddingTop: 24 }}>
          <div className={`hero-mark ${hero.tone}`} style={{ margin: '0 auto 12px' }} aria-hidden="true">
            {hero.mark}
          </div>
          <h2 id="completion-title" style={{ margin: '0 0 8px' }}>
            {hero.title}
          </h2>
          <p>
            {formatCount(result.processed, 'record')} processed · {result.skipped} skipped · {result.failed} failed
          </p>
          {result.errorMessage ? <p className="mono">{result.errorMessage}</p> : null}
        </div>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              dispatch({ type: 'dismiss-completion' })
              dispatch({ type: 'navigate', route: 'history' })
            }}
          >
            View history
          </button>
          <button type="button" className="btn primary" onClick={() => dispatch({ type: 'dismiss-completion' })}>
            Done
          </button>
        </div>
      </div>
    </>
  )
}
