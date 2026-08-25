import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import watermark from '../../assets/brand/v360-wordmark-white.png'
import {
  ANIMATION_OPTIONS,
  MAX_TIMELINE_CLIPS,
  SPEED_OPTIONS,
  TRANSITION_OPTIONS,
  type AnimationId,
  type EditorClip,
  type EditorProject,
  type TransitionId,
} from '../../models/editor'
import { buildExportPlan } from '../../services/ffmpeg-export'
import {
  applyTransition,
  clipAtTime,
  clipPlayDurationMs,
  clipStartMs,
  moveClip,
  setSpeed,
  splitClip,
  timelineDurationMs,
  trimClip,
} from '../../services/timeline'
import { formatTimecode, isModKey } from '../../utils/format'

interface VideoEditorProps {
  project: EditorProject
  exporting?: { percent: number; message: string } | null
  onClose: () => void
  onExport: (project: EditorProject) => void
}

export function VideoEditor({ project: initial, exporting, onClose, onExport }: VideoEditorProps) {
  const [project, setProject] = useState(initial)
  const [playing, setPlaying] = useState(false)
  const [past, setPast] = useState<EditorClip[][]>([])
  const [future, setFuture] = useState<EditorClip[][]>([])

  const duration = useMemo(() => timelineDurationMs(project.clips), [project.clips])
  const selected = project.clips.find((clip) => clip.id === project.selectedClipId) ?? null
  const hit = clipAtTime(project.clips, project.playheadMs)

  const commit = useCallback((clips: EditorClip[], extra?: Partial<EditorProject>) => {
    setPast((current) => [...current.slice(-40), project.clips])
    setFuture([])
    setProject((current) => ({ ...current, clips, ...extra }))
  }, [project.clips])

  const undo = () => {
    const previous = past[past.length - 1]
    if (!previous) return
    setPast((current) => current.slice(0, -1))
    setFuture((current) => [project.clips, ...current])
    setProject((current) => ({ ...current, clips: previous }))
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    setFuture((current) => current.slice(1))
    setPast((current) => [...current, project.clips])
    setProject((current) => ({ ...current, clips: next }))
  }

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const delta = now - last
      last = now
      setProject((current) => {
        const total = timelineDurationMs(current.clips)
        const next = current.playheadMs + delta
        if (next >= total) {
          setPlaying(false)
          return { ...current, playheadMs: total }
        }
        return { ...current, playheadMs: next }
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const animationClass = previewAnimationClass(hit?.clip, hit?.localMs ?? 0)

  const splitAtPlayhead = () => {
    if (!hit) return
    const parts = splitClip(hit.clip, hit.localMs)
    if (!parts) return
    const clips = [...project.clips]
    clips.splice(hit.index, 1, ...parts)
    if (clips.length > MAX_TIMELINE_CLIPS) return
    commit(clips, { selectedClipId: parts[1].id })
  }

  const deleteSelected = () => {
    if (!selected || project.clips.length <= 1) return
    commit(
      project.clips.filter((clip) => clip.id !== selected.id),
      { selectedClipId: project.clips.find((clip) => clip.id !== selected.id)?.id ?? null },
    )
  }

  const updateClip = (id: string, patch: Partial<EditorClip>) => {
    commit(project.clips.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)))
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement)?.tagName === 'INPUT' || (event.target as HTMLElement)?.tagName === 'SELECT'
      if (typing) return
      if (event.code === 'Space') {
        event.preventDefault()
        setPlaying((value) => !value)
      }
      if (event.key.toLowerCase() === 's' && !isModKey(event)) splitAtPlayhead()
      if (event.key === 'Delete' || event.key === 'Backspace') deleteSelected()
      if (isModKey(event) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="editor-shell">
      <header className="editor-top">
        <div>
          <div className="eyebrow">Edit · Vision360</div>
          <h2 style={{ margin: '4px 0 0' }}>{project.diamondName}</h2>
        </div>
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={onClose}>
            Back
          </button>
          <button type="button" className="btn ghost" onClick={undo} disabled={past.length === 0}>
            Undo
          </button>
          <button type="button" className="btn ghost" onClick={redo} disabled={future.length === 0}>
            Redo
          </button>
          <button type="button" className="btn primary" onClick={() => onExport(project)} disabled={Boolean(exporting)}>
            Export
          </button>
        </div>
      </header>

      <div className="editor-grid">
        <aside className="editor-bin">
          <div className="eyebrow">Media</div>
          <p className="card-sub">{project.clips.length} / {MAX_TIMELINE_CLIPS} clips</p>
          {project.clips.map((clip) => (
            <button
              key={clip.id}
              type="button"
              className={`bin-clip${clip.id === project.selectedClipId ? ' is-on' : ''}`}
              onClick={() => setProject((current) => ({ ...current, selectedClipId: clip.id, selectedTransitionIndex: null, playheadMs: clipStartMs(current.clips, current.clips.findIndex((item) => item.id === clip.id)) }))}
            >
              <span className="bin-swatch" style={{ background: clip.color }} />
              <span>
                <strong>{clip.label}</strong>
                <span className="card-sub">{formatTimecode(clipPlayDurationMs(clip))} · {clip.speed}x</span>
              </span>
            </button>
          ))}
        </aside>

        <section className="editor-stage-wrap">
          <div className={`editor-stage${animationClass}`} style={{ background: hit?.clip.color ?? '#011843' }}>
            <div className="stage-label">{hit?.clip.label ?? 'Add a clip'}</div>
            <img className="stage-mark" src={watermark} alt="Vision360" />
          </div>
          <div className="transport">
            <button type="button" className="btn primary" onClick={() => setPlaying((value) => !value)}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="btn ghost" onClick={splitAtPlayhead}>
              Split
            </button>
            <span className="mono">{formatTimecode(project.playheadMs)} / {formatTimecode(duration)}</span>
          </div>
        </section>

        <aside className="editor-inspector">
          <div className="eyebrow">Inspector</div>
          {selected ? (
            <>
              <h3 style={{ margin: '8px 0' }}>{selected.label}</h3>
              <label className="field">
                <span>Speed</span>
                <select
                  value={selected.speed}
                  onChange={(event) => updateClip(selected.id, setSpeed(selected, Number(event.target.value)))}
                >
                  {SPEED_OPTIONS.map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}x
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>In animation</span>
                <select
                  value={selected.animationIn}
                  onChange={(event) => updateClip(selected.id, { animationIn: event.target.value as AnimationId })}
                >
                  {ANIMATION_OPTIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Out animation</span>
                <select
                  value={selected.animationOut}
                  onChange={(event) => updateClip(selected.id, { animationOut: event.target.value as AnimationId })}
                >
                  {ANIMATION_OPTIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="card-sub">
                Trim {formatTimecode(selected.inMs)} → {formatTimecode(selected.outMs)}. Drag clip edges on the timeline.
              </p>
            </>
          ) : (
            <p>Select a clip to trim, change speed, or apply an animation.</p>
          )}
          {project.selectedTransitionIndex != null && project.clips[project.selectedTransitionIndex] ? (
            <label className="field" style={{ marginTop: 16 }}>
              <span>Transition</span>
              <select
                value={project.clips[project.selectedTransitionIndex].transition}
                onChange={(event) => {
                  const index = project.selectedTransitionIndex!
                  commit(
                    project.clips.map((clip, clipIndex) =>
                      clipIndex === index ? applyTransition(clip, event.target.value as TransitionId) : clip,
                    ),
                  )
                }}
              >
                {TRANSITION_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="card-sub">Click a cut between clips to choose a CapCut-style transition.</p>
          )}
        </aside>
      </div>

      <Timeline
        project={project}
        duration={duration}
        onSeek={(playheadMs) => {
          setPlaying(false)
          setProject((current) => ({ ...current, playheadMs }))
        }}
        onSelectClip={(id) => setProject((current) => ({ ...current, selectedClipId: id, selectedTransitionIndex: null }))}
        onSelectTransition={(index) => setProject((current) => ({ ...current, selectedTransitionIndex: index, selectedClipId: current.clips[index]?.id ?? null }))}
        onTrim={(id, edge, delta) => {
          setProject((current) => ({
            ...current,
            clips: current.clips.map((clip) => (clip.id === id ? trimClip(clip, edge, delta) : clip)),
          }))
        }}
        onMove={(from, to) => commit(moveClip(project.clips, from, to))}
      />

      {exporting ? (
        <div className="editor-export">
          <div>
            <div className="eyebrow">Export</div>
            <p>{exporting.message}</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${exporting.percent}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      <span className="sr-only">{buildExportPlan(project).outputPath}</span>
    </div>
  )
}

function previewAnimationClass(clip: EditorClip | undefined, localMs: number): string {
  if (!clip) return ''
  const play = clipPlayDurationMs(clip)
  const classes: string[] = []
  if (clip.animationIn !== 'none' && localMs < 350) classes.push(`anim-in-${clip.animationIn}`)
  if (clip.animationOut !== 'none' && play - localMs < 350) classes.push(`anim-out-${clip.animationOut}`)
  return classes.length ? ` ${classes.join(' ')}` : ''
}

function Timeline({
  project,
  duration,
  onSeek,
  onSelectClip,
  onSelectTransition,
  onTrim,
  onMove,
}: {
  project: EditorProject
  duration: number
  onSeek: (ms: number) => void
  onSelectClip: (id: string) => void
  onSelectTransition: (index: number) => void
  onTrim: (id: string, edge: 'in' | 'out', deltaMs: number) => void
  onMove: (from: number, to: number) => void
}) {
  const width = Math.max(640, (duration / 1000) * project.pixelsPerSecond)
  const playX = (project.playheadMs / Math.max(duration, 1)) * width

  return (
    <div className="timeline">
      <div className="eyebrow">Timeline</div>
      <div
        className="timeline-track"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const x = event.clientX - rect.left + event.currentTarget.scrollLeft
          onSeek(Math.max(0, Math.min(duration, (x / width) * duration)))
        }}
      >
        <div className="timeline-inner" style={{ width }}>
          {project.clips.map((clip, index) => {
            const start = clipStartMs(project.clips, index)
            const left = (start / Math.max(duration, 1)) * width
            const clipWidth = Math.max(28, (clipPlayDurationMs(clip) / Math.max(duration, 1)) * width)
            return (
              <div key={clip.id} className="tl-clip-wrap" style={{ left, width: clipWidth }}>
                <button
                  type="button"
                  draggable
                  className={`tl-clip${clip.id === project.selectedClipId ? ' is-on' : ''}`}
                  style={{ background: clip.color }}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectClip(clip.id)
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', String(index))
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    onMove(Number(event.dataTransfer.getData('text/plain')), index)
                  }}
                >
                  <span
                    className="tl-handle"
                    onMouseDown={(event) => startTrim(event, (delta) => onTrim(clip.id, 'in', delta), project.pixelsPerSecond)}
                  />
                  <span className="tl-name">{clip.label.replace('.mp4', '')}</span>
                  <span
                    className="tl-handle is-end"
                    onMouseDown={(event) => startTrim(event, (delta) => onTrim(clip.id, 'out', delta), project.pixelsPerSecond)}
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
          <div className="playhead" style={{ left: playX }} />
        </div>
      </div>
    </div>
  )
}

function startTrim(event: ReactMouseEvent, apply: (deltaMs: number) => void, pixelsPerSecond: number) {
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
