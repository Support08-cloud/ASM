import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { ConfirmSummary, RecordItem, ToastTone } from '../../models/app'
import type { AppAction, AppState } from './machine'

export interface AppStoreValue {
  state: AppState
  dispatch: Dispatch<AppAction>
  visibleRecords: RecordItem[]
  selectedRecords: RecordItem[]
  detailsRecord: RecordItem | null
  confirmSummary: ConfirmSummary | null
  toast: (tone: ToastTone, title: string) => void
  loadSample: () => Promise<void>
  reload: () => Promise<void>
  startRun: () => void
  confirmRun: () => Promise<void>
  cancelRun: () => void
}

export const AppStoreContext = createContext<AppStoreValue | null>(null)

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext)
  if (!value) throw new Error('useAppStore must be used within AppStoreProvider')
  return value
}
