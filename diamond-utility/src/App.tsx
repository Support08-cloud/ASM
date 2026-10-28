import { Component, type ReactNode } from 'react'
import { AppStoreProvider } from './app/state/AppStateContext'
import { AppShell } from './app/AppShell'

export default function App() {
  return (
    <AppErrorBoundary>
      <AppStoreProvider>
        <AppShell />
      </AppStoreProvider>
    </AppErrorBoundary>
  )
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null }

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || 'The window hit a problem.' }
  }

  render() {
    if (!this.state.message) return this.props.children
    return (
      <div style={{ minHeight: '100vh', background: '#0c0e12', color: '#fefefe', padding: 32, fontFamily: 'Segoe UI, sans-serif' }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Diamond Utility hit a problem</h1>
        <p style={{ maxWidth: 560, lineHeight: 1.5 }}>{this.state.message}</p>
        <button
          type="button"
          style={{ marginTop: 16, background: '#c6691d', color: '#fefefe', border: 0, borderRadius: 8, padding: '10px 16px' }}
          onClick={() => window.location.reload()}
        >
          Open again
        </button>
      </div>
    )
  }
}
