import { useEffect, useRef, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
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
  onClipMenu?: (id: string, x: number, y: number) => void
  onMuteLane?: (lane: 'video' | 'audio') => void
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
  onClipMenu,
  onMuteLane,
  onAddText,
  onAddAudio,
  onZoom,
  onFit,
}: TimelineBoardProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [locked, setLocked] = useState({ text: false, video: false, audio: false })
  const videoMuted = project.clips.length > 0 && project.clips.every((clip) => clip.muted)
  const audioMuted =
    project.extraClips.some((extra) => extra.kind === 'audio') &&
    project.extraClips.filter((extra) => extra.kind === 'audio').every((extra) => extra.volume === 0)
  const width = Math.max(720, (Math.max(duration, 1) / 1000) * project.pixelsPerSecond)
  const pxPerMs = width / Math.max(duration, 1)
  const playX = project.playheadMs * pxPerMs
  const ticks = useMemo(() => rulerTicks(duration, width), [duration, width])
  const extrasByKind = {
    audio: project.extraClips.filter((extra) => extra.kind === 'audio'),
    text: project.extraClips.filter((extra) => extra.kind === 'text'),
  }

  const seekFromClientX = (clientX: number, innerLeft: number) => {
    const x = clientX - innerLeft
    onSeek(Math.max(0, Math.min(duration, x / pxPerMs)))
  }

  const startScrub = (event: ReactMouseEvent) => {
    const sheet = trackRef.current?.querySelector('.timeline-sheet')
    if (!(sheet instanceof HTMLElement)) return
    event.preventDefault()
    const left = () => sheet.getBoundingClientRect().left
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
    const scroller = trackRef.current
    if (!scroller) return
    const pad = playing ? 48 : 0
    const viewRight = scroller.scrollLeft + scroller.clientWidth
    if (playX < scroller.scrollLeft + pad || playX > viewRight - pad) {
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
              <span className="lane-tools">
                <button
                  type="button"
                  className={`lane-add${locked[lane.id] ? ' is-on' : ''}`}
                  title={locked[lane.id] ? 'Unlock track' : 'Lock track'}
                  onClick={() => setLocked((current) => ({ ...current, [lane.id]: !current[lane.id] }))}
                >
                  {locked[lane.id] ? 'Unlock' : 'Lock'}
                </button>
                {lane.id === 'video' || lane.id === 'audio' ? (
                  <button
                    type="button"
                    className={`lane-add${(lane.id === 'video' ? videoMuted : audioMuted) ? ' is-on' : ''}`}
                    title={lane.id === 'video' ? (videoMuted ? 'Unmute video' : 'Mute video') : audioMuted ? 'Unmute audio' : 'Mute audio'}
                    onClick={() => onMuteLane?.(lane.id === 'audio' ? 'audio' : 'video')}
                  >
                    M
                  </button>
                ) : null}
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
              </span>
            </div>
          ))}
        </div>
        <div className="timeline-track" ref={trackRef}>
          <div className="timeline-sheet" style={{ width }}>
          <div className="ruler" onMouseDown={startScrub}>
            <div className="ruler-inner">
              {ticks.map((tick) => (
                <span key={tick.ms} className={`ruler-tick${tick.major ? ' is-major' : ''}`} style={{ left: tick.x }}>
                  {tick.major ? tick.label : ''}
                </span>
              ))}
            </div>
          </div>
          <div
            className="timeline-lanes"
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
                    selected={extra.id === project.selectedExtraId}
                    pxPerMs={pxPerMs}
                    locked={locked.text}
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
                const left = start * pxPerMs
                const clipWidth = Math.max(28, clipPlayDurationMs(clip) * pxPerMs)
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
                      onContextMenu={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onClipMenu?.(clip.id, event.clientX, event.clientY)
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
                        onMouseDown={(event) => {
                          if (locked.video) return
                          startDrag(event, (delta) => onTrimClip(clip.id, 'in', delta), pxPerMs, onGestureStart, onGestureEnd)
                        }}
                      />
                      <span
                        className="tl-name"
                        draggable={!locked.video}
                        title="Drag to reorder"
                        onDragStart={(event) => {
                          if (locked.video) {
                            event.preventDefault()
                            return
                          }
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
                        onMouseDown={(event) => {
                          if (locked.video) return
                          startDrag(event, (delta) => onTrimClip(clip.id, 'out', delta), pxPerMs, onGestureStart, onGestureEnd)
                        }}
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
                    selected={extra.id === project.selectedExtraId}
                    pxPerMs={pxPerMs}
                    locked={locked.audio}
                    onSelect={onSelectExtra}
                    onTrim={onTrimExtra}
                    onMove={onMoveExtra}
                    onGestureStart={onGestureStart}
                    onGestureEnd={onGestureEnd}
                  />
                ))
              )}
            </div>
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
  selected,
  pxPerMs,
  locked,
  onSelect,
  onTrim,
  onMove,
  onGestureStart,
  onGestureEnd,
}: {
  extra: ExtraClip
  selected: boolean
  pxPerMs: number
  locked?: boolean
  onSelect: (id: string) => void
  onTrim: (id: string, edge: 'in' | 'out', deltaMs: number) => void
  onMove: (id: string, deltaMs: number) => void
  onGestureStart?: () => void
  onGestureEnd?: () => void
}) {
  const left = extra.startMs * pxPerMs
  const blockWidth = Math.max(24, extra.durationMs * pxPerMs)
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
        if (locked || (event.target as HTMLElement).classList.contains('tl-handle')) return
        startDrag(event, (delta) => onMove(extra.id, delta), pxPerMs, onGestureStart, onGestureEnd)
      }}
    >
      <span className="tl-handle" onMouseDown={(event) => { if (!locked) startDrag(event, (delta) => onTrim(extra.id, 'in', delta), pxPerMs, onGestureStart, onGestureEnd) }} />
      <span className="tl-name">{extra.label}</span>
      <span className="tl-handle is-end" onMouseDown={(event) => { if (!locked) startDrag(event, (delta) => onTrim(extra.id, 'out', delta), pxPerMs, onGestureStart, onGestureEnd) }} />
    </button>
  )
}

function rulerTicks(duration: number, width: number) {
  const ticks: Array<{ ms: number; x: number; major: boolean; label: string }> = []
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
  pxPerMs: number,
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
    apply(deltaPx / pxPerMs)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    onEnd?.()
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
