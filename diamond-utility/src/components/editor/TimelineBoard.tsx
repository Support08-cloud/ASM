import { useEffect, useRef, useMemo, type MouseEvent as ReactMouseEvent } from 'react'
import type { EditorProject, ExtraClip } from '../../models/editor'
import { clipPlayDurationMs, clipStartMs, timeInsideClip } from '../../services/timeline'
import { formatTimecode } from '../../utils/format'

interface TimelineBoardProps {
  project: EditorProject
  duration: number
  thumbs: Record<string, string[]>
  playing?: boolean
  onSeek: (playheadMs: number) => void
  onSelectClip: (id: string, playheadMs: number) => void
  onSelectExtra: (id: string) => void
  onSelectTransition: (index: number) => void
  onTrimClip: (id: string, edge: 'in' | 'out', deltaMs: number) => void
  onTrimExtra: (id: string, edge: 'in' | 'out', deltaMs: number) => void
  onMoveClip: (from: number, to: number) => void
  onMoveExtra: (id: string, deltaMs: number) => void
  onGestureStart?: () => void
  onGestureEnd?: () => void
  onAddText: () => void
  onAddAudio: () => void
  onZoom: (pixelsPerSecond: number) => void
  onFit: () => void
}

const LANES: Array<{ id: 'text' | 'video' | 'audio'; label: string }> = [
  { id: 'text', label: 'Text' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
]

export function TimelineBoard({
  project,
  duration,
  thumbs,
  playing = false,
  onSeek,
  onSelectClip,
  onSelectExtra,
  onSelectTransition,
  onTrimClip,
  onTrimExtra,
  onMoveClip,
  onMoveExtra,
  onGestureStart,
  onGestureEnd,
  onAddText,
  onAddAudio,
  onZoom,
  onFit,
}: TimelineBoardProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const width = Math.max(720, (duration / 1000) * project.pixelsPerSecond)
  const playX = (project.playheadMs / Math.max(duration, 1)) * width
  const ticks = useMemo(() => rulerTicks(duration, project.pixelsPerSecond), [duration, project.pixelsPerSecond])
  const extrasByKind = {
    audio: project.extraClips.filter((extra) => extra.kind === 'audio'),
    text: project.extraClips.filter((extra) => extra.kind === 'text'),
  }

  const seekFromClientX = (clientX: number, innerLeft: number) => {
    const x = clientX - innerLeft
    onSeek(Math.max(0, Math.min(duration, (x / width) * duration)))
  }

  const startScrub = (event: ReactMouseEvent) => {
    const lane = trackRef.current?.querySelector('.timeline-lanes')
    if (!(lane instanceof HTMLElement)) return
    event.preventDefault()
    const left = () => lane.getBoundingClientRect().left
    seekFromClientX(event.clientX, left())
    const move = (next: MouseEvent) => seekFromClientX(next.clientX, left())
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  useEffect(() => {
    if (!playing) return
    const scroller = trackRef.current
    if (!scroller) return
    const pad = 48
    if (playX < scroller.scrollLeft + pad || playX > scroller.scrollLeft + scroller.clientWidth - pad) {
      scroller.scrollLeft = Math.max(0, playX - scroller.clientWidth * 0.35)
    }
  }, [playing, playX])

  return (
    <div className="nle-timeline">
      <div className="timeline-head">
        <div className="eyebrow">Timeline</div>
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={() => onZoom(Math.max(40, project.pixelsPerSecond - 20))}>
            −
          </button>
          <button type="button" className="btn ghost" onClick={() => onZoom(Math.min(220, project.pixelsPerSecond + 20))}>
            +
          </button>
          <button type="button" className="btn ghost" onClick={onFit}>
            Fit
          </button>
          <span className="card-sub">{formatTimecode(duration)}</span>
        </div>
      </div>
      <div className="timeline-board">
        <div className="timeline-gutter">
          <div className="ruler-spacer" />
          {LANES.map((lane) => (
            <div key={lane.id} className="lane-label">
              <span>{lane.label}</span>
              {lane.id === 'text' ? (
                <button type="button" className="lane-add" onClick={onAddText} title="Add text">
                  +
                </button>
              ) : null}
              {lane.id === 'audio' ? (
                <button type="button" className="lane-add" onClick={onAddAudio} title="Add audio">
                  +
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="timeline-track" ref={trackRef}>
          <div className="ruler" onMouseDown={startScrub}>
            <div className="ruler-inner" style={{ width }}>
              {ticks.map((tick) => (
                <span key={tick.ms} className={`ruler-tick${tick.major ? ' is-major' : ''}`} style={{ left: tick.x }}>
                  {tick.major ? tick.label : ''}
                </span>
              ))}
            </div>
          </div>
          <div
            className="timeline-lanes"
            style={{ width }}
            onMouseDown={(event) => {
              const target = event.target as HTMLElement
              if (target.closest('.tl-clip, .tl-cut, .tl-add, .tl-handle, .tl-name')) return
              startScrub(event)
            }}
          >
            <div className="tl-lane is-text">
              {extrasByKind.text.length === 0 ? (
                <button type="button" className="tl-add" onClick={onAddText}>
                  + Add text
                </button>
              ) : (
                extrasByKind.text.map((extra) => (
                  <ExtraBlock
                    key={extra.id}
                    extra={extra}
                    duration={duration}
                    width={width}
                    selected={extra.id === project.selectedExtraId}
                    pixelsPerSecond={project.pixelsPerSecond}
                    onSelect={onSelectExtra}
                    onTrim={onTrimExtra}
                    onMove={onMoveExtra}
                    onGestureStart={onGestureStart}
                    onGestureEnd={onGestureEnd}
                  />
                ))
              )}
            </div>
            <div className="tl-lane is-video">
              {project.clips.map((clip, index) => {
                const start = clipStartMs(project.clips, index)
                const left = (start / Math.max(duration, 1)) * width
                const clipWidth = Math.max(28, (clipPlayDurationMs(clip) / Math.max(duration, 1)) * width)
                const frames = thumbs[clip.id] ?? []
                return (
                  <div key={clip.id} className="tl-clip-wrap" style={{ left, width: clipWidth }}>
                    <button
                      type="button"
                      className={`tl-clip${clip.id === project.selectedClipId ? ' is-on' : ''}`}
                      style={{ background: clip.color }}
                      onClick={(event) => {
                        event.stopPropagation()
                        const rect = event.currentTarget.getBoundingClientRect()
                        const ratio = (event.clientX - rect.left) / Math.max(rect.width, 1)
                        onSelectClip(clip.id, timeInsideClip(project.clips, index, ratio))
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        onMoveClip(Number(event.dataTransfer.getData('text/plain')), index)
                      }}
                    >
                      <span className="tl-film">
                        {frames.map((frame, frameIndex) => (
                          <img key={frameIndex} src={frame} alt="" />
                        ))}
                      </span>
                      <span
                        className="tl-handle"
                        onMouseDown={(event) => startDrag(event, (delta) => onTrimClip(clip.id, 'in', delta), project.pixelsPerSecond, onGestureStart, onGestureEnd)}
                      />
                      <span
                        className="tl-name"
                        draggable
                        title="Drag to reorder"
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', String(index))
                          event.stopPropagation()
                        }}
                      >
                        {clip.label.replace('.mp4', '')}
                        {clip.speed !== 1 ? ` ${clip.speed.toFixed(1)}×` : ''}
                      </span>
                      {clip.muted ? <span className="tl-mute">M</span> : null}
                      <span
                        className="tl-handle is-end"
                        onMouseDown={(event) => startDrag(event, (delta) => onTrimClip(clip.id, 'out', delta), project.pixelsPerSecond, onGestureStart, onGestureEnd)}
                      />
                    </button>
                    {index < project.clips.length - 1 ? (
                      <button
                        type="button"
                        className={`tl-cut${project.selectedTransitionIndex === index ? ' is-on' : ''}`}
                        title="Transition"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectTransition(index)
                        }}
                      >
                        ◆
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div className="tl-lane is-audio">
              {extrasByKind.audio.length === 0 ? (
                <button type="button" className="tl-add" onClick={onAddAudio}>
                  + Add audio
                </button>
              ) : (
                extrasByKind.audio.map((extra) => (
                  <ExtraBlock
                    key={extra.id}
                    extra={extra}
                    duration={duration}
                    width={width}
                    selected={extra.id === project.selectedExtraId}
                    pixelsPerSecond={project.pixelsPerSecond}
                    onSelect={onSelectExtra}
                    onTrim={onTrimExtra}
                    onMove={onMoveExtra}
                    onGestureStart={onGestureStart}
                    onGestureEnd={onGestureEnd}
                  />
                ))
              )}
            </div>
            <div className="playhead" style={{ left: playX }}>
              <button
                type="button"
                className="playhead-cap"
                aria-label="Drag playhead"
                onMouseDown={(event) => {
                  event.stopPropagation()
                  startScrub(event)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExtraBlock({
  extra,
  duration,
  width,
  selected,
  pixelsPerSecond,
  onSelect,
  onTrim,
  onMove,
  onGestureStart,
  onGestureEnd,
}: {
  extra: ExtraClip
  duration: number
  width: number
  selected: boolean
  pixelsPerSecond: number
  onSelect: (id: string) => void
  onTrim: (id: string, edge: 'in' | 'out', deltaMs: number) => void
  onMove: (id: string, deltaMs: number) => void
  onGestureStart?: () => void
  onGestureEnd?: () => void
}) {
  const left = (extra.startMs / Math.max(duration, 1)) * width
  const blockWidth = Math.max(24, (extra.durationMs / Math.max(duration, 1)) * width)
  return (
    <button
      type="button"
      className={`tl-clip tl-extra${selected ? ' is-on' : ''}`}
      style={{ left, width: blockWidth, background: extra.color }}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(extra.id)
      }}
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).classList.contains('tl-handle')) return
        startDrag(event, (delta) => onMove(extra.id, delta), pixelsPerSecond, onGestureStart, onGestureEnd)
      }}
    >
      <span className="tl-handle" onMouseDown={(event) => startDrag(event, (delta) => onTrim(extra.id, 'in', delta), pixelsPerSecond, onGestureStart, onGestureEnd)} />
      <span className="tl-name">{extra.label}</span>
      <span className="tl-handle is-end" onMouseDown={(event) => startDrag(event, (delta) => onTrim(extra.id, 'out', delta), pixelsPerSecond, onGestureStart, onGestureEnd)} />
    </button>
  )
}

function rulerTicks(duration: number, pps: number) {
  const ticks: Array<{ ms: number; x: number; major: boolean; label: string }> = []
  const width = Math.max(720, (duration / 1000) * pps)
  const step = duration > 60000 ? 5000 : 1000
  for (let ms = 0; ms <= duration + 1; ms += step) {
    ticks.push({
      ms,
      x: (ms / Math.max(duration, 1)) * width,
      major: ms % 5000 === 0,
      label: formatTimecode(ms).slice(0, 5),
    })
  }
  return ticks
}

function startDrag(
  event: ReactMouseEvent,
  apply: (deltaMs: number) => void,
  pixelsPerSecond: number,
  onStart?: () => void,
  onEnd?: () => void,
) {
  event.preventDefault()
  event.stopPropagation()
  onStart?.()
  let lastX = event.clientX
  const move = (next: MouseEvent) => {
    const deltaPx = next.clientX - lastX
    lastX = next.clientX
    apply((deltaPx / pixelsPerSecond) * 1000)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    onEnd?.()
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
