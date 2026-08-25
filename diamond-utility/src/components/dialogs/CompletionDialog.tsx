import type { ProcessResult } from '../../models/processing'

export function CompletionDialog({
  result,
  onDone,
  onOpenOutput,
}: {
  result: ProcessResult
  onDone: () => void
  onOpenOutput?: () => void
}) {
  const tone = result.outcome === 'success' ? 'ok' : result.outcome === 'partial' ? 'warn' : 'bad'
  const title =
    result.outcome === 'success'
      ? 'Extraction Complete'
      : result.outcome === 'partial'
        ? 'Completed with warnings'
        : 'Processing Failed'
  const mark = result.outcome === 'success' ? '✓' : result.outcome === 'partial' ? '⚠' : '✕'

  return (
    <div className="completion-panel">
      <div className={`hero-mark ${tone}`}>{mark}</div>
      <h2>{title}</h2>
      <p>
        {result.copied} of {result.total} files completed
        {result.failed ? ` · ${result.failed} failed` : ''}
        {result.skipped ? ` · ${result.skipped} skipped` : ''}
      </p>
      <p className="mono">Output: {result.outputPath}</p>
      {result.errorPath ? (
        <p>
          Unable to access:
          <br />
          <span className="mono">{result.errorPath}</span>
        </p>
      ) : null}
      <div className="btn-row" style={{ marginTop: 20 }}>
        <button type="button" className="btn ghost" onClick={onOpenOutput ?? onDone}>
          Open Output Folder
        </button>
        <button type="button" className="btn primary" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}
