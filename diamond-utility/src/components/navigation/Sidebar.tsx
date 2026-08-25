import {
  IconDashboard,
  IconDiamond,
  IconHistory,
  IconOperations,
  IconSettings,
} from '../common/Icon'
import { useAppStore } from '../../app/state/AppStateContext'
import type { ComponentType, SVGProps } from 'react'
import type { RouteId } from '../../models/processing'

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const SECTIONS: Array<{ title: string; items: Array<{ id: RouteId; label: string; icon: IconType }> }> = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
      { id: 'operations', label: 'Operations', icon: IconOperations },
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
        <IconDiamond className="brand-mark" size={28} />
        <div className="brand-copy">
          <div className="brand-name">Diamond Utility</div>
          <div className="brand-sub">Local data processor</div>
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
          <span className={`dot${dotClass(state.phase)}`} />
          <span>{statusLabel(state.phase)}</span>
        </div>
        <span>v1.0.0</span>
      </div>
    </aside>
  )
}

function statusLabel(phase: string): string {
  if (phase === 'scanning') return 'Scanning'
  if (phase === 'processing') return 'Processing'
  if (phase === 'scan_error') return 'Scan error'
  if (phase === 'completed') return 'Complete'
  return 'Ready'
}

function dotClass(phase: string): string {
  if (phase === 'scanning' || phase === 'processing') return ' busy'
  if (phase === 'scan_error') return ' err'
  if (phase === 'completed') return ' warn'
  return ''
}
