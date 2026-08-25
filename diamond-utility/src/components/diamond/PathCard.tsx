import { IconFolder } from '../common/Icon'

interface PathCardProps {
  label: string
  path: string | null
  hint: string
  onChange: () => void
}

export function PathCard({ label, path, hint, onChange }: PathCardProps) {
  return (
    <section className="path-card">
      <div className="path-card-top">
        <div className="eyebrow">{label}</div>
      </div>
      <div className="path-row">
        <div className="path-icon" aria-hidden="true">
          <IconFolder size={16} />
        </div>
        <div className="path-value" title={path ?? undefined}>
          {path ?? 'No folder selected'}
        </div>
      </div>
      <div className="path-foot">
        <span>{hint}</span>
        <button type="button" className="btn ghost" onClick={onChange}>
          Change
        </button>
      </div>
    </section>
  )
}
