import type { ProcessResult } from '../../models/processing'

export function CompletionDialog({
  result,
  onDone,
  onEdit,
  onOpenOutput,
}: {
  result: ProcessResult
  onDone: () => void
  onEdit?: () => void
  onOpenOutput?: () => void
}) {
  const tone = result.outcome === 'success' ? 'ok' : result.outcome === 'partial' ? 'warn' : 'bad'
  const title =
    result.files.some((file) => file.outputPath.endsWith('-edit.mp4'))
      ? result.outcome === 'success'
        ? 'Export Complete'
        : result.outcome === 'partial'
          ? 'Exported with warnings'
          : 'Export Failed'
      : result.outcome === 'success'
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
        {onEdit && result.copied > 0 ? (
          <button type="button" className="btn primary" onClick={onEdit}>
            Edit videos
          </button>
        ) : null}
        <button type="button" className="btn ghost" onClick={onOpenOutput ?? onDone}>
          Open Output Folder
        </button>
        <button type="button" className="btn ghost" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}
