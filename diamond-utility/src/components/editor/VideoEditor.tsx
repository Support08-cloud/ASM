import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_DUCKING,
  DEFAULT_EXPORT,
  EFFECT_OPTIONS,
  LIBRARY_TABS,
  MAX_TIMELINE_CLIPS,
  TRANSITION_OPTIONS,
  type DuckingSettings,
  type EditorClip,
  type EditorProject,
  type ExtraClip,
  type ExportSettings,
  type TimelineTool,
  type TransitionId,
} from '../../models/editor'
import { addVolumeKeyframe, removeVolumeKeyframe } from '../../services/editor-audio'
import { toVideoSrc } from '../../services/media-url'
import { prepareEditorProject } from '../../services/prepare-media'
import { sampleMusicUrl } from '../../services/sample-media'
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
  skipPlayhead,
  slipClip,
  splitClip,
  trimClip,
  trimExtra,
} from '../../services/timeline'
import { isModKey } from '../../utils/format'
import { ExportDialog } from './ExportDialog'
import { InspectorPanel } from './InspectorPanel'
import { PreviewStage } from './PreviewStage'
import { RenderOverlay } from './RenderOverlay'
import { TimelineBoard } from './TimelineBoard'
import { TransportBar } from './TransportBar'

interface VideoEditorProps {
  project: EditorProject
  exporting?: { percent: number; message: string } | null
  onClose: (project?: EditorProject) => void
  onSave: (project: EditorProject) => void
  onCancelExport: () => void
  onExport: (project: EditorProject) => void
}

interface Snapshot {
  clips: EditorClip[]
  extraClips: ExtraClip[]
  masterVolume: number
  ducking: DuckingSettings
  selectedClipId: string | null
  selectedExtraId: string | null
}

