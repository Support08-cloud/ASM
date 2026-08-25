import { useEffect } from 'react'
import { useAppStore } from './state/AppStateContext'
import { Sidebar } from '../components/navigation/Sidebar'
import { StatusBar } from '../components/navigation/StatusBar'
import { ToastViewport } from '../components/common/Toast'
import { DashboardPage } from '../pages/DashboardPage'
import { OperationsPage } from '../pages/OperationsPage'
import { HistoryPage } from '../pages/HistoryPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ProcessingPanel } from '../components/processing/ProcessingPanel'
import { isModKey } from '../utils/format'

export function AppShell() {
  const { state, dispatch, visibleDiamonds, rescan, confirmGetMp4, cancelProcessing } = useAppStore()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')

      if (event.key === 'Escape') {
        if (state.phase === 'confirming') dispatch({ type: 'cancel-confirm' })
        else if (state.detailsId) dispatch({ type: 'close-details' })
        return
      }

      if (event.key === 'Enter' && state.phase === 'confirming') {
        event.preventDefault()
        void confirmGetMp4()
        return
      }

      if (event.key === 'Delete' && typing && (target as HTMLInputElement).value) {
        return
      }
      if (event.key === 'Delete' && !typing && state.search) {
        dispatch({ type: 'set-search', search: '' })
      }

      if (isModKey(event) && event.key.toLowerCase() === 'a' && !typing && state.route === 'dashboard') {
        event.preventDefault()
        dispatch({ type: 'select-visible', ids: visibleDiamonds.map((item) => item.id) })
      }
      if (isModKey(event) && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        void rescan()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.phase, state.detailsId, state.search, state.route, visibleDiamonds, dispatch, confirmGetMp4, rescan])

  const overlayProcessing = state.phase === 'processing' && state.route === 'dashboard' && state.processProgress

  return (
    <div className={`app-shell${state.settings.sidebarCollapsed ? ' is-collapsed' : ''}`}>
      <Sidebar />
      <main className="workspace">
        <div className={`workspace-scroll${overlayProcessing ? ' is-flush' : ''}`}>
          {overlayProcessing ? (
            <ProcessingPanel progress={state.processProgress!} onCancel={cancelProcessing} />
          ) : (
            <>
              {state.route === 'dashboard' ? <DashboardPage /> : null}
              {state.route === 'operations' ? <OperationsPage /> : null}
              {state.route === 'history' ? <HistoryPage /> : null}
              {state.route === 'settings' ? <SettingsPage /> : null}
            </>
          )}
        </div>
      </main>
      <StatusBar />
      <ToastViewport />
    </div>
  )
}
