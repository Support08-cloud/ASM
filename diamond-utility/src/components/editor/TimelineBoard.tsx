import { useMemo, type MouseEvent as ReactMouseEvent } from 'react'
import { IconBlade, IconSelect, IconSlip } from '../common/Icon'
import type { EditorProject, ExtraClip, TimelineTool } from '../../models/editor'
import { clipPlayDurationMs, clipStartMs } from '../../services/timeline'
import { formatFrames } from '../../utils/format'

interface TimelineBoardProps {
  project: EditorProject
  duration: number
  thumbs: Record<string, string[]>
  onSeek: (playheadMs: number) => void
  onSelectClip: (id: string) => void
  onSelectExtra: (id: string) => void
  onSelectTransition: (index: number) => void
  onTrimClip: (id: string, edge: 'in' | 'out', deltaMs: number) => void
  onTrimExtra: (id: string, edge: 'in' | 'out', deltaMs: number) => void
  onMoveClip: (from: number, to: number) => void
  onMoveExtra: (id: string, deltaMs: number) => void
  onAddText: () => void
  onAddAudio: () => void
  onAddOverlay: () => void
  onZoom: (pixelsPerSecond: number) => void
  onTool: (tool: TimelineTool) => void
  onSplit: () => void
  onSplitAt: (clipId: string, localMs: number) => void
  onSlip: (id: string, deltaMs: number) => void
  onMuteClip: (id: string) => void
}

const LANES = [
  { id: 't1', label: 'T1' },
  { id: 'v2', label: 'V2' },
  { id: 'v1', label: 'V1' },
  { id: 'a1', label: 'A1' },
  { id: 'a2', label: 'A2' },
] as const