export function VideoEditor({ project: initial, exporting, onClose, onSave, onCancelExport, onExport }: VideoEditorProps) {
  const [project, setProject] = useState(() => withDefaults(initial))
  const [playing, setPlaying] = useState(false)
  const [past, setPast] = useState<Snapshot[]>([])
  const [future, setFuture] = useState<Snapshot[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string[]>>({})
  const [exportOpen, setExportOpen] = useState(false)
  const [menu, setMenu] = useState<'file' | 'view' | 'timeline' | null>(null)
  const [query, setQuery] = useState('')
  const [preparing, setPreparing] = useState<{ current: number; total: number; message: string } | null>({
    current: 0,
    total: initial.clips.length,
    message: 'Preparing clips',
  })
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const musicInputRef = useRef<HTMLInputElement>(null)
  const overlayInputRef = useRef<HTMLInputElement>(null)
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
    setPast((items) => [...items.slice(-40), snapshotOf(current)])
    setFuture([])
    setProject((value) => ({ ...value, ...patch }))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next = await prepareEditorProject(initial, (progress) => {
        if (!cancelled) setPreparing(progress)
      })
      if (cancelled) return
      setProject((current) => withDefaults({ ...next, playheadMs: current.playheadMs, extraClips: current.extraClips.length ? current.extraClips : next.extraClips }))
      setPreparing(null)
    })()
    return () => {
      cancelled = true
    }
  }, [initial])

  const undo = () => {
    const previous = past[past.length - 1]
    if (!previous) return
    setPast((items) => items.slice(0, -1))
    setFuture((items) => [snapshotOf(projectRef.current), ...items])
    setProject((value) => ({ ...value, ...previous }))
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    setFuture((items) => items.slice(1))
    setPast((items) => [...items, snapshotOf(projectRef.current)])
    setProject((value) => ({ ...value, ...next }))
  }

  const splitAtPlayhead = () => {
    if (!hit) return
    applySplit(hit.clip.id, hit.localMs)
  }

  const applySplit = (clipId: string, localMs: number) => {
    const index = project.clips.findIndex((clip) => clip.id === clipId)
    if (index < 0) return
    const parts = splitClip(project.clips[index], localMs)
    if (!parts) return
    const clips = [...project.clips]
    clips.splice(index, 1, ...parts)
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

  const updateClip = (id: string, patch: Partial<EditorClip>) => {
    commit({
      clips: project.clips.map((clip) => {
        if (clip.id !== id) return clip
        const next = { ...clip, ...patch }
        return patch.speed != null ? setSpeed(next, patch.speed) : next
      }),
    })
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
    if (mediaUrl) clip.mediaUrl = mediaUrl
    if (durationMs) Object.assign(clip, applyDuration(clip, durationMs))
    if (hasAudio != null) clip.hasAudio = hasAudio
    commit({ clips: [...project.clips, clip], selectedClipId: clip.id, selectedExtraId: null, libraryTab: 'media' })
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
    let label = 'Background Music'
    let durationMs = 12000
    if (window.desktop?.pickMedia) {
      const picked = await window.desktop.pickMedia('audio')
      if (!picked) return
      absolutePath = picked
      mediaUrl = window.desktop.toMediaUrl?.(picked) ?? sampleMusicUrl()
      label = picked.split(/[/\\]/).pop() ?? 'Background Music'
      durationMs = (await window.desktop.mediaInfo?.(picked))?.durationMs || 12000
    } else {
      musicInputRef.current?.click()
      return
    }
    const extra = createExtra('audio', project.playheadMs, { label, absolutePath, mediaUrl, durationMs })
    commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null, libraryTab: 'audio' })
  }

  const addText = () => {
    const extra = createExtra('text', project.playheadMs)
    commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null, libraryTab: 'text' })
  }

  const addOverlay = async () => {
    if (window.desktop?.pickMedia) {
      const picked = await window.desktop.pickMedia('video')
      if (!picked) return
      const extra = createExtra('overlay', project.playheadMs, {
        label: picked.split(/[/\\]/).pop() ?? 'Overlay',
        absolutePath: picked,
        mediaUrl: window.desktop.toMediaUrl?.(picked),
        durationMs: (await window.desktop.mediaInfo?.(picked))?.durationMs || 4000,
      })
      commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null })
      return
    }
    overlayInputRef.current?.click()
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
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (event.code === 'Space') {
        event.preventDefault()
        setPlaying((value) => !value)
      }
      if (event.key.toLowerCase() === 's' && !isModKey(event)) splitAtPlayhead()
      if (event.key.toLowerCase() === 'b' && !isModKey(event)) setProject((current) => ({ ...current, timelineTool: current.timelineTool === 'blade' ? 'select' : 'blade' }))
      if (event.key.toLowerCase() === 'v' && !isModKey(event)) setProject((current) => ({ ...current, timelineTool: 'select' }))
      if (event.key.toLowerCase() === 'y' && !isModKey(event)) setProject((current) => ({ ...current, timelineTool: 'slip' }))
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

  const libraryItems = libraryItemsFor(project)

  return (
    <div className="v360-editor">
      <header className="v360-top">
        <div className="v360-top-left">
          <strong>Vision360</strong>
          <span>{project.diamondName}</span>
          <nav>
            <button type="button" className={menu === 'file' ? 'is-on' : undefined} onClick={() => setMenu((value) => (value === 'file' ? null : 'file'))}>
              File
            </button>
            <button type="button" className="is-on">
              Edit
            </button>
            <button type="button" className={menu === 'view' ? 'is-on' : undefined} onClick={() => setMenu((value) => (value === 'view' ? null : 'view'))}>
              View
            </button>
            <button type="button" className={menu === 'timeline' ? 'is-on' : undefined} onClick={() => setMenu((value) => (value === 'timeline' ? null : 'timeline'))}>
              Timeline
            </button>
          </nav>
          {menu === 'file' ? (
            <div className="v360-menu">
              <button type="button" onClick={() => { onSave(project); setMenu(null) }}>Save project</button>
              <button type="button" onClick={() => { onClose(project); setMenu(null) }}>Close editor</button>
            </div>
          ) : null}
          {menu === 'view' ? (
            <div className="v360-menu">
              <button type="button" onClick={() => { setProject((current) => ({ ...current, pixelsPerSecond: 80 })); setMenu(null) }}>Fit timeline</button>
              <button type="button" onClick={() => { setProject((current) => ({ ...current, playheadMs: 0 })); setMenu(null) }}>Go to start</button>
            </div>
          ) : null}
          {menu === 'timeline' ? (
            <div className="v360-menu">
              <button type="button" onClick={() => { splitAtPlayhead(); setMenu(null) }}>Split at playhead</button>
              <button type="button" onClick={() => { addText(); setMenu(null) }}>Add title</button>
              <button type="button" onClick={() => { void addMusic(); setMenu(null) }}>Add music</button>
            </div>
          ) : null}
        </div>
        <div className="v360-top-right">
          <button type="button" disabled={past.length === 0} onClick={undo} title="Undo">
            ↺
          </button>
          <button type="button" disabled={future.length === 0} onClick={redo} title="Redo">
            ↻
          </button>
          <button type="button" className="v360-ghost" onClick={() => onSave(project)}>
            Save
          </button>
          <button type="button" className="v360-primary" onClick={() => setExportOpen(true)} disabled={Boolean(exporting || preparing)}>
            Export
          </button>
        </div>
      </header>

      <div className="v360-workspace">
        <nav className="v360-rail" aria-label="Library">
          {LIBRARY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={project.libraryTab === tab.id ? 'is-on' : undefined}
              onClick={() => setProject((current) => ({ ...current, libraryTab: tab.id }))}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <aside className="v360-media">
          <div className="v360-panel-head">
            <span>{project.libraryTab === 'media' ? 'Project Media' : project.libraryTab}</span>
            <button
              type="button"
              className="v360-ghost"
              onClick={() => {
                if (project.libraryTab === 'text') addText()
                else if (project.libraryTab === 'audio') void addMusic()
                else if (project.libraryTab === 'effects') selected && updateClip(selected.id, { effect: 'pulse' })
                else void addMedia()
              }}
            >
              {project.libraryTab === 'media' ? 'Import' : 'Add'}
            </button>
          </div>
          <div className="v360-search">
            <input placeholder="Search assets..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="v360-bin-grid">
            {project.libraryTab === 'effects'
              ? EFFECT_OPTIONS.filter((item) => item.id !== 'none' && (!query || item.label.toLowerCase().includes(query.toLowerCase()))).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={selected?.effect === item.id ? 'is-on' : undefined}
                    onClick={() => selected && updateClip(selected.id, { effect: item.id })}
                  >
                    <span className="v360-bin-swatch" style={{ background: item.id === selected?.effect ? '#FF6B00' : '#3d5a73' }} />
                    <strong>{item.label}</strong>
                    <em>Effect</em>
                  </button>
                ))
              : libraryItems.filter((item) => !query || item.label.toLowerCase().includes(query.toLowerCase())).map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.selected ? 'is-on' : undefined}
                onClick={() => {
                  if (item.kind === 'clip') {
                    setProject((current) => ({
                      ...current,
                      selectedClipId: item.id,
                      selectedExtraId: null,
                      playheadMs: clipStartMs(current.clips, current.clips.findIndex((clip) => clip.id === item.id)),
                    }))
                    return
                  }
                  setProject((current) => ({ ...current, selectedExtraId: item.id, selectedClipId: null }))
                }}
              >
                {thumbs[item.id]?.[0] ? <img src={thumbs[item.id][0]} alt="" /> : <span className="v360-bin-swatch" style={{ background: item.color }} />}
                <strong>{item.label}</strong>
                <em>{item.meta}</em>
              </button>
            ))}
          </div>
        </aside>

        <section className="v360-center">
          <div className="v360-panel-head">
            <span>Program</span>
            <em>Fit · 1920x1080</em>
          </div>
          <PreviewStage
            clip={hit?.clip}
            localMs={hit?.localMs ?? 0}
            playheadMs={project.playheadMs}
            playing={playing}
            masterVolume={project.masterVolume}
            extras={activeExtras}
            ducking={project.ducking}
            transitionOpacity={transitionOpacity}
            showCrop={!playing && Boolean(selected?.transform.cropEnabled)}
            onDuration={(id, durationMs) => {
              setProject((current) => ({
                ...current,
                clips: current.clips.map((clip) => (clip.id === id && !clip.durationProbed ? applyDuration(clip, durationMs) : clip)),
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
              if (preparing || boundaryLock.current) return
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
          <TransportBar
            playing={playing}
            playheadMs={project.playheadMs}
            durationMs={duration}
            fps={project.exportSettings.fps}
            onPlay={() => setPlaying((value) => !value)}
            onSeek={(playheadMs) => {
              setPlaying(false)
              setProject((current) => ({ ...current, playheadMs }))
            }}
            onStep={(delta) => {
              setPlaying(false)
              setProject((current) => ({
                ...current,
                playheadMs: Math.max(0, Math.min(projectDurationMs(current), current.playheadMs + delta)),
              }))
            }}
            onSkip={(edge) => {
              setPlaying(false)
              setProject((current) => ({
                ...current,
                playheadMs:
                  edge === 'start'
                    ? 0
                    : edge === 'end'
                      ? projectDurationMs(current)
                      : skipPlayhead(current.clips, current.playheadMs, edge === 'prev' ? -1 : 1),
              }))
            }}
          />
        </section>

        <InspectorPanel
          masterVolume={project.masterVolume}
          onMasterVolume={(masterVolume) => commit({ masterVolume })}
          selected={selected}
          selectedExtra={selectedExtra}
          ducking={project.ducking}
          onDucking={(patch) => commit({ ducking: { ...project.ducking, ...patch } })}
          playheadMs={project.playheadMs}
          onClip={(patch) => selected && updateClip(selected.id, patch)}
          onExtra={(patch) => selectedExtra && updateExtra(selectedExtra.id, patch)}
          onAddKeyframe={() => {
            if (!selectedExtra || selectedExtra.kind !== 'audio') return
            const local = project.playheadMs - selectedExtra.startMs
            updateExtra(selectedExtra.id, addVolumeKeyframe(selectedExtra, local))
          }}
          onRemoveKeyframe={(id) => {
            if (!selectedExtra || selectedExtra.kind !== 'audio') return
            updateExtra(selectedExtra.id, removeVolumeKeyframe(selectedExtra, id))
          }}
        />

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
              inspectorTab: 'fade',
            }))
          }
          onTrimClip={(id, edge, delta) => {
            commit({
              clips: project.clips.map((clip) => (clip.id === id ? trimClip(clip, edge, delta) : clip)),
            })
          }}
          onTrimExtra={(id, edge, delta) => {
            commit({
              extraClips: project.extraClips.map((extra) => (extra.id === id ? trimExtra(extra, edge, delta) : extra)),
            })
          }}
          onMoveClip={(from, to) => commit({ clips: moveClip(project.clips, from, to) })}
          onMoveExtra={(id, delta) => {
            commit({
              extraClips: project.extraClips.map((extra) => (extra.id === id ? moveExtra(extra, delta) : extra)),
            })
          }}
          onAddText={addText}
          onAddAudio={() => void addMusic()}
          onAddOverlay={() => void addOverlay()}
          onZoom={(pixelsPerSecond) => setProject((current) => ({ ...current, pixelsPerSecond }))}
          onTool={(timelineTool: TimelineTool) => setProject((current) => ({ ...current, timelineTool }))}
          onSplit={splitAtPlayhead}
          onSplitAt={applySplit}
          onSlip={(id, delta) => {
            commit({ clips: project.clips.map((clip) => (clip.id === id ? slipClip(clip, delta) : clip)) })
          }}
          onMuteClip={(id) => {
            const clip = project.clips.find((item) => item.id === id)
            if (clip) updateClip(id, { muted: !clip.muted })
          }}
        />
      </div>

      {project.selectedTransitionIndex != null && project.clips[project.selectedTransitionIndex] ? (
        <div className="v360-transition">
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

      {exportOpen && !exporting ? (
        <ExportDialog
          project={project}
          onChange={(exportSettings: ExportSettings) => setProject((current) => ({ ...current, exportSettings }))}
          onCancel={() => setExportOpen(false)}
          onStart={() => {
            setExportOpen(false)
            onExport(project)
          }}
        />
      ) : null}

      {preparing ? (
        <RenderOverlay
          percent={Math.round((preparing.current / Math.max(preparing.total, 1)) * 100)}
          message={preparing.message}
          onCancel={() => setPreparing(null)}
        />
      ) : null}
      {exporting ? <RenderOverlay percent={exporting.percent} message={exporting.message} onCancel={onCancelExport} /> : null}

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
        ref={overlayInputRef}
        className="sr-only"
        type="file"
        accept="video/mp4,video/*"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          const extra = createExtra('overlay', project.playheadMs, {
            label: file.name,
            mediaUrl: URL.createObjectURL(file),
          })
          commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null })
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
          const extra = createExtra('audio', project.playheadMs, { label: file.name, mediaUrl: URL.createObjectURL(file) })
          commit({ extraClips: [...project.extraClips, extra], selectedExtraId: extra.id, selectedClipId: null })
        }}
      />
    </div>
  )
}

