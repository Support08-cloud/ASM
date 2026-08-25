import { useAppStore } from '../../app/state/AppStateContext'

export function ToastViewport() {
  const { state, dispatch } = useAppStore()
  if (state.toasts.length === 0) return null
  return (
    <div className="toast-stack" aria-live="polite">
      {state.toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          {toast.tone === 'success' ? '✓ ' : toast.tone === 'warning' ? '⚠ ' : toast.tone === 'error' ? '✕ ' : ''}
          {toast.title}
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'dismiss-toast', id: toast.id })}
            style={{ marginLeft: 8 }}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}
