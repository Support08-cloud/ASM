import { formatTimecode } from '../../utils/format'

interface ActionToolbarProps {
  playing: boolean
  playheadMs: number
  durationMs: number
  canUndo: boolean
  canRedo: boolean
  onPlay: () => void
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onAddMedia: () => void
  onAddMusic: () => void
  onAddText: () => void
  onAddFx: () => void
}

export function ActionToolbar({
  playing,
  playheadMs,
  durationMs,
  canUndo,
  canRedo,
  onPlay,
  onUndo,
  onRedo,
  onSplit,
  onAddMedia,
  onAddMusic,
  onAddText,
  onAddFx,
}: ActionToolbarProps) {
  return (
    <div className="action-bar">
      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={onAddMedia}>
          + Media
        </button>
        <button type="button" className="btn ghost" onClick={onAddMusic}>
          + Music
        </button>
        <button type="button" className="btn ghost" onClick={onAddText}>
          + Text
        </button>
        <button type="button" className="btn ghost" onClick={onAddFx}>
          + FX
        </button>
      </div>
      <div className="btn-row">
        <button type="button" className="btn primary" onClick={onPlay}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="btn ghost" onClick={onSplit}>
          Split
        </button>
        <button type="button" className="btn ghost" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="btn ghost" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
        <span className="mono">
          {formatTimecode(playheadMs)} / {formatTimecode(durationMs)}
        </span>
      </div>
    </div>
  )
}