function withDefaults(project: EditorProject): EditorProject {
  return {
    ...project,
    libraryTab: project.libraryTab ?? 'media',
    timelineTool: project.timelineTool ?? 'select',
    ducking: project.ducking ?? { ...DEFAULT_DUCKING },
    exportSettings: project.exportSettings ?? { ...DEFAULT_EXPORT },
    clips: project.clips.map((clip) => ({
      ...clip,
      transform: {
        ...clip.transform,
        rotation: clip.transform.rotation ?? 0,
        cropTop: clip.transform.cropTop ?? 0,
        cropBottom: clip.transform.cropBottom ?? 0,
        cropLeft: clip.transform.cropLeft ?? 0,
        cropRight: clip.transform.cropRight ?? 0,
        cropAspect: clip.transform.cropAspect ?? '16:9',
        cropEnabled: clip.transform.cropEnabled ?? false,
      },
    })),
    extraClips: project.extraClips.map((extra) => ({
      ...extra,
      posX: extra.posX ?? 0.5,
      posY: extra.posY ?? (extra.kind === 'text' ? 0.82 : 0.5),
      textColor: extra.textColor ?? '#ffffff',
      textAlign: extra.textAlign ?? 'center',
      animIn: extra.animIn ?? (extra.kind === 'text' ? 'fade' : 'none'),
      animOut: extra.animOut ?? (extra.kind === 'text' ? 'fade' : 'none'),
      overlayScale: extra.overlayScale ?? 0.45,
    })),
  }
}

