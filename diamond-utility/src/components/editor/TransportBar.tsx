import { formatFrames } from '../../utils/format'

interface TransportBarProps {
  playing: boolean
  playheadMs: number
  durationMs: number
  fps?: number
  onPlay: () => void
  onStep: (deltaMs: number) => void
  onSkip: (edge: 'start' | 'end' | 'prev' | 'next') => void
  onSeek: (playheadMs: number) => void
}

export function TransportBar({
  playing,
  playheadMs,
  durationMs,
  fps = 24,
  onPlay,
  onStep,
  onSkip,
  onSeek,
}: TransportBarProps) {
  const frame = 1000 / Math.max(1, fps)
  return (
    <div className="v360-transport">
      <span className="v360-clock is-now">{formatFrames(playheadMs, fps)}</span>
      <div className="v360-transport-btns">
        <button type="button" title="Previous clip" onClick={() => onSkip('prev')}>
          ⏮
        </button>
        <button type="button" title="Back 1 frame" onClick={() => onStep(-frame)}>
          ⏪
        </button>
        <button type="button" className={playing ? 'is-play' : undefined} onClick={onPlay} title={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" title="Forward 1 frame" onClick={() => onStep(frame)}>
          ⏩
        </button>
        <button type="button" title="Next clip" onClick={() => onSkip('next')}>
          ⏭
        </button>
      </div>
      <input
        className="v360-scrub"
        type="range"
        min={0}
        max={Math.max(1, durationMs)}
        value={Math.min(playheadMs, durationMs)}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Scrub timeline"
      />
      <span className="v360-clock">{formatFrames(durationMs, fps)}</span>
    </div>
  )
}
