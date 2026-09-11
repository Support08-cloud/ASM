import {
  DEFAULT_GRADE,
  DEFAULT_TRANSFORM,
  EFFECT_OPTIONS,
  FILTER_OPTIONS,
  INSPECTOR_TABS,
  SPEED_MAX,
  SPEED_MIN,
  type EditorClip,
  type ExtraClip,
  type InspectorTab,
} from '../../models/editor'

interface InspectorPanelProps {
  tab: InspectorTab
  onTab: (tab: InspectorTab) => void
  masterVolume: number
  onMasterVolume: (value: number) => void
  selected: EditorClip | null
  selectedExtra: ExtraClip | null
  onClip: (patch: Partial<EditorClip>) => void
  onExtra: (patch: Partial<ExtraClip>) => void
}

export function InspectorPanel({
  tab,
  onTab,
  masterVolume,
  onMasterVolume,
  selected,
  selectedExtra,
  onClip,
  onExtra,
}: InspectorPanelProps) {
  return (
    <aside className="nle-inspector">
      <div className="nle-inspector-tabs" role="tablist" aria-label="Clip tools">
        {INSPECTOR_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-on' : undefined}
            onClick={() => onTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="nle-inspector-body">
        {!selected && !selectedExtra ? <p className="card-sub">Select a clip on the timeline.</p> : null}
        {selected && tab === 'speed' ? (
          <label className="field">
            <span>Speed {selected.speed.toFixed(2)}x</span>
            <input
              type="number"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={0.05}
              value={selected.speed}
              onChange={(event) => onClip({ speed: Number(event.target.value) || 1 })}
            />
            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={0.05}
              value={selected.speed}
              onChange={(event) => onClip({ speed: Number(event.target.value) })}
            />
          </label>
        ) : null}
        {selected && tab === 'audio' ? (
          <>
            <label className="field">
              <span>Master volume</span>
              <input type="range" min={0} max={1} step={0.05} value={masterVolume} onChange={(event) => onMasterVolume(Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Clip volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selected.volume}
                onChange={(event) => onClip({ volume: Number(event.target.value) })}
              />
            </label>
            <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={selected.muted} onChange={(event) => onClip({ muted: event.target.checked })} />
              Mute clip
            </label>
          </>
        ) : null}
        {selected && tab === 'fade' ? (
          <>
            <label className="field">
              <span>Fade in ({Math.round(selected.fadeInMs)} ms)</span>
              <input type="range" min={0} max={2000} step={50} value={selected.fadeInMs} onChange={(event) => onClip({ fadeInMs: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Fade out ({Math.round(selected.fadeOutMs)} ms)</span>
              <input type="range" min={0} max={2000} step={50} value={selected.fadeOutMs} onChange={(event) => onClip({ fadeOutMs: Number(event.target.value) })} />
            </label>
          </>
        ) : null}
        {selected && tab === 'filters' ? (
          <div className="nle-tile-grid">
            {FILTER_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nle-tile${selected.filter === item.id ? ' is-on' : ''}`}
                onClick={() => onClip({ filter: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {selected && tab === 'effects' ? (
          <div className="nle-tile-grid">
            {EFFECT_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nle-tile${selected.effect === item.id ? ' is-on' : ''}`}
                onClick={() => onClip({ effect: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {selected && tab === 'color' ? (
          <>
            {(['exposure', 'contrast', 'saturation', 'temperature'] as const).map((key) => (
              <label key={key} className="field">
                <span>{key[0].toUpperCase() + key.slice(1)}</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={selected.grade[key]}
                  onChange={(event) => onClip({ grade: { ...selected.grade, [key]: Number(event.target.value) } })}
                />
              </label>
            ))}
            <label className="field">
              <span>Transparency</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selected.grade.transparency}
                onChange={(event) => onClip({ grade: { ...selected.grade, transparency: Number(event.target.value) } })}
              />
            </label>
            <button type="button" className="btn ghost" onClick={() => onClip({ grade: { ...DEFAULT_GRADE }, transform: { ...selected.transform } })}>
              Reset colors
            </button>
          </>
        ) : null}
        {selectedExtra?.kind === 'text' ? (
          <label className="field">
            <span>Title</span>
            <input
              value={selectedExtra.text ?? ''}
              onChange={(event) => onExtra({ text: event.target.value, label: event.target.value || 'Title' })}
            />
          </label>
        ) : null}
        {selectedExtra?.kind === 'audio' ? (
          <label className="field">
            <span>Music volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={selectedExtra.volume}
              onChange={(event) => onExtra({ volume: Number(event.target.value) })}
            />
          </label>
        ) : null}
        {selected ? (
          <div className="nle-transform">
            <div className="eyebrow">Canvas</div>
            <label className="field">
              <span>Scale {selected.transform.scale.toFixed(2)}</span>
              <input
                type="range"
                min={0.4}
                max={2.4}
                step={0.05}
                value={selected.transform.scale}
                onChange={(event) => onClip({ transform: { ...selected.transform, scale: Number(event.target.value) } })}
              />
            </label>
            <label className="field">
              <span>Crop</span>
              <input
                type="range"
                min={0}
                max={0.35}
                step={0.01}
                value={selected.transform.crop}
                onChange={(event) => onClip({ transform: { ...selected.transform, crop: Number(event.target.value) } })}
              />
            </label>
            <div className="btn-row">
              <button type="button" className={`btn ghost${selected.transform.flipH ? ' is-on' : ''}`} onClick={() => onClip({ transform: { ...selected.transform, flipH: !selected.transform.flipH } })}>
                Flip H
              </button>
              <button type="button" className={`btn ghost${selected.transform.flipV ? ' is-on' : ''}`} onClick={() => onClip({ transform: { ...selected.transform, flipV: !selected.transform.flipV } })}>
                Flip V
              </button>
              <button type="button" className="btn ghost" onClick={() => onClip({ transform: { ...DEFAULT_TRANSFORM } })}>
                Reset
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
