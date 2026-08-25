import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ANIMATION_OPTIONS,
  FILTER_OPTIONS,
  FX_OPTIONS,
  MAX_TIMELINE_CLIPS,
  SPEED_OPTIONS,
  TRANSITION_OPTIONS,
  type AnimationId,
  type EditorClip,
  type EditorProject,
  type ExtraClip,
  type FilterId,
  type FxId,
  type TransitionId,
} from '../../models/editor'
import { buildExportPlan } from '../../services/ffmpeg-export'
import { toVideoSrc } from '../../services/media-url'
import { sampleMediaUrl, sampleMusicUrl } from '../../services/sample-media'
import { captureFilmstrip } from '../../services/thumbnails'
import {
  applyDuration,
  applyTransition,
  clipAtTime,
  clipPlayDurationMs,
  clipStartMs,
  createClipFromFile,
  createExtra,
  extrasAtTime,
  moveClip,
  moveExtra,
  projectDurationMs,
  setSpeed,
  setVolume,
  splitClip,
  trimClip,
  trimExtra,
} from '../../services/timeline'
import { formatTimecode, isModKey } from '../../utils/format'
import { ActionToolbar } from './ActionToolbar'
import { PreviewStage } from './PreviewStage'
import { TimelineBoard } from './TimelineBoard'

interface VideoEditorProps {
  project: EditorProject
  exporting?: { percent: number; message: string } | null
  onClose: () => void
  onExport: (project: EditorProject) => void
}

interface Snapshot {
  clips: EditorClip[]
  extraClips: ExtraClip[]
  masterVolume: number
}

