import type { Diamond } from './diamond'

export type RouteId = 'dashboard' | 'operations' | 'history' | 'settings'
export type ViewMode = 'cards' | 'list'
export type ThemeMode = 'dark' | 'light'
export type DuplicatePolicy = 'skip' | 'replace' | 'rename'

export type AppPhase =
  | 'idle'
  | 'scanning'
  | 'scan_error'
  | 'ready'
  | 'confirming'
  | 'processing'
  | 'completed'

export interface ProcessStep {
  viewId: string
  viewLabel: string
  folderName: string
  status: 'pending' | 'running' | 'done' | 'skipped' | 'error'
  currentFile?: string
  message?: string
}

export interface DiamondProcessJob {
  diamondId: string
  diamondName: string
  steps: ProcessStep[]
}

export interface ProcessProgress {
  diamondIndex: number
  diamondTotal: number
  currentDiamond: string
  currentFile?: string
  percent: number
  jobs: DiamondProcessJob[]
}

export interface ProcessFileResult {
  diamondName: string
  viewLabel: string
  sourcePath: string
  outputPath: string
  status: 'copied' | 'skipped' | 'failed'
  message?: string
}

export interface ProcessResult {
  outcome: 'success' | 'partial' | 'error'
  copied: number
  skipped: number
  failed: number
  total: number
  outputPath: string
  files: ProcessFileResult[]
  errorPath?: string
  errorMessage?: string
}

export interface HistoryRecord {
  id: string
  startedAt: string
  finishedAt: string
  diamondCount: number
  diamondNames: string[]
  copied: number
  skipped: number
  failed: number
  outcome: ProcessResult['outcome']
  outputPath: string
  sourcePath: string
}

export interface ToastItem {
  id: string
  tone: 'success' | 'warning' | 'error' | 'info'
  title: string
  actionLabel?: string
}

export interface AppSettings {
  theme: ThemeMode
  viewMode: ViewMode
  sidebarCollapsed: boolean
  duplicatePolicy: DuplicatePolicy
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  viewMode: 'cards',
  sidebarCollapsed: false,
  duplicatePolicy: 'rename',
}

export interface ConfirmSummary {
  diamondCount: number
  folderCount: number
  mp4Count: number
  diamonds: Diamond[]
  outputPath: string
}
