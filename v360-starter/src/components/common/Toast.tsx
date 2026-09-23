import { IconClose } from './Icon'
import { useAppStore } from '../../app/state/store-context'

const PREFIX: Record<string, string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'i',
}

export function ToastViewport() {
  const { state, dispatch } = useAppStore()
  if (state.toasts.length === 0) return null

  return (
    <div className="toast-stack" aria-live="polite">
      {state.toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          <span className={`toast-mark ${toast.tone}`}>{PREFIX[toast.tone]}</span>
          <span className="toast-copy">{toast.title}</span>
          <button
            type="button"
            className="icon-btn subtle"
            aria-label="Dismiss notification"
            onClick={() => dispatch({ type: 'dismiss-toast', id: toast.id })}
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