export function VideoEditor({ project: initial, exporting, onClose, onExport }: VideoEditorProps) {
  const [project, setProject] = useState(initial)
  const [playing, setPlaying] = useState(false)
  const [past, setPast] = useState<Snapshot[]>([])
  const [future, setFuture] = useState<Snapshot[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string[]>>({})
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const musicInputRef = useRef<HTMLInputElement>(null)
  const boundaryLock = useRef(false)

  const projectRef = useRef(project)
  projectRef.current = project

  const duration = useMemo(() => projectDurationMs(project), [project])
  const selected = project.clips.find((clip) => clip.id === project.selectedClipId) ?? null
  const selectedExtra = project.extraClips.find((extra) => extra.id === project.selectedExtraId) ?? null
  const hit = clipAtTime(project.clips, project.playheadMs)
  const activeExtras = extrasAtTime(project.extraClips, project.playheadMs)

  const commit = useCallback((patch: Partial<EditorProject>) => {
    const current = projectRef.current
    setPast((items) => [...items.slice(-40), {
      clips: current.clips,
      extraClips: current.extraClips,
      masterVolume: current.masterVolume,
    }])
    setFuture([])
    setProject((value) => ({ ...value, ...patch }))
  }, [])

  const undo = () => {
    const previous = past[past.length - 1]
    if (!previous) return
    const current = projectRef.current
    setPast((items) => items.slice(0, -1))
    setFuture((items) => [{
      clips: current.clips,
      extraClips: current.extraClips,
      masterVolume: current.masterVolume,
    }, ...items])
    setProject((value) => ({ ...value, ...previous }))
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    const current = projectRef.current
    setFuture((items) => items.slice(1))
    setPast((items) => [...items, {
      clips: current.clips,
      extraClips: current.extraClips,
      masterVolume: current.masterVolume,
    }])
    setProject((value) => ({ ...value, ...next }))
  }

  const splitAtPlayhead = () => {
    if (!hit) return
    const parts = splitClip(hit.clip, hit.localMs)
    if (!parts) return
    const clips = [...project.clips]
    clips.splice(hit.index, 1, ...parts)
    if (clips.length > MAX_TIMELINE_CLIPS) return
    commit({ clips, selectedClipId: parts[1].id, selectedExtraId: null })
  }

  const deleteSelected = () => {
    if (selectedExtra) {
      commit({
        extraClips: project.extraClips.filter((extra) => extra.id !== selectedExtra.id),
        selectedExtraId: null,
      })
      return
    }
    if (!selected || project.clips.length <= 1) return
    commit({
      clips: project.clips.filter((clip) => clip.id !== selected.id),
      selectedClipId: project.clips.find((clip) => clip.id !== selected.id)?.id ?? null,
    })
  }

  const updateClip = (id: string, patch: Partial<EditorClip>) => {
    commit({ clips: project.clips.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)) })
  }

  const updateExtra = (id: string, patch: Partial<ExtraClip>) => {
    commit({ extraClips: project.extraClips.map((extra) => (extra.id === id ? { ...extra, ...patch } : extra)) })
  }

  const addVideoClip = async (path: string, mediaUrl?: string, durationMs?: number, hasAudio?: boolean) => {
    if (project.clips.length >= MAX_TIMELINE_CLIPS) return
    const name = path.split(/[/\\]/).pop() ?? 'clip.mp4'
    const clip = createClipFromFile(
      {
        diamondName: project.diamondName,
        viewLabel: name,
        sourcePath: path,
        outputPath: path,
        status: 'copied',
      },
      project.clips.length,
    )
    clip.absolutePath = mediaUrl ? undefined : path
    clip.mediaUrl = mediaUrl ?? (window.desktop?.toMediaUrl ? undefined : sampleMediaUrl(name))
    if (mediaUrl) clip.mediaUrl = mediaUrl
    if (durationMs) Object.assign(clip, applyDuration(clip, durationMs))
    if (hasAudio != null) clip.hasAudio = hasAudio
    commit({ clips: [...project.clips, clip], selectedClipId: clip.id, selectedExtraId: null })
  }

  const addMedia = async () => {
    if (window.desktop?.pickMedia) {
      const picked = await window.desktop.pickMedia('video')
      if (!picked) return
      const info = await window.desktop.mediaInfo?.(picked)
      await addVideoClip(picked, undefined, info?.durationMs, info?.hasAudio)
      return
    }
    mediaInputRef.current?.click()
  }

  const addMusic = async () => {
    let absolutePath: string | undefined
    let mediaUrl = sampleMusicUrl()
    let label = 'Sample music'
    let durationMs = 12000
    if (window.desktop?.pickMedia) {
      const picked = await window.desktop.pickMedia('audio')
      if (picked) {
        absolutePath = picked
        mediaUrl = window.desktop.toMediaUrl?.(picked) ?? sampleMusicUrl()
        label = picked.split(/[/\\]/).pop() ?? 'Music'
        durationMs = (await window.desktop.mediaInfo?.(picked))?.durationMs || 12000
      }
    }
    const extra = createExtra('audio', project.playheadMs, {
      label,
      absolutePath,
      mediaUrl,
      durationMs,
    })
    commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null })
  }

  const addText = () => {
    const extra = createExtra('text', project.playheadMs)
    commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null })
  }

  const addFx = () => {
    const extra = createExtra('fx', project.playheadMs)
    commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null })
  }

  useEffect(() => {
    let cancelled = false
    const missing = project.clips.filter((clip) => !thumbs[clip.id])
    if (missing.length === 0) return
    void (async () => {
      for (const clip of missing) {
        const src = toVideoSrc(clip)
        if (!src) continue
        const frames = await captureFilmstrip(src, Math.min(6, Math.max(3, Math.round(clipPlayDurationMs(clip) / 1000))))
        if (cancelled || frames.length === 0) continue
        setThumbs((current) => ({ ...current, [clip.id]: frames }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [project.clips, thumbs])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
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

  const overlap = hit?.overlapMs ?? 0
  const transitionMs = hit?.clip.transitionMs || 1
  const transitionOpacity =
    overlap > 0 && hit?.clip.transition !== 'none' ? Math.max(0.35, 1 - overlap / transitionMs) : 1

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
          <button type="button" className="btn primary" onClick={() => onExport(project)} disabled={Boolean(exporting)}>
            Export
          </button>
        </div>
      </header>

      <div className="editor-grid">
        <aside className="editor-bin">
          <div className="eyebrow">Media</div>
          <p className="card-sub">{project.clips.length} / {MAX_TIMELINE_CLIPS} clips</p>
          {project.clips.map((clip, index) => (
            <button
              key={clip.id}
              type="button"
              className={`bin-clip${clip.id === project.selectedClipId ? ' is-on' : ''}`}
              onClick={() =>
                setProject((current) => ({
                  ...current,
                  selectedClipId: clip.id,
                  selectedExtraId: null,
                  selectedTransitionIndex: null,
                  playheadMs: clipStartMs(current.clips, index),
                }))
              }
            >
              {thumbs[clip.id]?.[0] ? (
                <img className="bin-swatch" src={thumbs[clip.id][0]} alt="" />
              ) : (
                <span className="bin-swatch" style={{ background: clip.color }} />
              )}
              <span>
                <strong>{clip.label}</strong>
                <span className="card-sub">{formatTimecode(clipPlayDurationMs(clip))} · {clip.speed}x</span>
              </span>
            </button>
          ))}
        </aside>

        <section className="editor-stage-wrap">
          <PreviewStage
            clip={hit?.clip}
            localMs={hit?.localMs ?? 0}
            playheadMs={project.playheadMs}
            playing={playing}
            masterVolume={project.masterVolume}
            extras={activeExtras}
            transitionOpacity={transitionOpacity}
            animationClass={previewAnimationClass(hit?.clip, hit?.localMs ?? 0)}
            onDuration={(id, durationMs) => {
              setProject((current) => ({
                ...current,
                clips: current.clips.map((clip) => (clip.id === id ? applyDuration(clip, durationMs) : clip)),
              }))
            }}
            onSourceTime={(sourceMs) => {
              setProject((current) => {
                const now = clipAtTime(current.clips, current.playheadMs)
                if (!now) return current
                const local = (sourceMs - now.clip.inMs) / Math.max(now.clip.speed, 0.01)
                return { ...current, playheadMs: now.startMs + local }
              })
            }}
            onClipBoundary={() => {
              if (boundaryLock.current) return
              boundaryLock.current = true
              window.setTimeout(() => {
                boundaryLock.current = false
              }, 80)
              setProject((current) => {
                const now = clipAtTime(current.clips, current.playheadMs)
                if (!now) return current
                const nextIndex = now.index + 1
                if (nextIndex >= current.clips.length) {
                  setPlaying(false)
                  return { ...current, playheadMs: projectDurationMs(current) }
                }
                return {
                  ...current,
                  playheadMs: clipStartMs(current.clips, nextIndex),
                  selectedClipId: current.clips[nextIndex].id,
                }
              })
            }}
          />
          <ActionToolbar
            playing={playing}
            playheadMs={project.playheadMs}
            durationMs={duration}
            canUndo={past.length > 0}
            canRedo={future.length > 0}
            onPlay={() => setPlaying((value) => !value)}
            onUndo={undo}
            onRedo={redo}
            onSplit={splitAtPlayhead}
            onAddMedia={() => void addMedia()}
            onAddMusic={() => void addMusic()}
            onAddText={addText}
            onAddFx={addFx}
          />
        </section>

        <aside className="editor-inspector">
          <div className="eyebrow">Inspector</div>
          <label className="field">
            <span>Master volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={project.masterVolume}
              onChange={(event) => commit({ masterVolume: Number(event.target.value) })}
            />
          </label>
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
                <span>Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selected.volume}
                  onChange={(event) => updateClip(selected.id, setVolume(selected, Number(event.target.value)))}
                />
              </label>
              <label className="field">
                <span>Filter</span>
                <select
                  value={selected.filter}
                  onChange={(event) => updateClip(selected.id, { filter: event.target.value as FilterId })}
                >
                  {FILTER_OPTIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
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
          ) : selectedExtra ? (
            <>
              <h3 style={{ margin: '8px 0' }}>{selectedExtra.label}</h3>
              {selectedExtra.kind === 'text' ? (
                <label className="field">
                  <span>Title</span>
                  <input
                    value={selectedExtra.text ?? ''}
                    onChange={(event) => updateExtra(selectedExtra.id, { text: event.target.value, label: event.target.value || 'Title' })}
                  />
                </label>
              ) : null}
              {selectedExtra.kind === 'audio' ? (
                <label className="field">
                  <span>Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedExtra.volume}
                    onChange={(event) => updateExtra(selectedExtra.id, { volume: Number(event.target.value) })}
                  />
                </label>
              ) : null}
              {selectedExtra.kind === 'fx' ? (
                <label className="field">
                  <span>Effect</span>
                  <select
                    value={selectedExtra.fx}
                    onChange={(event) => updateExtra(selectedExtra.id, { fx: event.target.value as FxId, label: event.target.value })}
                  >
                    {FX_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <p className="card-sub">Drag the clip to move it. Delete removes it from the timeline.</p>
            </>
          ) : (
            <p>Select a clip to trim, change speed, volume, or apply a filter.</p>
          )}
          {project.selectedTransitionIndex != null && project.clips[project.selectedTransitionIndex] ? (
            <label className="field" style={{ marginTop: 16 }}>
              <span>Transition</span>
              <select
                value={project.clips[project.selectedTransitionIndex].transition}
                onChange={(event) => {
                  const index = project.selectedTransitionIndex!
                  commit({
                    clips: project.clips.map((clip, clipIndex) =>
                      clipIndex === index ? applyTransition(clip, event.target.value as TransitionId) : clip,
                    ),
                  })
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
            <p className="card-sub">Click a cut between clips to choose a transition.</p>
          )}
        </aside>
      </div>

      <TimelineBoard
        project={project}
        duration={duration}
        thumbs={thumbs}
        onSeek={(playheadMs) => {
          setPlaying(false)
          setProject((current) => ({ ...current, playheadMs }))
        }}
        onSelectClip={(id) =>
          setProject((current) => ({ ...current, selectedClipId: id, selectedExtraId: null, selectedTransitionIndex: null }))
        }
        onSelectExtra={(id) =>
          setProject((current) => ({ ...current, selectedExtraId: id, selectedClipId: null, selectedTransitionIndex: null }))
        }
        onSelectTransition={(index) =>
          setProject((current) => ({
            ...current,
            selectedTransitionIndex: index,
            selectedClipId: current.clips[index]?.id ?? null,
            selectedExtraId: null,
          }))
        }
        onTrimClip={(id, edge, delta) => {
          setProject((current) => ({
            ...current,
            clips: current.clips.map((clip) => (clip.id === id ? trimClip(clip, edge, delta) : clip)),
          }))
        }}
        onTrimExtra={(id, edge, delta) => {
          setProject((current) => ({
            ...current,
            extraClips: current.extraClips.map((extra) => (extra.id === id ? trimExtra(extra, edge, delta) : extra)),
          }))
        }}
        onMoveClip={(from, to) => commit({ clips: moveClip(project.clips, from, to) })}
        onMoveExtra={(id, delta) => {
          setProject((current) => ({
            ...current,
            extraClips: current.extraClips.map((extra) => (extra.id === id ? moveExtra(extra, delta) : extra)),
          }))
        }}
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

      <input
        ref={mediaInputRef}
        className="sr-only"
        type="file"
        accept="video/mp4,video/*"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          void addVideoClip(file.name, URL.createObjectURL(file))
        }}
      />
      <input
        ref={musicInputRef}
        className="sr-only"
        type="file"
        accept="audio/*"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          const extra = createExtra('audio', project.playheadMs, {
            label: file.name,
            mediaUrl: URL.createObjectURL(file),
          })
          commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null })
        }}
      />

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
