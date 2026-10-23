import { IconFolder } from '../common/Icon'

interface PathCardProps {
  label: string
  path: string | null
  hint: string
  onChange: () => void
  onClear?: () => void
}

export function PathCard({ label, path, hint, onChange, onClear }: PathCardProps) {
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
        <div className="btn-row">
          {path && onClear ? (
            <button type="button" className="btn ghost" onClick={onClear}>
              Clear
            </button>
          ) : null}
          <button type="button" className="btn ghost" onClick={onChange}>
            {path ? 'Change' : 'Select'}
          </button>
        </div>
      </div>
    </section>
  )
}
