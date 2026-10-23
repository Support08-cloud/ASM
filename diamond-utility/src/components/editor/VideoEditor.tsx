import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ASPECTS,
  MAX_TIMELINE_CLIPS,
  TRANSITION_OPTIONS,
  canvasForAspect,
  type AspectId,
  type EditorClip,
  type EditorProject,
  type ExtraClip,
  type InspectorTab,
  type TransitionId,
} from '../../models/editor'
import { transitionLayerStyle } from '../../services/edit-graph'
import { toVideoSrc } from '../../services/media-url'
import { mergePreparedProject, prepareClip, prepareEditorProject } from '../../services/prepare-media'
import { isRealDiskPath } from '../../services/sample-media'
import { captureFilmstrip } from '../../services/thumbnails'
import {
  applyDuration,
  applyTransition,
  canSplitAt,
  clipAtTime,
  clipPlayDurationMs,
  clipStartMs,
  transitionOverlapMs,
  createClipFromFile,
  createExtra,
  duplicateClip,
  extrasAtTime,
  moveClip,
  moveExtra,
  projectDurationMs,
  setSpeed,
  snapTrim,
  splitClip,
  trimClip,
  trimExtra,
} from '../../services/timeline'
import { formatTimecode, isModKey } from '../../utils/format'
import { InspectorPanel } from './InspectorPanel'
import { PreviewStage } from './PreviewStage'
import { TimelineBoard } from './TimelineBoard'
import { TransportBar } from './TransportBar'

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
  const [menu, setMenu] = useState<{ x: number; y: number; clipId: string } | null>(null)
  const [preparing, setPreparing] = useState<{ current: number; total: number; message: string } | null>({
    current: 0,
    total: initial.clips.length,
    message: 'Preparing clips',
  })
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const musicInputRef = useRef<HTMLInputElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const projectRef = useRef(project)
  projectRef.current = project
  const playClockRef = useRef(project.playheadMs)
  if (!playing) playClockRef.current = project.playheadMs

  const duration = useMemo(() => projectDurationMs(project), [project])
  const selected = project.clips.find((clip) => clip.id === project.selectedClipId) ?? null
  const selectedExtra = project.extraClips.find((extra) => extra.id === project.selectedExtraId) ?? null
  const hit = clipAtTime(project.clips, project.playheadMs)
  const activeExtras = extrasAtTime(project.extraClips, project.playheadMs)

  const gestureRef = useRef<Snapshot | null>(null)
  const gestureDirtyRef = useRef(false)

  const snapshotOf = (current: EditorProject): Snapshot => ({
    clips: current.clips,
    extraClips: current.extraClips,
    masterVolume: current.masterVolume,
  })

  const commit = useCallback((patch: Partial<EditorProject>) => {
    const current = projectRef.current
    setPast((items) => [...items.slice(-40), snapshotOf(current)])
    setFuture([])
    setProject((value) => ({ ...value, ...patch }))
  }, [])

  const beginGesture = useCallback(() => {
    if (gestureRef.current) return
    gestureRef.current = snapshotOf(projectRef.current)
    gestureDirtyRef.current = false
  }, [])

  const endGesture = useCallback(() => {
    const snap = gestureRef.current
    const dirty = gestureDirtyRef.current
    gestureRef.current = null
    gestureDirtyRef.current = false
    if (!snap || !dirty) return
    setPast((items) => [...items.slice(-40), snap])
    setFuture([])
  }, [])

  useEffect(() => {
    let cancelled = false
    const seed = initial
    void (async () => {
      const next = await prepareEditorProject(seed, (progress) => {
        if (!cancelled) setPreparing(progress)
      })
      if (cancelled) return
      setProject((current) => mergePreparedProject(current, next, seed))
      setPreparing(null)
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

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
      commit({ extraClips: project.extraClips.filter((extra) => extra.id !== selectedExtra.id), selectedExtraId: null })
      return
    }
    if (!selected || project.clips.length <= 1) return
    commit({
      clips: project.clips.filter((clip) => clip.id !== selected.id),
      selectedClipId: project.clips.find((clip) => clip.id !== selected.id)?.id ?? null,
    })
  }

  const updateClip = (id: string, patch: Partial<EditorClip>, live = false) => {
    const apply = (current: EditorProject): EditorProject => {
      const index = current.clips.findIndex((clip) => clip.id === id)
      const clips = current.clips.map((clip) => {
        if (clip.id !== id) return clip
        const next = { ...clip, ...patch }
        if (patch.transition != null && patch.transitionMs == null) {
          const ms = patch.transition === 'none' ? 0 : patch.transition === clip.transition ? clip.transitionMs : undefined
          return applyTransition(next, patch.transition, ms)
        }
        return patch.speed != null ? setSpeed(next, patch.speed) : next
      })
      const nextProject = { ...current, clips }
      const end = projectDurationMs(nextProject)
      const playheadMs = Math.min(current.playheadMs, end)
      if (patch.transition == null || index < 0) return { ...nextProject, playheadMs }
      const clip = clips[index]
      const start = clipStartMs(clips, index)
      const overlap = transitionOverlapMs(clip, clips[index + 1])
      const at = start + Math.max(0, clipPlayDurationMs(clip) - Math.max(overlap, 240) / 2)
      return {
        ...nextProject,
        playheadMs: Math.min(end, at),
        selectedTransitionIndex: index,
        inspectorTab: 'fade',
      }
    }
    if (live && gestureRef.current) {
      gestureDirtyRef.current = true
      setProject(apply)
      return
    }
    const next = apply(projectRef.current)
    commit({
      clips: next.clips,
      playheadMs: next.playheadMs,
      selectedTransitionIndex: next.selectedTransitionIndex,
      inspectorTab: next.inspectorTab,
    })
  }

  const updateExtra = (id: string, patch: Partial<ExtraClip>, live = false) => {
    const apply = (current: EditorProject): EditorProject => ({
      ...current,
      extraClips: current.extraClips.map((extra) => (extra.id === id ? { ...extra, ...patch } : extra)),
    })
    if (live && gestureRef.current) {
      gestureDirtyRef.current = true
      setProject(apply)
      return
    }
    commit({ extraClips: apply(projectRef.current).extraClips })
  }

  const addVideoClip = async (path: string, mediaUrl?: string, durationMs?: number, hasAudio?: boolean) => {
    const current = projectRef.current
    if (current.clips.length >= MAX_TIMELINE_CLIPS) return
    const name = path.split(/[/\\]/).pop() ?? 'clip.mp4'
    let clip = createClipFromFile(
      {
        diamondName: current.diamondName,
        viewLabel: name,
        sourcePath: path,
        outputPath: path,
        status: 'copied',
      },
      current.clips.length,
    )
    clip.absolutePath = mediaUrl ? undefined : path
    if (mediaUrl) clip.mediaUrl = mediaUrl
    if (durationMs) Object.assign(clip, applyDuration(clip, durationMs))
    if (hasAudio != null) clip.hasAudio = hasAudio
    if (!mediaUrl && isRealDiskPath(path) && window.desktop?.runFfmpeg) {
      setPreparing({ current: current.clips.length + 1, total: current.clips.length + 1, message: `Preparing ${name}` })
      clip = await prepareClip(clip, current.outputDir)
      setPreparing(null)
    }
    const latest = projectRef.current
    if (latest.clips.length >= MAX_TIMELINE_CLIPS) return
    commit({ clips: [...latest.clips, clip], selectedClipId: clip.id, selectedExtraId: null })
  }

  const addMedia = async () => {
    if (window.desktop?.pickVideos) {
      const picked = await window.desktop.pickVideos()
      if (!picked?.length) return
      for (const file of picked) {
        if (projectRef.current.clips.length >= MAX_TIMELINE_CLIPS) break
        const info = await window.desktop.mediaInfo?.(file)
        await addVideoClip(file, undefined, info?.durationMs, info?.hasAudio)
      }
      return
    }
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
    if (window.desktop?.pickMedia) {
      const picked = await window.desktop.pickMedia('audio')
      if (!picked) return
      const durationMs = (await window.desktop.mediaInfo?.(picked))?.durationMs || 12000
      const extra = createExtra('audio', projectRef.current.playheadMs, {
        label: picked.split(/[/\\]/).pop() ?? 'Music',
        absolutePath: picked,
        mediaUrl: window.desktop.toMediaUrl?.(picked),
        durationMs,
      })
      commit({ extraClips: [...projectRef.current.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null, inspectorTab: 'audio' })
      return
    }
    musicInputRef.current?.click()
  }

  const addText = () => {
    const extra = createExtra('text', project.playheadMs)
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
        const frames = await captureFilmstrip(src, Math.min(8, Math.max(4, Math.round(clipPlayDurationMs(clip) / 800))))
        if (cancelled || frames.length === 0) continue
        setThumbs((current) => ({ ...current, [clip.id]: frames }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [project.clips, thumbs])

  useEffect(() => {
    if (!playing) return
    playClockRef.current = projectRef.current.playheadMs
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(80, Math.max(0, now - last))
      last = now
      const end = projectDurationMs(projectRef.current)
      const next = Math.min(end, playClockRef.current + dt)
      playClockRef.current = next
      setProject((current) => {
        const at = clipAtTime(current.clips, next)
        const follow = !gestureRef.current && current.selectedExtraId == null && at ? at.clip.id : current.selectedClipId
        if (current.playheadMs === next && current.selectedClipId === follow) return current
        return { ...current, playheadMs: next, selectedClipId: follow }
      })
      if (next >= end) {
        setPlaying(false)
        return
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [playing])

  const togglePlay = () => {
    if (playing) {
      setPlaying(false)
      return
    }
    setProject((current) => {
      const end = projectDurationMs(current)
      if (current.playheadMs >= end - 40) return { ...current, playheadMs: 0 }
      return current
    })
    setPlaying(true)
  }

  const duplicateSelected = () => {
    const current = projectRef.current
    const id = current.selectedClipId
    if (!id) return
    const clips = duplicateClip(current.clips, id)
    if (clips === current.clips) return
    const index = current.clips.findIndex((clip) => clip.id === id)
    commit({ clips, selectedClipId: clips[index + 1]?.id ?? id, selectedExtraId: null })
  }

  const toggleMute = () => {
    const current = projectRef.current
    const clip = current.clips.find((item) => item.id === current.selectedClipId)
    if (!clip) return
    updateClip(clip.id, { muted: !clip.muted })
  }

  const stepPlayhead = (delta: number) => {
    setPlaying(false)
    setProject((current) => ({
      ...current,
      playheadMs: Math.max(0, Math.min(projectDurationMs(current), current.playheadMs + delta)),
    }))
  }

  const actionsRef = useRef({ togglePlay, splitAtPlayhead, deleteSelected, undo, redo, toggleMute, stepPlayhead, duplicateSelected })
  actionsRef.current = { togglePlay, splitAtPlayhead, deleteSelected, undo, redo, toggleMute, stepPlayhead, duplicateSelected }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const actions = actionsRef.current
      if (event.code === 'Space') {
        event.preventDefault()
        actions.togglePlay()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        actions.stepPlayhead(event.altKey ? -33 : event.shiftKey ? -1000 : -100)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        actions.stepPlayhead(event.altKey ? 33 : event.shiftKey ? 1000 : 100)
      }
      if (event.key.toLowerCase() === 'd' && !isModKey(event)) actions.duplicateSelected()
      if (event.key.toLowerCase() === 'm' && !isModKey(event)) actions.toggleMute()
      if (event.key.toLowerCase() === 's' && !isModKey(event)) actions.splitAtPlayhead()
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        actions.deleteSelected()
      }
      if (isModKey(event) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) actions.redo()
        else actions.undo()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const selectCut = (index: number) => {
    setPlaying(false)
    setProject((current) => {
      const clip = current.clips[index]
      const start = clipStartMs(current.clips, index)
      const overlapMs = clip ? transitionOverlapMs(clip, current.clips[index + 1]) : 0
      const at = start + Math.max(0, (clip ? clipPlayDurationMs(clip) : 0) - Math.max(overlapMs, 240) / 2)
      return {
        ...current,
        selectedTransitionIndex: index,
        selectedClipId: clip?.id ?? null,
        selectedExtraId: null,
        inspectorTab: 'fade',
        playheadMs: at,
      }
    })
  }

  const exportBlocked = project.clips.some(
    (clip) => clip.ready === false || Boolean(clip.error) || (Boolean(window.desktop?.runFfmpeg) && !clip.durationProbed),
  )
  const exportTitle = preparing
    ? 'Preparing clips for playback'
    : exportBlocked
      ? project.clips.find((clip) => clip.error)?.error || 'Wait until every video is ready, then export'
      : undefined

  const frame = canvasForAspect(project.aspect)
  const overlap = hit?.overlapMs ?? 0
  const transitionMs = hit?.clip.transitionMs || 1
  const transitionProgress = overlap > 0 && hit?.clip.transition !== 'none' ? Math.min(1, overlap / transitionMs) : 0
  const incomingClip = hit && transitionProgress > 0 ? project.clips[hit.index + 1] : undefined

  return (
    <div className="nle-shell">
      <header className="nle-top">
        <div className="nle-brand">
          <button type="button" className="btn ghost" onClick={onClose}>
            Back
          </button>
          <strong>{project.diamondName}</strong>
          <span className="card-sub">{project.clips.length} clips</span>
        </div>
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">
            Undo
          </button>
          <button type="button" className="btn ghost" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Shift+Z)">
            Redo
          </button>
          <button type="button" className="btn ghost" onClick={splitAtPlayhead} disabled={!hit || !canSplitAt(hit.clip, hit.localMs)} title="Split at playhead (S)">
            Split
          </button>
          <button type="button" className="btn ghost" onClick={duplicateSelected} disabled={!selected} title="Duplicate clip (D)">
            Duplicate
          </button>
          <button type="button" className="btn ghost" onClick={deleteSelected} disabled={!selectedExtra && !(selected && project.clips.length > 1)} title="Delete">
            Delete
          </button>
        </div>
        <div className="btn-row">
          <label className="nle-aspect">
            <span>Frame</span>
            <select
              value={project.aspect ?? '16:9'}
              onChange={(event) => commit({ aspect: event.target.value as AspectId })}
              title="Preview and export frame"
            >
              {ASPECTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn primary"
            onClick={() => onExport(project)}
            disabled={Boolean(exporting || preparing || exportBlocked)}
            title={exportTitle || 'Export MP4'}
          >
            Export
          </button>
        </div>
        {exportTitle ? <p className="nle-notice">{exportTitle}</p> : null}
      </header>

      <div className="nle-body">
        <aside className="nle-bin">
          <div className="nle-bin-tools">
            <button type="button" className="btn primary" onClick={() => void addMedia()}>
              Import
            </button>
            <button type="button" className="btn ghost" onClick={addText} title="Add a title at the playhead">
              Text
            </button>
            <button type="button" className="btn ghost" onClick={() => void addMusic()} title="Add an audio file">
              Audio
            </button>
          </div>
          <div className="nle-bin-grid">
            {project.clips.map((clip, index) => (
              <button
                key={clip.id}
                type="button"
                className={`nle-bin-card${clip.id === project.selectedClipId ? ' is-on' : ''}${hit?.clip.id === clip.id ? ' is-live' : ''}`}
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
                {thumbs[clip.id]?.[0] ? <img src={thumbs[clip.id][0]} alt="" /> : <span className="nle-bin-swatch" style={{ background: clip.color }} />}
                <strong>{clip.label.replace('.mp4', '')}</strong>
                <span>{formatTimecode(clipPlayDurationMs(clip))}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="nle-center">
          <div className="nle-preview">
            <div className="nle-frame" style={{ '--aw': frame.width, '--ah': frame.height } as CSSProperties}>
          <PreviewStage
            clip={hit?.clip}
            localMs={hit?.localMs ?? 0}
            playheadMs={project.playheadMs}
            playing={playing}
            masterVolume={project.masterVolume}
            extras={activeExtras}
            outgoingStyle={incomingClip && hit ? transitionLayerStyle(hit.clip.transition, 'out', transitionProgress) : undefined}
            incoming={
              incomingClip && hit
                ? {
                    clip: incomingClip,
                    localMs: overlap,
                    layerStyle: transitionLayerStyle(hit.clip.transition, 'in', transitionProgress),
                  }
                : null
            }
            onDuration={(id, durationMs) => {
              if (!Number.isFinite(durationMs) || durationMs <= 0) return
              setProject((current) => ({
                ...current,
                clips: current.clips.map((clip) => (clip.id === id && !clip.durationProbed ? applyDuration(clip, durationMs) : clip)),
              }))
            }}
          />
            </div>
          </div>
          <TransportBar
            playing={playing}
            playheadMs={project.playheadMs}
            durationMs={duration}
            canUndo={past.length > 0}
            canRedo={future.length > 0}
            canSplit={Boolean(hit && canSplitAt(hit.clip, hit.localMs))}
            canDelete={Boolean(selectedExtra || (selected && project.clips.length > 1))}
            onPlay={togglePlay}
            onUndo={undo}
            onRedo={redo}
            onSplit={splitAtPlayhead}
            onDelete={deleteSelected}
            onSeek={(playheadMs) => {
              setPlaying(false)
              setProject((current) => ({ ...current, playheadMs }))
            }}
            onStep={stepPlayhead}
          />
        </section>

        <InspectorPanel
          tab={project.inspectorTab}
          onTab={(inspectorTab: InspectorTab) => setProject((current) => ({ ...current, inspectorTab }))}
          masterVolume={project.masterVolume}
          onMasterVolume={(masterVolume) => {
            if (gestureRef.current) {
              gestureDirtyRef.current = true
              setProject((current) => ({ ...current, masterVolume }))
              return
            }
            commit({ masterVolume })
          }}
          onGestureStart={beginGesture}
          onGestureEnd={endGesture}
          selected={selected}
          selectedExtra={selectedExtra}
          onClip={(patch) => selected && updateClip(selected.id, patch)}
          onClipLive={(patch) => selected && updateClip(selected.id, patch, true)}
          onExtra={(patch) => selectedExtra && updateExtra(selectedExtra.id, patch)}
          onExtraLive={(patch) => selectedExtra && updateExtra(selectedExtra.id, patch, true)}
        />
      </div>

      <div ref={timelineRef}>
        <TimelineBoard
          project={project}
          duration={duration}
          thumbs={thumbs}
          playing={playing}
          onSeek={(playheadMs) => {
            setPlaying(false)
            setProject((current) => {
              const at = clipAtTime(current.clips, playheadMs)
              return {
                ...current,
                playheadMs,
                selectedClipId: at?.clip.id ?? current.selectedClipId,
                selectedExtraId: null,
              }
            })
          }}
          onSelectClip={(id, playheadMs) => {
            setPlaying(false)
            setProject((current) => ({
              ...current,
              selectedClipId: id,
              selectedExtraId: null,
              selectedTransitionIndex: null,
              playheadMs,
            }))
          }}
          onSelectExtra={(id) =>
            setProject((current) => ({ ...current, selectedExtraId: id, selectedClipId: null, selectedTransitionIndex: null }))
          }
          onSelectTransition={selectCut}
          onGestureStart={beginGesture}
          onGestureEnd={endGesture}
          onTrimClip={(id, edge, delta) => {
            if (gestureRef.current) gestureDirtyRef.current = true
            setProject((current) => {
              const trimmed = current.clips.map((clip) => (clip.id === id ? trimClip(clip, edge, delta) : clip))
              const index = trimmed.findIndex((clip) => clip.id === id)
              const clips = trimmed.map((clip, clipIndex) => (clipIndex === index ? snapTrim(trimmed, index, edge, current.playheadMs) : clip))
              const end = projectDurationMs({ ...current, clips })
              return { ...current, clips, playheadMs: Math.min(current.playheadMs, end) }
            })
          }}
          onTrimExtra={(id, edge, delta) => {
            if (gestureRef.current) gestureDirtyRef.current = true
            setProject((current) => ({
              ...current,
              extraClips: current.extraClips.map((extra) => (extra.id === id ? trimExtra(extra, edge, delta) : extra)),
            }))
          }}
          onMoveClip={(from, to) => commit({ clips: moveClip(projectRef.current.clips, from, to) })}
          onMoveExtra={(id, delta) => {
            if (gestureRef.current) gestureDirtyRef.current = true
            setProject((current) => ({
              ...current,
              extraClips: current.extraClips.map((extra) => (extra.id === id ? moveExtra(extra, delta) : extra)),
            }))
          }}
          onClipMenu={(clipId, x, y) => {
            setMenu({ clipId, x, y })
            setProject((current) => ({ ...current, selectedClipId: clipId, selectedExtraId: null, selectedTransitionIndex: null }))
          }}
          onAddText={addText}
          onAddAudio={() => void addMusic()}
          onZoom={(pixelsPerSecond) => setProject((current) => ({ ...current, pixelsPerSecond }))}
          onFit={() => {
            const el = timelineRef.current?.querySelector('.timeline-track')
            const w = el instanceof HTMLElement ? el.clientWidth - 8 : 720
            setProject((current) => ({
              ...current,
              pixelsPerSecond: Math.max(40, Math.min(220, w / Math.max(projectDurationMs(current) / 1000, 1))),
            }))
          }}
        />
      </div>

      {menu ? (
        <div className="nle-menu" style={{ left: menu.x, top: menu.y }} onMouseLeave={() => setMenu(null)}>
          <button
            type="button"
            onClick={() => {
              const current = projectRef.current
              const index = current.clips.findIndex((clip) => clip.id === menu.clipId)
              const clip = current.clips[index]
              if (!clip) return
              const start = clipStartMs(current.clips, index)
              const span = clipPlayDurationMs(clip)
              const inside = current.playheadMs >= start && current.playheadMs <= start + span
              const local = inside ? current.playheadMs - start : span / 2
              const parts = splitClip(clip, local)
              if (!parts) return
              const clips = [...current.clips]
              clips.splice(index, 1, ...parts)
              commit({ clips, selectedClipId: parts[1].id, playheadMs: start + local, selectedExtraId: null })
              setMenu(null)
            }}
          >
            Split
          </button>
          <button type="button" onClick={() => { duplicateSelected(); setMenu(null) }}>Duplicate</button>
          <button type="button" onClick={() => { deleteSelected(); setMenu(null) }}>Delete</button>
          <button
            type="button"
            onClick={() => {
              const clip = project.clips.find((item) => item.id === menu.clipId)
              if (clip) updateClip(clip.id, { muted: !clip.muted })
              setMenu(null)
            }}
          >
            Mute
          </button>
        </div>
      ) : null}

      {project.selectedTransitionIndex != null && project.clips[project.selectedTransitionIndex] ? (
        <div className="nle-transition-bar">
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
        </div>
      ) : null}

      {preparing ? (
        <div className="editor-export">
          <div>
            <div className="eyebrow">Preparing clips</div>
            <p>{preparing.message}</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.round((preparing.current / Math.max(preparing.total, 1)) * 100)}%` }} />
            </div>
          </div>
        </div>
      ) : null}

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
        multiple
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          for (const file of files) {
            void addVideoClip(file.name, URL.createObjectURL(file))
          }
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
          const mediaUrl = URL.createObjectURL(file)
          const audio = new Audio()
          audio.preload = 'metadata'
          audio.src = mediaUrl
          const place = (durationMs: number) => {
            const current = projectRef.current
            const extra = createExtra('audio', current.playheadMs, { label: file.name, mediaUrl, durationMs })
            commit({ extraClips: [...current.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null, inspectorTab: 'audio' })
          }
          audio.onloadedmetadata = () => {
            const durationMs = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration * 1000) : 12000
            place(durationMs)
          }
          audio.onerror = () => place(12000)
        }}
      />
    </div>
  )
}
