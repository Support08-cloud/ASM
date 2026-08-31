import { useAppStore } from '../app/state/AppStateContext'
import { PageHeader } from '../components/navigation/PageHeader'

export function SettingsPage() {
  const { state, dispatch } = useAppStore()
  const { settings } = state

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Appearance, processing defaults, and keyboard shortcuts for the studio."
      />
      <div className="settings-list">
        <div className="settings-row">
          <div>
            <strong>Theme</strong>
            <p>Dark mode is the default. Light mode uses the same tokens.</p>
          </div>
          <div className="segmented">
            <button
              type="button"
              className={settings.theme === 'dark' ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'set-theme', theme: 'dark' })}
            >
              Dark
            </button>
            <button
              type="button"
              className={settings.theme === 'light' ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'set-theme', theme: 'light' })}
            >
              Light
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Default density</strong>
            <p>Cards for review, list for large datasets. Remembered locally.</p>
          </div>
          <div className="segmented">
            <button
              type="button"
              className={settings.viewMode === 'cards' ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'set-view-mode', viewMode: 'cards' })}
            >
              Cards
            </button>
            <button
              type="button"
              className={settings.viewMode === 'list' ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'set-view-mode', viewMode: 'list' })}
            >
              List
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Duplicate MP4s</strong>
            <p>What to do when an output file already exists.</p>
          </div>
          <div className="segmented">
            {(['rename', 'skip', 'replace'] as const).map((policy) => (
              <button
                key={policy}
                type="button"
                className={settings.duplicatePolicy === policy ? 'is-active' : undefined}
                onClick={() => dispatch({ type: 'set-duplicate-policy', policy })}
              >
                {policy[0].toUpperCase() + policy.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Keyboard</strong>
            <p>Shortcuts stay out of the way of OS defaults unless they are listed here.</p>
            <div className="shortcut-grid" style={{ marginTop: 12 }}>
              <span className="kbd">Ctrl/⌘ F</span>
              <span>Focus search</span>
              <span className="kbd">Ctrl/⌘ A</span>
              <span>Select all visible</span>
              <span className="kbd">Ctrl/⌘ R</span>
              <span>Rescan source</span>
              <span className="kbd">Esc</span>
              <span>Close drawer or dialog</span>
              <span className="kbd">Enter</span>
              <span>Confirm Get MP4</span>
              <span className="kbd">Delete</span>
              <span>Clear search</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
