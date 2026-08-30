import { useState, type ReactNode } from 'react'
import {
  CROP_ASPECTS,
  DEFAULT_DUCKING,
  DEFAULT_TRANSFORM,
  EFFECT_OPTIONS,
  FILTER_OPTIONS,
  KEYFRAME_INTERPOLATIONS,
  SPEED_MAX,
  SPEED_MIN,
  TEXT_FONTS,
  type CropAspect,
  type DuckingSettings,
  type EditorClip,
  type ExtraClip,
  type KeyframeInterpolation,
} from '../../models/editor'

interface InspectorPanelProps {
  masterVolume: number
  onMasterVolume: (value: number) => void
  selected: EditorClip | null
  selectedExtra: ExtraClip | null
  ducking: DuckingSettings
  onDucking: (patch: Partial<DuckingSettings>) => void
  playheadMs: number
  onClip: (patch: Partial<EditorClip>) => void
  onExtra: (patch: Partial<ExtraClip>) => void
  onAddKeyframe: () => void
}

export function InspectorPanel({
  masterVolume,
  onMasterVolume,
  selected,
  selectedExtra,
  ducking,
  onDucking,
  playheadMs,
  onClip,
  onExtra,
  onAddKeyframe,
}: InspectorPanelProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    transform: true,
    speed: true,
    crop: true,
    text: true,
    audio: true,
    ducking: true,
    look: false,
  })
  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }))
  const title = selected?.label ?? selectedExtra?.label ?? 'Nothing selected'
  const kind = selected ? 'Video Clip' : selectedExtra?.kind === 'audio' ? 'Audio Clip' : selectedExtra ? 'Title' : 'Inspector'

  return (
    <aside className="v360-inspector">
      <div className="v360-panel-head">
        <span>Inspector</span>
      </div>
      <div className="v360-inspector-body">
        <div className="v360-selected">
          <div className={`v360-selected-mark is-${selectedExtra?.kind ?? 'video'}`} />
          <div>
            <strong>{title}</strong>
            <span>{kind}</span>
          </div>
        </div>

        {selected ? (
          <>
            <Group title="Transform" open={open.transform} onToggle={() => toggle('transform')} enabled>
              <div className="v360-row">
                <span>Position</span>
                <label>
                  X
                  <input
                    type="number"
                    value={Math.round(960 + selected.transform.x * 960)}
                    onChange={(event) =>
                      onClip({ transform: { ...selected.transform, x: (Number(event.target.value) - 960) / 960 } })
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={Math.round(540 + selected.transform.y * 540)}
                    onChange={(event) =>
                      onClip({ transform: { ...selected.transform, y: (Number(event.target.value) - 540) / 540 } })
                    }
                  />
                </label>
              </div>
              <Slider
                label="Scale"
                value={selected.transform.scale * 100}
                min={40}
                max={240}
                suffix="%"
                onChange={(value) => onClip({ transform: { ...selected.transform, scale: value / 100 } })}
              />
              <Slider
                label="Rotation"
                value={selected.transform.rotation}
                min={-180}
                max={180}
                suffix="°"
                onChange={(value) => onClip({ transform: { ...selected.transform, rotation: value } })}
              />
              <div className="v360-btn-row">
                <button type="button" className={selected.transform.flipH ? 'is-on' : undefined} onClick={() => onClip({ transform: { ...selected.transform, flipH: !selected.transform.flipH } })}>
                  Flip H
                </button>
                <button type="button" className={selected.transform.flipV ? 'is-on' : undefined} onClick={() => onClip({ transform: { ...selected.transform, flipV: !selected.transform.flipV } })}>
                  Flip V
                </button>
                <button type="button" onClick={() => onClip({ transform: { ...DEFAULT_TRANSFORM } })}>
                  Reset
                </button>
              </div>
            </Group>

            <Group title="Speed" open={open.speed} onToggle={() => toggle('speed')}>
              <label className="v360-field">
                <span>Rate</span>
                <select value={selected.speed} onChange={(event) => onClip({ speed: Number(event.target.value) || 1 })}>
                  {[0.5, 0.75, 1, 1.5, 2, 4].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate.toFixed(1)}x {rate === 1 ? '(Normal)' : ''}
                    </option>
                  ))}
                  {! [0.5, 0.75, 1, 1.5, 2, 4].includes(selected.speed) ? <option value={selected.speed}>Custom {selected.speed.toFixed(2)}x</option> : null}
                </select>
              </label>
              <Slider
                label="Custom"
                value={selected.speed}
                min={SPEED_MIN}
                max={SPEED_MAX}
                step={0.05}
                suffix="x"
                onChange={(value) => onClip({ speed: value })}
              />
            </Group>

            <Group
              title="Crop"
              open={open.crop}
              onToggle={() => toggle('crop')}
              enabled={selected.transform.cropEnabled}
              onEnabled={(cropEnabled) =>
                onClip({
                  transform: {
                    ...selected.transform,
                    cropEnabled,
                    cropTop: cropEnabled ? selected.transform.cropTop || 0.1 : selected.transform.cropTop,
                    cropBottom: cropEnabled ? selected.transform.cropBottom || 0.1 : selected.transform.cropBottom,
                    cropLeft: cropEnabled ? selected.transform.cropLeft || 0.1 : selected.transform.cropLeft,
                    cropRight: cropEnabled ? selected.transform.cropRight || 0.1 : selected.transform.cropRight,
                  },
                })
              }
            >
              <div className="v360-crop-grid">
                {(['cropTop', 'cropBottom', 'cropLeft', 'cropRight'] as const).map((key) => (
                  <label key={key} className="v360-field">
                    <span>{key.replace('crop', '')}</span>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={Math.round((selected.transform[key] || 0) * 100)}
                      onChange={(event) =>
                        onClip({ transform: { ...selected.transform, cropEnabled: true, [key]: Number(event.target.value) / 100 } })
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="v360-field">
                <span>Aspect Ratio</span>
                <select
                  value={selected.transform.cropAspect}
                  onChange={(event) => onClip({ transform: { ...selected.transform, cropAspect: event.target.value as CropAspect } })}
                >
                  {CROP_ASPECTS.map((aspect) => (
                    <option key={aspect} value={aspect}>
                      {aspect === 'free' ? 'Free' : aspect}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="v360-ghost" onClick={() => onClip({ transform: { ...selected.transform, cropEnabled: false, crop: 0, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 } })}>
                Reset Crop
              </button>
            </Group>
          </>
        ) : null}

        {selectedExtra?.kind === 'text' ? (
          <Group title="Text" open={open.text} onToggle={() => toggle('text')} enabled>
            <label className="v360-field">
              <span>Content</span>
              <textarea
                rows={2}
                value={selectedExtra.text ?? ''}
                onChange={(event) => onExtra({ text: event.target.value, label: event.target.value || 'Title Overlay' })}
              />
            </label>
            <div className="v360-crop-grid">
              <label className="v360-field">
                <span>Font</span>
                <select value={selectedExtra.fontFamily ?? 'Geist'} onChange={(event) => onExtra({ fontFamily: event.target.value })}>
                  {TEXT_FONTS.map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
              </label>
              <label className="v360-field">
                <span>Size</span>
                <input type="number" min={12} max={160} value={selectedExtra.fontSize ?? 48} onChange={(event) => onExtra({ fontSize: Number(event.target.value) || 48 })} />
              </label>
            </div>
          </Group>
        ) : null}

        <Group title="Audio" open={open.audio} onToggle={() => toggle('audio')} enabled>
          <Slider label="Master" value={masterVolume} min={0} max={1} step={0.05} suffix="" onChange={onMasterVolume} />
          {selected ? (
            <>
              <Slider label="Clip volume" value={selected.volume} min={0} max={1} step={0.05} suffix="" onChange={(value) => onClip({ volume: value })} />
              <label className="v360-check">
                <input type="checkbox" checked={selected.muted} onChange={(event) => onClip({ muted: event.target.checked })} />
                Mute clip
              </label>
              <Slider label="Fade in" value={selected.fadeInMs} min={0} max={2000} step={50} suffix="ms" onChange={(value) => onClip({ fadeInMs: value })} />
              <Slider label="Fade out" value={selected.fadeOutMs} min={0} max={2000} step={50} suffix="ms" onChange={(value) => onClip({ fadeOutMs: value })} />
            </>
          ) : null}
          {selectedExtra?.kind === 'audio' ? (
            <>
              <Slider label="Volume (dB)" value={selectedExtra.volume} min={0} max={1} step={0.05} suffix="" onChange={(value) => onExtra({ volume: value })} />
              <label className="v360-field">
                <span>Interpolation</span>
                <select
                  value={selectedExtra.interpolation ?? 'bezier'}
                  onChange={(event) => onExtra({ interpolation: event.target.value as KeyframeInterpolation })}
                >
                  {KEYFRAME_INTERPOLATIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="v360-keyframe-row">
                <button type="button" className="v360-ghost" onClick={onAddKeyframe}>
                  Add keyframe
                </button>
                <span>{Math.round(playheadMs)} ms</span>
              </div>
              <div className="v360-crop-grid">
                <label className="v360-field">
                  <span>Fade In</span>
                  <input type="number" value={selectedExtra.fadeInMs ?? 500} onChange={(event) => onExtra({ fadeInMs: Number(event.target.value) || 0 })} />
                </label>
                <label className="v360-field">
                  <span>Fade Out</span>
                  <input type="number" value={selectedExtra.fadeOutMs ?? 500} onChange={(event) => onExtra({ fadeOutMs: Number(event.target.value) || 0 })} />
                </label>
              </div>
            </>
          ) : null}
        </Group>

        <Group
          title="Automatic Ducking"
          open={open.ducking}
          onToggle={() => toggle('ducking')}
          enabled={ducking.enabled}
          onEnabled={(enabled) => onDucking({ enabled })}
        >
          <Slider
            label="Ducking Depth (dB)"
            value={ducking.depthDb}
            min={-24}
            max={0}
            step={1}
            suffix="dB"
            onChange={(value) => onDucking({ depthDb: value })}
          />
          <Slider
            label="Fade Duration"
            value={ducking.fadeMs}
            min={20}
            max={800}
            step={10}
            suffix="ms"
            onChange={(value) => onDucking({ fadeMs: value })}
          />
          <Slider
            label="Sensitivity"
            value={ducking.sensitivity}
            min={0.1}
            max={1}
            step={0.05}
            suffix=""
            onChange={(value) => onDucking({ sensitivity: value })}
          />
          <button type="button" className="v360-ghost" onClick={() => onDucking({ ...DEFAULT_DUCKING, enabled: ducking.enabled })}>
            Reset ducking
          </button>
        </Group>

        {selected ? (
          <Group title="Look" open={open.look} onToggle={() => toggle('look')}>
            <div className="v360-tile-grid">
              {FILTER_OPTIONS.map((item) => (
                <button key={item.id} type="button" className={selected.filter === item.id ? 'is-on' : undefined} onClick={() => onClip({ filter: item.id })}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="v360-tile-grid">
              {EFFECT_OPTIONS.map((item) => (
                <button key={item.id} type="button" className={selected.effect === item.id ? 'is-on' : undefined} onClick={() => onClip({ effect: item.id })}>
                  {item.label}
                </button>
              ))}
            </div>
          </Group>
        ) : null}
      </div>
    </aside>
  )
}

function Group({
  title,
  open,
  onToggle,
  enabled,
  onEnabled,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  enabled?: boolean
  onEnabled?: (value: boolean) => void
  children?: ReactNode
}) {
  return (
    <section className="v360-group">
      <header>
        <button type="button" onClick={onToggle}>
          <span className={`v360-chevron${open ? ' is-open' : ''}`} />
          {title}
        </button>
        {onEnabled ? (
          <button type="button" className={`v360-switch${enabled ? ' is-on' : ''}`} onClick={() => onEnabled(!enabled)} aria-pressed={enabled} />
        ) : null}
      </header>
      {open ? <div className="v360-group-body">{children}</div> : null}
    </section>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <label className="v360-slider">
      <span>
        {label}
        <em>
          {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
          {suffix}
        </em>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}
