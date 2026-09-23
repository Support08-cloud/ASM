import { IconDashboard, IconHistory, IconLogo, IconRecords, IconSettings } from '../common/Icon'
import { APP } from '../../app.config'
import { useAppStore } from '../../app/state/store-context'
import { phaseDotClass, phaseLabel } from '../../utils/phase'
import type { ComponentType, SVGProps } from 'react'
import type { RouteId } from '../../models/app'

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const SECTIONS: Array<{ title: string; items: Array<{ id: RouteId; label: string; icon: IconType }> }> = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
      { id: 'records', label: 'Records', icon: IconRecords },
    ],
  },
  {
    title: 'DATA',
    items: [{ id: 'history', label: 'History', icon: IconHistory }],
  },
  {
    title: 'SYSTEM',
    items: [{ id: 'settings', label: 'Settings', icon: IconSettings }],
  },
]

export function Sidebar() {
  const { state, dispatch } = useAppStore()
  const collapsed = state.settings.sidebarCollapsed

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        <IconLogo className="brand-mark" size={28} />
        <div className="brand-copy">
          <div className="brand-name">{APP.name}</div>
          <div className="brand-sub">{APP.tagline}</div>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="nav-section">{section.title}</div>
          {section.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-btn${state.route === item.id ? ' is-active' : ''}`}
              onClick={() => dispatch({ type: 'navigate', route: item.id })}
              aria-current={state.route === item.id ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <item.icon />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      ))}

      <div className="sidebar-spacer" />

      <button
        type="button"
        className="nav-btn"
        onClick={() => dispatch({ type: 'toggle-sidebar' })}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          {collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
        </svg>
        <span className="nav-label">{collapsed ? 'Expand' : 'Collapse'}</span>
      </button>

      <div className="sidebar-foot">
        <div className="ready-row">
          <span className={`dot${phaseDotClass(state.phase)}`} />
          <span>{phaseLabel(state.phase)}</span>
        </div>
        <span>v{APP.version}</span>
      </div>
    </aside>
  )
}
