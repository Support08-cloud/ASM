import type { ProcessResult } from '../../models/processing'
import { IconCheck, IconClose, IconWarning } from '../common/Icon'

export function copiedDiamondNames(result: ProcessResult): string[] {
  return [...new Set(
    result.files
      .filter((file) => file.status === 'copied' && !file.outputPath.endsWith('-edit.mp4'))
      .map((file) => file.diamondName)
      .filter(Boolean),
  )]
}

export function CompletionDialog({
  result,
  onDone,
  onEdit,
  onOpenOutput,
}: {
  result: ProcessResult
  onDone: () => void
  onEdit?: (diamondName: string) => void
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
  const mark = result.outcome === 'success' ? <IconCheck size={22} /> : result.outcome === 'partial' ? <IconWarning size={22} /> : <IconClose size={22} />
  const diamonds = copiedDiamondNames(result)

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
      {diamonds.length > 1 ? (
        <p className="card-sub">The editor opens one diamond at a time. Choose which diamond to edit.</p>
      ) : null}
      <div className="btn-row" style={{ marginTop: 20, flexWrap: 'wrap' }}>
        {onEdit
          ? diamonds.map((name) => (
              <button key={name} type="button" className="btn primary" onClick={() => onEdit(name)}>
                {diamonds.length === 1 ? 'Edit videos' : `Edit ${name}`}
              </button>
            ))
          : null}
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
