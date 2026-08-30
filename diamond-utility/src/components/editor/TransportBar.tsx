import { formatFrames } from '../../utils/format'

interface TransportBarProps {
  playing: boolean
  playheadMs: number
  durationMs: number
  fps?: number
  onPlay: () => void
  onStep: (deltaMs: number) => void
  onSkip: (edge: 'start' | 'end') => void
}

export function TransportBar({ playing, playheadMs, durationMs, fps = 24, onPlay, onStep, onSkip }: TransportBarProps) {
  return (
    <div className="v360-transport">
      <span className="v360-clock is-now">{formatFrames(playheadMs, fps)}</span>
      <div className="v360-transport-btns">
        <button type="button" title="Skip previous" onClick={() => onSkip('start')}>
          ⏮
        </button>
        <button type="button" title="Back 1s" onClick={() => onStep(-1000)}>
          ⏪
        </button>
        <button type="button" className="is-play" onClick={onPlay} title={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" title="Forward 1s" onClick={() => onStep(1000)}>
          ⏩
        </button>
        <button type="button" title="Skip next" onClick={() => onSkip('end')}>
          ⏭
        </button>
      </div>
      <span className="v360-clock">{formatFrames(durationMs, fps)}</span>
    </div>
  )
}
