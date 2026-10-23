import {
  DEFAULT_GRADE,
  DEFAULT_TRANSFORM,
  EFFECT_OPTIONS,
  FILTER_OPTIONS,
  INSPECTOR_TABS,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_OPTIONS,
  TRANSITION_OPTIONS,
  type EditorClip,
  type ExtraClip,
  type InspectorTab,
  type TransitionId,
} from '../../models/editor'

interface InspectorPanelProps {
  tab: InspectorTab
  onTab: (tab: InspectorTab) => void
  masterVolume: number
  onMasterVolume: (value: number) => void
  onGestureStart?: () => void
  onGestureEnd?: () => void
  selected: EditorClip | null
  selectedExtra: ExtraClip | null
  onClip: (patch: Partial<EditorClip>) => void
  onClipLive?: (patch: Partial<EditorClip>) => void
  onExtra: (patch: Partial<ExtraClip>) => void
  onExtraLive?: (patch: Partial<ExtraClip>) => void
}

export function InspectorPanel({
  tab,
  onTab,
  masterVolume,
  onMasterVolume,
  onGestureStart,
  onGestureEnd,
  selected,
  selectedExtra,
  onClip,
  onClipLive,
  onExtra,
  onExtraLive,
}: InspectorPanelProps) {
  const liveClip = onClipLive ?? onClip
  const liveExtra = onExtraLive ?? onExtra
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
            <LiveRange
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={0.05}
              value={selected.speed}
              onLive={(speed) => liveClip({ speed })}
              onGestureStart={onGestureStart}
              onGestureEnd={onGestureEnd}
            />
            <div className="btn-row">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className={`btn ghost${selected.speed === speed ? ' is-on' : ''}`}
                  onClick={() => onClip({ speed })}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </label>
        ) : null}
        {selected && tab === 'audio' ? (
          <>
            <label className="field">
              <span>Master volume</span>
              <LiveRange
                min={0}
                max={1}
                step={0.05}
                value={masterVolume}
                onLive={onMasterVolume}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
              />
            </label>
            <label className="field">
              <span>Clip volume</span>
              <LiveRange
                min={0}
                max={1}
                step={0.05}
                value={selected.volume}
                onLive={(volume) => liveClip({ volume })}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
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
              <LiveRange
                min={0}
                max={2000}
                step={50}
                value={selected.fadeInMs}
                onLive={(fadeInMs) => liveClip({ fadeInMs })}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
              />
            </label>
            <label className="field">
              <span>Fade out ({Math.round(selected.fadeOutMs)} ms)</span>
              <LiveRange
                min={0}
                max={2000}
                step={50}
                value={selected.fadeOutMs}
                onLive={(fadeOutMs) => liveClip({ fadeOutMs })}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
              />
            </label>
            <p className="card-sub">The transition plays into the next video on the timeline.</p>
            <label className="field">
              <span>Transition to next</span>
              <select
                value={selected.transition}
                onChange={(event) => onClip({ transition: event.target.value as TransitionId })}
              >
                {TRANSITION_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {selected.transition !== 'none' ? (
              <label className="field">
                <span>Transition length ({Math.round(selected.transitionMs)} ms)</span>
                <LiveRange
                  min={100}
                  max={2000}
                  step={50}
                  value={selected.transitionMs}
                  onLive={(transitionMs) => liveClip({ transitionMs })}
                  onGestureStart={onGestureStart}
                  onGestureEnd={onGestureEnd}
                />
              </label>
            ) : null}
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
                <LiveRange
                  min={-1}
                  max={1}
                  step={0.05}
                  value={selected.grade[key]}
                  onLive={(value) => liveClip({ grade: { ...selected.grade, [key]: value } })}
                  onGestureStart={onGestureStart}
                  onGestureEnd={onGestureEnd}
                />
              </label>
            ))}
            <label className="field">
              <span>Transparency</span>
              <LiveRange
                min={0}
                max={1}
                step={0.05}
                value={selected.grade.transparency}
                onLive={(transparency) => liveClip({ grade: { ...selected.grade, transparency } })}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
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
              onFocus={() => onGestureStart?.()}
              onChange={(event) => (onExtraLive ?? onExtra)({ text: event.target.value, label: event.target.value || 'Title' })}
              onBlur={() => onGestureEnd?.()}
            />
          </label>
        ) : null}
        {selectedExtra?.kind === 'audio' ? (
          <label className="field">
            <span>Music volume</span>
            <LiveRange
              min={0}
              max={1}
              step={0.05}
              value={selectedExtra.volume}
              onLive={(volume) => liveExtra({ volume })}
              onGestureStart={onGestureStart}
              onGestureEnd={onGestureEnd}
            />
          </label>
        ) : null}
        {selected ? (
          <div className="nle-transform">
            <div className="eyebrow">Canvas</div>
            <label className="field">
              <span>Horizontal {selected.transform.x.toFixed(2)}</span>
              <LiveRange
                min={-1}
                max={1}
                step={0.05}
                value={selected.transform.x}
                onLive={(x) => liveClip({ transform: { ...selected.transform, x } })}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
              />
            </label>
            <label className="field">
              <span>Vertical {selected.transform.y.toFixed(2)}</span>
              <LiveRange
                min={-1}
                max={1}
                step={0.05}
                value={selected.transform.y}
                onLive={(y) => liveClip({ transform: { ...selected.transform, y } })}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
              />
            </label>
            <label className="field">
              <span>Scale {selected.transform.scale.toFixed(2)}</span>
              <LiveRange
                min={0.4}
                max={2.4}
                step={0.05}
                value={selected.transform.scale}
                onLive={(scale) => liveClip({ transform: { ...selected.transform, scale } })}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
              />
            </label>
            <label className="field">
              <span>Crop</span>
              <LiveRange
                min={0}
                max={0.35}
                step={0.01}
                value={selected.transform.crop}
                onLive={(crop) => liveClip({ transform: { ...selected.transform, crop } })}
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
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

function LiveRange({
  min,
  max,
  step,
  value,
  onLive,
  onGestureStart,
  onGestureEnd,
}: {
  min: number
  max: number
  step: number
  value: number
  onLive: (value: number) => void
  onGestureStart?: () => void
  onGestureEnd?: () => void
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onPointerDown={() => onGestureStart?.()}
      onChange={(event) => onLive(Number(event.target.value))}
      onPointerUp={() => onGestureEnd?.()}
      onPointerCancel={() => onGestureEnd?.()}
    />
  )
}
