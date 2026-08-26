import { formatTimecode } from '../../utils/format'

interface TransportBarProps {
  playing: boolean
  playheadMs: number
  durationMs: number
  canUndo: boolean
  canRedo: boolean
  onPlay: () => void
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onStep: (deltaMs: number) => void
}

export function TransportBar({
  playing,
  playheadMs,
  durationMs,
  canUndo,
  canRedo,
  onPlay,
  onUndo,
  onRedo,
  onSplit,
  onStep,
}: TransportBarProps) {
  return (
    <div className="nle-transport">
      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={onSplit} title="Split at playhead">
          Split
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