function snapshotOf(project: EditorProject): Snapshot {
  return {
    clips: project.clips,
    extraClips: project.extraClips,
    masterVolume: project.masterVolume,
    ducking: project.ducking,
    selectedClipId: project.selectedClipId,
    selectedExtraId: project.selectedExtraId,
  }
}

function libraryItemsFor(project: EditorProject) {
  if (project.libraryTab === 'audio') {
    return project.extraClips
      .filter((extra) => extra.kind === 'audio')
      .map((extra) => ({
        id: extra.id,
        kind: 'extra' as const,
        label: extra.label,
        meta: 'Audio',
        color: extra.color,
        selected: extra.id === project.selectedExtraId,
      }))
  }
  if (project.libraryTab === 'text') {
    return project.extraClips
      .filter((extra) => extra.kind === 'text')
      .map((extra) => ({
        id: extra.id,
        kind: 'extra' as const,
        label: extra.label,
        meta: 'Title',
        color: extra.color,
        selected: extra.id === project.selectedExtraId,
      }))
  }
  return project.clips.map((clip) => ({
    id: clip.id,
    kind: 'clip' as const,
    label: clip.label.replace('.mp4', ''),
    meta: `${Math.round(clipPlayDurationMs(clip) / 1000)}s`,
    color: clip.color,
    selected: clip.id === project.selectedClipId,
  }))
}
