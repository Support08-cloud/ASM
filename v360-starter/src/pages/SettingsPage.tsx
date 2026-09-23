import { PageHeader } from '../components/navigation/PageHeader'
import { APP } from '../app.config'
import { useAppStore } from '../app/state/store-context'
import type { ThemeMode, ViewMode } from '../models/app'

const THEMES: ThemeMode[] = ['dark', 'light']
const VIEW_MODES: ViewMode[] = ['cards', 'list']

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl / ⌘ + F', 'Focus search'],
  ['Ctrl / ⌘ + A', 'Select all visible records'],
  ['Ctrl / ⌘ + R', 'Reload the source'],
  ['Esc', 'Close details or clear selection'],
]

export function SettingsPage() {
  const { state, dispatch } = useAppStore()

  return (
    <>
      <PageHeader
        eyebrow="SYSTEM"
        title="Settings"
        description={`Preferences are stored locally under the ${APP.slug} namespace.`}
      />

      <div className="stack-list">
        <div className="stack-item">
          <div>
            <strong>Theme</strong>
            <p>Switches the whole workspace between the dark and light token sets.</p>
          </div>
          <div className="segmented" role="group" aria-label="Theme">
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                className={state.settings.theme === theme ? 'is-active' : ''}
                onClick={() => dispatch({ type: 'set-theme', theme })}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <div className="stack-item">
          <div>
            <strong>Default view</strong>
            <p>How records are laid out on the Records page.</p>
          </div>
          <div className="segmented" role="group" aria-label="Default view">
            {VIEW_MODES.map((viewMode) => (
              <button
                key={viewMode}
                type="button"
                className={state.settings.viewMode === viewMode ? 'is-active' : ''}
                onClick={() => dispatch({ type: 'set-view-mode', viewMode })}
              >
                {viewMode}
              </button>
            ))}
          </div>
        </div>

        <div className="stack-item">
          <div>
            <strong>Keyboard shortcuts</strong>
            <div className="shortcut-grid" style={{ marginTop: 12 }}>
              {SHORTCUTS.map(([keys, description]) => (
                <div key={keys} style={{ display: 'contents' }}>
                  <span className="kbd">{keys}</span>
                  <span>{description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack-item">
          <div>
            <strong>About</strong>
            <p>
              {APP.name} v{APP.version} — {APP.tagline}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
