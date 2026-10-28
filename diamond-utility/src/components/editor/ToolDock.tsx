import { useMemo, useState } from 'react'
import {
  EFFECT_OPTIONS,
  FILTER_OPTIONS,
  TRANSITION_OPTIONS,
  type EditorProject,
  type EffectId,
  type FilterId,
  type TransitionId,
} from '../../models/editor'
import { clipPlayDurationMs, clipStartMs } from '../../services/timeline'
import { formatTimecode } from '../../utils/format'

const TOOLS = [
  { id: 'media', label: 'Media' },
  { id: 'audio', label: 'Audio' },
  { id: 'text', label: 'Text' },
  { id: 'effects', label: 'Effects' },
  { id: 'filters', label: 'Filters' },
  { id: 'transitions', label: 'Cuts' },
] as const

export type DockTool = (typeof TOOLS)[number]['id']

interface ToolDockProps {
  project: EditorProject
  liveClipId?: string
  thumbs: Record<string, string[]>
  onImport: () => void
  onAddText: () => void
  onAddAudio: () => void
  onSelectClip: (id: string, index: number) => void
  onSelectExtra: (id: string) => void
  onEffect: (id: EffectId) => void
  onFilter: (id: FilterId) => void
  onTransition: (id: TransitionId) => void
}

export function ToolDock({
  project,
  liveClipId,
  thumbs,
  onImport,
  onAddText,
  onAddAudio,
  onSelectClip,
  onSelectExtra,
  onEffect,
  onFilter,
  onTransition,
}: ToolDockProps) {
  const [tool, setTool] = useState<DockTool>('media')
  const [query, setQuery] = useState('')
  const selected = project.clips.find((clip) => clip.id === project.selectedClipId) ?? null
  const clips = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return project.clips
    return project.clips.filter((clip) => clip.label.toLowerCase().includes(needle))
  }, [project.clips, query])
  const audio = project.extraClips.filter((extra) => extra.kind === 'audio')
  const titles = project.extraClips.filter((extra) => extra.kind === 'text')

  return (
    <aside className="nle-bin">
      <div className="dock-tabs" role="tablist" aria-label="Editor tools">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tool === item.id}
            className={tool === item.id ? 'is-on' : undefined}
            onClick={() => setTool(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tool === 'media' ? (
        <>
          <div className="nle-bin-tools">
            <button type="button" className="btn primary" onClick={onImport}>
              Import
            </button>
            <input
              className="dock-search"
              value={query}
              placeholder="Search media"
              aria-label="Search media"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="nle-bin-grid">
            {clips.length === 0 ? <p className="card-sub">No media matches that search.</p> : null}
            {clips.map((clip) => {
              const index = project.clips.findIndex((item) => item.id === clip.id)
              return (
                <button
                  key={clip.id}
                  type="button"
                  className={`nle-bin-card${clip.id === project.selectedClipId ? ' is-on' : ''}${clip.id === liveClipId ? ' is-live' : ''}`}
                  onClick={() => onSelectClip(clip.id, index)}
                >
                  {thumbs[clip.id]?.[0] ? <img src={thumbs[clip.id][0]} alt="" /> : <span className="nle-bin-swatch" style={{ background: clip.color }} />}
                  <strong>{clip.label.replace(/\.mp4$/i, '')}</strong>
                  <span>{formatTimecode(clipPlayDurationMs(clip))}</span>
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      {tool === 'audio' ? (
        <>
          <div className="nle-bin-tools">
            <button type="button" className="btn primary" onClick={onAddAudio}>
              Add audio
            </button>
          </div>
          <div className="nle-bin-grid">
            {audio.length === 0 ? <p className="card-sub">No audio on the timeline yet.</p> : null}
            {audio.map((extra) => (
              <button
                key={extra.id}
                type="button"
                className={`nle-bin-card${extra.id === project.selectedExtraId ? ' is-on' : ''}`}
                onClick={() => onSelectExtra(extra.id)}
              >
                <span className="nle-bin-swatch" style={{ background: extra.color }} />
                <strong>{extra.label}</strong>
                <span>{formatTimecode(extra.durationMs)}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {tool === 'text' ? (
        <>
          <div className="nle-bin-tools">
            <button type="button" className="btn primary" onClick={onAddText}>
              Add text
            </button>
          </div>
          <div className="nle-bin-grid">
            {titles.length === 0 ? <p className="card-sub">Titles land at the playhead. Drag a title on the preview to place it.</p> : null}
            {titles.map((extra) => (
              <button
                key={extra.id}
                type="button"
                className={`nle-bin-card${extra.id === project.selectedExtraId ? ' is-on' : ''}`}
                onClick={() => onSelectExtra(extra.id)}
              >
                <span className="nle-bin-swatch" style={{ background: extra.color }} />
                <strong>{extra.text || extra.label}</strong>
                <span>{formatTimecode(extra.startMs)}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {tool === 'effects' ? (
        <ChoiceGrid
          empty={!selected}
          options={EFFECT_OPTIONS}
          active={selected?.effect}
          onPick={(id) => onEffect(id as EffectId)}
        />
      ) : null}

      {tool === 'filters' ? (
        <ChoiceGrid
          empty={!selected}
          options={FILTER_OPTIONS}
          active={selected?.filter}
          onPick={(id) => onFilter(id as FilterId)}
        />
      ) : null}

      {tool === 'transitions' ? (
        <div className="nle-bin-grid">
          <p className="card-sub">
            {selected
              ? `Cut after ${selected.label.replace(/\.mp4$/i, '')} at ${formatTimecode(clipStartMs(project.clips, project.clips.findIndex((clip) => clip.id === selected.id)) + clipPlayDurationMs(selected))}.`
              : 'Select a clip, then choose how it cuts into the next one.'}
          </p>
          <ChoiceGrid
            empty={!selected}
            options={TRANSITION_OPTIONS}
            active={selected?.transition}
            onPick={(id) => onTransition(id as TransitionId)}
          />
        </div>
      ) : null}
    </aside>
  )
}

function ChoiceGrid({
  empty,
  options,
  active,
  onPick,
}: {
  empty: boolean
  options: ReadonlyArray<{ id: string; label: string }>
  active?: string
  onPick: (id: string) => void
}) {
  if (empty) return <p className="card-sub">Select a clip on the timeline first.</p>
  return (
    <div className="nle-tile-grid">
      {options.map((item) => (
        <button key={item.id} type="button" className={`nle-tile${item.id === active ? ' is-on' : ''}`} onClick={() => onPick(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}
