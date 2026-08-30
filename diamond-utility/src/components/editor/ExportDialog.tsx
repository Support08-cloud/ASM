import type { EditorProject, ExportFormat, ExportResolution, ExportSettings } from '../../models/editor'
import { estimateExportBytes, formatBytes, formatFrames } from '../../utils/format'
import { projectDurationMs } from '../../services/timeline'
import { exportFileName } from '../../services/timeline'
import { toVideoSrc } from '../../services/media-url'

interface ExportDialogProps {
  project: EditorProject
  onChange: (settings: ExportSettings) => void
  onCancel: () => void
  onStart: () => void
}

export function ExportDialog({ project, onChange, onCancel, onStart }: ExportDialogProps) {
  const settings = project.exportSettings
  const duration = projectDurationMs(project)
  const bytes = estimateExportBytes(duration, settings.bitrateMbps)
  const dest = `${project.outputDir.replace(/[\\/]+$/, '')}/${exportFileName(project.diamondName)}`
  const preview = project.clips[0] ? toVideoSrc(project.clips[0]) : undefined
  const patch = (next: Partial<ExportSettings>) => onChange({ ...settings, ...next })

  return (
    <div className="v360-modal">
      <div className="v360-export">
        <header>
          <h2>Export Project</h2>
          <button type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </header>
        <div className="v360-export-body">
          <div className="v360-export-settings">
            <h3>Format</h3>
            <div className="v360-format-row">
              {(
                [
                  ['h264', 'MP4 (H.264)'],
                  ['prores', 'ProRes 422'],
                  ['hevc', 'HEVC (H.265)'],
                ] as Array<[ExportFormat, string]>
              ).map(([id, label]) => (
                <button key={id} type="button" className={settings.format === id ? 'is-on' : undefined} onClick={() => patch({ format: id })}>
                  {label}
                </button>
              ))}
            </div>
            <h3>Video Settings</h3>
            <div className="v360-crop-grid">
              <label className="v360-field">
                <span>Resolution</span>
                <select value={settings.resolution} onChange={(event) => patch({ resolution: event.target.value as ExportResolution })}>
                  <option value="3840x2160">3840x2160 (4K UHD)</option>
                  <option value="1920x1080">1920x1080 (HD)</option>
                  <option value="1280x720">1280x720 (HD)</option>
                </select>
              </label>
              <label className="v360-field">
                <span>Frame Rate</span>
                <select value={settings.fps} onChange={(event) => patch({ fps: Number(event.target.value) as ExportSettings['fps'] })}>
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </label>
            </div>
            <label className="v360-slider">
              <span>
                Target Bitrate (Mbps)
                <em>{settings.bitrateMbps.toFixed(1)}</em>
              </span>
              <input
                type="range"
                min={4}
                max={80}
                step={1}
                value={settings.bitrateMbps}
                onChange={(event) => patch({ bitrateMbps: Number(event.target.value) })}
              />
            </label>
            <h3>Audio Settings</h3>
            <div className="v360-crop-grid">
              <label className="v360-field">
                <span>Format</span>
                <select value={settings.audioFormat} onChange={(event) => patch({ audioFormat: event.target.value as ExportSettings['audioFormat'] })}>
                  <option value="aac">AAC</option>
                  <option value="wav">WAV</option>
                </select>
              </label>
              <label className="v360-field">
                <span>Sample Rate</span>
                <select value={settings.sampleRate} onChange={(event) => patch({ sampleRate: Number(event.target.value) as ExportSettings['sampleRate'] })}>
                  <option value={48000}>48000 Hz</option>
                  <option value={44100}>44100 Hz</option>
                </select>
              </label>
            </div>
            <h3>Destination</h3>
            <div className="v360-dest" title={dest}>
              {dest}
            </div>
          </div>
          <div className="v360-export-preview">
            <div className="v360-export-frame">
              {preview ? <video src={preview} muted playsInline /> : <div className="v360-export-empty">No preview</div>}
            </div>
            <div className="v360-export-stats">
              <div>
                <span>Estimated File Size</span>
                <strong>{formatBytes(bytes)}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{formatFrames(duration, settings.fps)}</strong>
              </div>
            </div>
          </div>
        </div>
        <footer>
          <div className="v360-export-ready">
            <span>Ready to export</span>
            <em>0%</em>
          </div>
          <div className="v360-btn-row">
            <button type="button" className="v360-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="v360-primary" onClick={onStart}>
              Start Export
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
