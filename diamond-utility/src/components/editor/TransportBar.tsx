import { formatTimecode } from '../../utils/format'

interface TransportBarProps {
  playing: boolean
  playheadMs: number
  durationMs: number
  canUndo: boolean
  canRedo: boolean
  canSplit?: boolean
  canDelete?: boolean
  onPlay: () => void
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onDelete: () => void
  onSeek: (playheadMs: number) => void
  onStep: (deltaMs: number) => void
}

export function TransportBar({
  playing,
  playheadMs,
  durationMs,
  canUndo,
  canRedo,
  canSplit = true,
  canDelete = true,
  onPlay,
  onUndo,
  onRedo,
  onSplit,
  onDelete,
  onSeek,
  onStep,
}: TransportBarProps) {
  return (
    <div className="nle-transport">
      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={onSplit} title="Split at playhead (S)" disabled={!canSplit}>
          Split
        </button>
        <button type="button" className="btn ghost" onClick={onDelete} title="Delete selected clip" disabled={!canDelete}>
          Delete
        </button>
        <button type="button" className="btn ghost" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="btn ghost" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
      </div>
      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={() => onStep(-1000)} title="Back 1s">
          −1s
        </button>
        <button type="button" className="btn primary" onClick={onPlay}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          className="nle-scrub"
          type="range"
          min={0}
          max={Math.max(durationMs, 1)}
          step={10}
          value={Math.min(playheadMs, Math.max(durationMs, 1))}
          aria-label="Playhead"
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        <button type="button" className="btn ghost" onClick={() => onStep(1000)} title="Forward 1s">
          +1s
        </button>
      </div>
      <span className="mono nle-clock">
        {formatTimecode(playheadMs)} / {formatTimecode(durationMs)}
      </span>
    </div>
  )
}
