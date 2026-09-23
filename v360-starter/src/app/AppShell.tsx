import { useEffect, useRef } from 'react'
import { CompletionDialog } from '../components/dialogs/CompletionDialog'
import { ConfirmationDialog } from '../components/dialogs/ConfirmationDialog'
import { RecordDetailsDrawer } from '../components/records/RecordDetailsDrawer'
import { RunPanel } from '../components/run/RunPanel'
import { Sidebar } from '../components/navigation/Sidebar'
import { StatusBar } from '../components/navigation/StatusBar'
import { ToastViewport } from '../components/common/Toast'
import { DashboardPage } from '../pages/DashboardPage'
import { HistoryPage } from '../pages/HistoryPage'
import { RecordsPage } from '../pages/RecordsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { isModKey } from '../utils/format'
import { useAppStore } from './state/store-context'
import type { RefObject } from 'react'
import type { RouteId } from '../models/app'

export function AppShell() {
  const { state, dispatch, visibleRecords, reload } = useAppStore()
  const searchRef = useRef<HTMLInputElement | null>(null)
  const running = state.phase === 'running' ? state.runProgress : null

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (state.detailsId) dispatch({ type: 'close-details' })
        else if (state.selectedIds.length > 0) dispatch({ type: 'clear-selection' })
        return
      }
      if (!isModKey(event)) return

      const key = event.key.toLowerCase()
      if (key === 'f') {
        event.preventDefault()
        dispatch({ type: 'navigate', route: 'records' })
        window.setTimeout(() => searchRef.current?.focus(), 0)
      } else if (key === 'a' && state.route === 'records') {
        event.preventDefault()
        dispatch({ type: 'select-visible', ids: visibleRecords.map((record) => record.id) })
      } else if (key === 'r') {
        event.preventDefault()
        void reload()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, reload, state.detailsId, state.route, state.selectedIds.length, visibleRecords])

  return (
    <div className={`app-shell${state.settings.sidebarCollapsed ? ' is-collapsed' : ''}`}>
      <Sidebar />
      <main className="workspace">
        <div className={`workspace-scroll${running ? ' is-flush' : ''}`}>
          {running ? <RunPanel progress={running} /> : <RoutedPage route={state.route} searchRef={searchRef} />}
        </div>
      </main>
      <StatusBar />
      <RecordDetailsDrawer />
      <ConfirmationDialog />
      <CompletionDialog />
      <ToastViewport />
    </div>
  )
}

function RoutedPage({
  route,
  searchRef,
}: {
  route: RouteId
  searchRef: RefObject<HTMLInputElement | null>
}) {
  switch (route) {
    case 'dashboard':
      return <DashboardPage />
    case 'records':
      return <RecordsPage searchRef={searchRef} />
    case 'history':
      return <HistoryPage />
    case 'settings':
      return <SettingsPage />
    default:
      return assertNever(route)
  }
}

function assertNever(route: never): never {
  throw new Error(`Unhandled route: ${String(route)}`)
}