export function TimelineBoard({
  project,
  duration,
  thumbs,
  onSeek,
  onSelectClip,
  onSelectExtra,
  onSelectTransition,
  onTrimClip,
  onTrimExtra,
  onMoveClip,
  onMoveExtra,
  onAddText,
  onAddAudio,
  onAddOverlay,
  onZoom,
  onTool,
  onSplit,
  onSplitAt,
  onSlip,
  onMuteClip,
}: TimelineBoardProps) {
  const width = Math.max(720, (duration / 1000) * project.pixelsPerSecond)
  const playX = (project.playheadMs / Math.max(duration, 1)) * width
  const ticks = useMemo(() => rulerTicks(duration, project.pixelsPerSecond), [duration, project.pixelsPerSecond])
  const texts = project.extraClips.filter((extra) => extra.kind === 'text')
  const music = project.extraClips.filter((extra) => extra.kind === 'audio')
  const overlays = project.extraClips.filter((extra) => extra.kind === 'overlay')

  const seekFromClientX = (clientX: number, innerLeft: number) => {
    onSeek(Math.max(0, Math.min(duration, ((clientX - innerLeft) / width) * duration)))
  }

  return (
    <section className="v360-timeline">
      <div className="v360-timeline-tools">
        <div className="v360-tool-group">
          <button type="button" className={project.timelineTool === 'select' ? 'is-on' : undefined} title="Select (V)" onClick={() => onTool('select')}>
            <IconSelect size={14} />
          </button>
          <button
            type="button"
            className={project.timelineTool === 'blade' ? 'is-on' : undefined}
            title="Blade — click a clip to split (B)"
            onClick={() => onTool(project.timelineTool === 'blade' ? 'select' : 'blade')}
          >
            <IconBlade size={14} />
          </button>
          <button type="button" title="Split at playhead (S)" onClick={onSplit}>
            Split
          </button>
          <button type="button" className={project.timelineTool === 'slip' ? 'is-on' : undefined} title="Slip (Y)" onClick={() => onTool('slip')}>
            <IconSlip size={14} />
          </button>
        </div>
        <div className="v360-zoom">
          <button type="button" onClick={() => onZoom(Math.max(40, project.pixelsPerSecond - 20))}>
            −
          </button>
          <input
            type="range"
            min={40}
            max={220}
            value={project.pixelsPerSecond}
            onChange={(event) => onZoom(Number(event.target.value))}
          />
          <button type="button" onClick={() => onZoom(Math.min(220, project.pixelsPerSecond + 20))}>
            +
          </button>
        </div>
      </div>
      <div className="v360-timeline-board">
        <div className="v360-gutter">
          <div className="v360-ruler-spacer" />
          {LANES.map((lane) => (
            <div key={lane.id} className={`v360-lane-label is-${lane.id}`}>
              <span>{lane.label}</span>
              {lane.id === 'a2' && project.ducking.enabled ? <em>DUCKING</em> : null}
            </div>
          ))}
        </div>
        <div className="v360-track">
          <div
            className="v360-ruler"
            onClick={(event) => {
              const inner = event.currentTarget.querySelector('.v360-ruler-inner')
              if (!inner) return
              seekFromClientX(event.clientX, inner.getBoundingClientRect().left)
            }}
          >
            <div className="v360-ruler-inner" style={{ width }}>
              {ticks.map((tick) => (
                <span key={tick.ms} className={tick.major ? 'is-major' : undefined} style={{ left: tick.x }}>
                  {tick.major ? tick.label : ''}
                </span>
              ))}
            </div>
          </div>
          <div
            className="v360-lanes"
            style={{ width }}
            onClick={(event) => {
              if (event.target !== event.currentTarget && !(event.target as HTMLElement).classList.contains('v360-lane')) return
              seekFromClientX(event.clientX, event.currentTarget.getBoundingClientRect().left)
            }}
          >
            <div className="v360-lane is-text">
              {texts.map((extra) => (
                <ExtraBlock
                  key={extra.id}
                  extra={extra}
                  duration={duration}
                  width={width}
                  selected={extra.id === project.selectedExtraId}
                  pixelsPerSecond={project.pixelsPerSecond}
                  variant="text"
                  onSelect={onSelectExtra}
                  onTrim={onTrimExtra}
                  onMove={onMoveExtra}
                />
              ))}
              <button type="button" className="v360-lane-add is-end" onClick={onAddText}>
                + Title
              </button>
            </div>
            <div className="v360-lane is-v2">
              {overlays.map((extra) => (
                <ExtraBlock
                  key={extra.id}
                  extra={extra}
                  duration={duration}
                  width={width}
                  selected={extra.id === project.selectedExtraId}
                  pixelsPerSecond={project.pixelsPerSecond}
                  variant="overlay"
                  onSelect={onSelectExtra}
                  onTrim={onTrimExtra}
                  onMove={onMoveExtra}
                />
              ))}
              <button type="button" className="v360-lane-add is-end" onClick={onAddOverlay}>
                + Overlay
              </button>
            </div>
            <div className="v360-lane is-video">
              {project.clips.map((clip, index) => {
                const start = clipStartMs(project.clips, index)
                const left = (start / Math.max(duration, 1)) * width
                const clipWidth = Math.max(28, (clipPlayDurationMs(clip) / Math.max(duration, 1)) * width)
                const frames = thumbs[clip.id] ?? []
                return (
                  <div key={clip.id} className="v360-clip-wrap" style={{ left, width: clipWidth }}>
                    <button
                      type="button"
                      draggable
                      className={`v360-clip${clip.id === project.selectedClipId ? ' is-on' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        const rect = event.currentTarget.getBoundingClientRect()
                        const localMs = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * clipPlayDurationMs(clip)
                        if (project.timelineTool === 'blade') {
                          onSeek(start + localMs)
                          onSplitAt(clip.id, localMs)
                          return
                        }
                        onSelectClip(clip.id)
                      }}
                      onMouseDown={(event) => {
                        if (project.timelineTool !== 'slip') return
                        if ((event.target as HTMLElement).classList.contains('v360-handle')) return
                        startDrag(event, (delta) => onSlip(clip.id, delta), project.pixelsPerSecond)
                      }}
                      onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        onMoveClip(Number(event.dataTransfer.getData('text/plain')), index)
                      }}
                    >
                      <span className="v360-film">
                        {frames.map((frame, frameIndex) => (
                          <img key={frameIndex} src={frame} alt="" />
                        ))}
                      </span>
                      <span className="v360-handle" onMouseDown={(event) => startDrag(event, (delta) => onTrimClip(clip.id, 'in', delta), project.pixelsPerSecond)} />
                      <span className="v360-clip-name">{clip.label.replace('.mp4', '')}</span>
                      <span className="v360-handle is-end" onMouseDown={(event) => startDrag(event, (delta) => onTrimClip(clip.id, 'out', delta), project.pixelsPerSecond)} />
                    </button>
                    {index < project.clips.length - 1 ? (
                      <button
                        type="button"
                        className={`v360-cut${project.selectedTransitionIndex === index ? ' is-on' : ''}`}
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
            <div className="v360-lane is-a1">
              {project.clips.map((clip, index) => {
                if (clip.muted || clip.hasAudio === false) return null
                const start = clipStartMs(project.clips, index)
                const left = (start / Math.max(duration, 1)) * width
                const clipWidth = Math.max(24, (clipPlayDurationMs(clip) / Math.max(duration, 1)) * width)
                return (
                  <button
                    key={`a1-${clip.id}`}
                    type="button"
                    className={`v360-audio-link${clip.muted ? ' is-muted' : ''}${clip.id === project.selectedClipId ? ' is-on' : ''}`}
                    style={{ left, width: clipWidth }}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectClip(clip.id)
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      onMuteClip(clip.id)
                    }}
                  >
                    {clip.muted ? 'MUTE' : `${clip.label.replace('.mp4', '')} [A]`}
                  </button>
                )
              })}
            </div>
            <div className="v360-lane is-audio">
              {music.map((extra) => (
                <ExtraBlock
                  key={extra.id}
                  extra={extra}
                  duration={duration}
                  width={width}
                  selected={extra.id === project.selectedExtraId}
                  pixelsPerSecond={project.pixelsPerSecond}
                  variant="audio"
                  ducked={project.ducking.enabled}
                  onSelect={onSelectExtra}
                  onTrim={onTrimExtra}
                  onMove={onMoveExtra}
                />
              ))}
              <button type="button" className="v360-lane-add is-end" onClick={onAddAudio}>
                + Audio
              </button>
            </div>
            <div className="v360-playhead" style={{ left: playX }}>
              <span>{formatFrames(project.playheadMs)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ExtraBlock({
  extra,
  duration,
  width,
  selected,
  pixelsPerSecond,
  variant,
  ducked,
  onSelect,
  onTrim,
  onMove,
}: {
  extra: ExtraClip
  duration: number
  width: number
  selected: boolean
  pixelsPerSecond: number
  variant: 'text' | 'audio' | 'overlay'
  ducked?: boolean
  onSelect: (id: string) => void
  onTrim: (id: string, edge: 'in' | 'out', deltaMs: number) => void
  onMove: (id: string, deltaMs: number) => void
}) {
  const left = (extra.startMs / Math.max(duration, 1)) * width
  const blockWidth = Math.max(24, (extra.durationMs / Math.max(duration, 1)) * width)
  return (
    <button
      type="button"
      className={`v360-extra is-${variant}${selected ? ' is-on' : ''}${ducked ? ' is-ducked' : ''}`}
      style={{ left, width: blockWidth }}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(extra.id)
      }}
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).classList.contains('v360-handle')) return
        startDrag(event, (delta) => onMove(extra.id, delta), pixelsPerSecond)
      }}
    >
      <span className="v360-handle" onMouseDown={(event) => startDrag(event, (delta) => onTrim(extra.id, 'in', delta), pixelsPerSecond)} />
      <span className="v360-clip-name">{extra.label}</span>
      {extra.keyframes?.map((key) => (
        <i key={key.id} className="v360-kf" style={{ left: `${(key.timeMs / Math.max(extra.durationMs, 1)) * 100}%` }} />
      ))}
      <span className="v360-handle is-end" onMouseDown={(event) => startDrag(event, (delta) => onTrim(extra.id, 'out', delta), pixelsPerSecond)} />
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
      label: formatFrames(ms).slice(0, 8),
    })
  }
  return ticks
}

function startDrag(event: ReactMouseEvent, apply: (deltaMs: number) => void, pixelsPerSecond: number) {
  event.preventDefault()
  event.stopPropagation()
  let lastX = event.clientX
  const move = (next: MouseEvent) => {
    const deltaPx = next.clientX - lastX
    lastX = next.clientX
    apply((deltaPx / pixelsPerSecond) * 1000)
  }
  const up = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
