export type RouteId = 'dashboard' | 'records' | 'history' | 'settings'

export type ThemeMode = 'dark' | 'light'

export type ViewMode = 'cards' | 'list'

export type ToastTone = 'success' | 'warning' | 'error' | 'info'

export type RecordStatus = 'ready' | 'warning' | 'error'

/**
 * Every phase the workspace can be in. Pages render from this, so a new project
 * usually only needs to rename the domain types below and keep this flow intact.
 */
export type AppPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'load_error'
  | 'confirming'
  | 'running'
  | 'completed'

export interface ToastItem {
  id: string
  tone: ToastTone
  title: string
}

export interface AppSettings {
  theme: ThemeMode
  viewMode: ViewMode
  sidebarCollapsed: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  viewMode: 'cards',
  sidebarCollapsed: false,
}

/** Replace with the real domain entity for your project. */
export interface RecordItem {
  id: string
  code: string
  label: string
  status: RecordStatus
  itemCount: number
  sizeBytes: number
  updatedAt: string
  tags: string[]
}

export interface LoadProgress {
  itemsSeen: number
  percent: number
  message: string
}

export interface RunProgress {
  index: number
  total: number
  currentLabel: string
  percent: number
}

export type RunOutcome = 'success' | 'partial' | 'error'

export interface RunResult {
  outcome: RunOutcome
  processed: number
  skipped: number
  failed: number
  total: number
  errorMessage?: string
}

export interface HistoryRecord {
  id: string
  finishedAt: string
  recordCount: number
  recordNames: string[]
  processed: number
  skipped: number
  failed: number
  outcome: RunOutcome
}

export interface LoadError {
  title: string
  detail: string
  source?: string
}

export interface ConfirmSummary {
  recordCount: number
  itemCount: number
  sizeBytes: number
  records: RecordItem[]
}

export const HISTORY_LIMIT = 80
