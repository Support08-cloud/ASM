import { EMPTY_FILTERS, type Diamond, type Filters, type ScanProgress } from '../../models/diamond'
import {
  DEFAULT_SETTINGS,
  type AppPhase,
  type AppSettings,
  type HistoryRecord,
  type ProcessProgress,
  type ProcessResult,
  type RouteId,
  type ToastItem,
  type ViewMode,
} from '../../models/processing'

export interface AppState {
  phase: AppPhase
  route: RouteId
  sourcePath: string | null
  outputPath: string | null
  sourceKind: 'none' | 'demo' | 'directory'
  diamonds: Diamond[]
  foldersScanned: number
  lastScanAt: string | null
  scanProgress: ScanProgress | null
  scanError: { title: string; detail: string; path?: string } | null
  search: string
  filters: Filters
  selectedIds: string[]
  detailsId: string | null
  processProgress: ProcessProgress | null
  processResult: ProcessResult | null
  history: HistoryRecord[]
  toasts: ToastItem[]
  settings: AppSettings
}

export const initialState: AppState = {
  phase: 'idle',
  route: 'dashboard',
  sourcePath: null,
  outputPath: null,
  sourceKind: 'none',
  diamonds: [],
  foldersScanned: 0,
  lastScanAt: null,
  scanProgress: null,
  scanError: null,
  search: '',
  filters: EMPTY_FILTERS,
  selectedIds: [],
  detailsId: null,
  processProgress: null,
  processResult: null,
  history: [],
  toasts: [],
  settings: DEFAULT_SETTINGS,
}

export type AppAction =
  | { type: 'hydrate'; settings: AppSettings; history: HistoryRecord[]; sourcePath?: string; outputPath?: string }
  | { type: 'navigate'; route: RouteId }
  | { type: 'toggle-sidebar' }
  | { type: 'set-theme'; theme: AppSettings['theme'] }
  | { type: 'set-duplicate-policy'; policy: AppSettings['duplicatePolicy'] }
  | { type: 'set-source'; path: string; kind: 'demo' | 'directory' }
  | { type: 'set-output'; path: string }
  | { type: 'scan-start' }
  | { type: 'scan-progress'; progress: ScanProgress }
  | { type: 'scan-success'; diamonds: Diamond[]; foldersScanned: number; scannedAt: string }
  | { type: 'scan-error'; title: string; detail: string; path?: string }
  | { type: 'set-search'; search: string }
  | { type: 'set-filters'; filters: Filters }
  | { type: 'toggle-select'; id: string }
  | { type: 'toggle-group'; ids: string[] }
  | { type: 'select-visible'; ids: string[] }
  | { type: 'clear-selection' }
  | { type: 'set-view-mode'; viewMode: ViewMode }
  | { type: 'open-details'; id: string }
  | { type: 'close-details' }
  | { type: 'open-confirm' }
  | { type: 'cancel-confirm' }
  | { type: 'process-start'; progress: ProcessProgress }
  | { type: 'process-progress'; progress: ProcessProgress }
  | { type: 'process-complete'; result: ProcessResult; record: HistoryRecord }
  | { type: 'dismiss-completion' }
  | { type: 'add-toast'; toast: ToastItem }
  | { type: 'dismiss-toast'; id: string }
  | { type: 'clear-history' }

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        settings: action.settings,
        history: action.history,
        sourcePath: action.sourcePath ?? state.sourcePath,
        outputPath: action.outputPath ?? state.outputPath,
      }
    case 'navigate':
      return { ...state, route: action.route }
    case 'toggle-sidebar':
      return {
        ...state,
        settings: { ...state.settings, sidebarCollapsed: !state.settings.sidebarCollapsed },
      }
    case 'set-theme':
      return { ...state, settings: { ...state.settings, theme: action.theme } }
    case 'set-duplicate-policy':
      return { ...state, settings: { ...state.settings, duplicatePolicy: action.policy } }
    case 'set-source':
      return {
        ...state,
        sourcePath: action.path,
        sourceKind: action.kind,
        phase: state.phase === 'idle' ? 'idle' : state.phase,
        scanError: null,
      }
    case 'set-output':
      return { ...state, outputPath: action.path }
    case 'scan-start':
      return {
        ...state,
        phase: 'scanning',
        route: 'dashboard',
        scanProgress: { foldersScanned: 0, filesSeen: 0, percent: 0, message: 'Preparing scan' },
        scanError: null,
        selectedIds: [],
        detailsId: null,
        processResult: null,
      }
    case 'scan-progress':
      return { ...state, scanProgress: action.progress }
    case 'scan-success':
      return {
        ...state,
        phase: 'ready',
        diamonds: action.diamonds,
        foldersScanned: action.foldersScanned,
        lastScanAt: action.scannedAt,
        scanProgress: null,
        scanError: null,
      }
    case 'scan-error':
      return {
        ...state,
        phase: 'scan_error',
        scanProgress: null,
        scanError: { title: action.title, detail: action.detail, path: action.path },
      }
    case 'set-search':
      return { ...state, search: action.search }
    case 'set-filters':
      return { ...state, filters: action.filters }
    case 'toggle-select': {
      const selected = state.selectedIds.includes(action.id)
        ? state.selectedIds.filter((id) => id !== action.id)
        : [...state.selectedIds, action.id]
      return { ...state, selectedIds: selected }
    }
    case 'toggle-group': {
      const allOn = action.ids.length > 0 && action.ids.every((id) => state.selectedIds.includes(id))
      return {
        ...state,
        selectedIds: allOn
          ? state.selectedIds.filter((id) => !action.ids.includes(id))
          : unique([...state.selectedIds, ...action.ids]),
      }
    }
    case 'select-visible':
      return { ...state, selectedIds: unique(action.ids) }
    case 'clear-selection':
      return { ...state, selectedIds: [] }
    case 'set-view-mode':
      return { ...state, settings: { ...state.settings, viewMode: action.viewMode } }
    case 'open-details':
      return { ...state, detailsId: action.id }
    case 'close-details':
      return { ...state, detailsId: null }
    case 'open-confirm':
      if (state.selectedIds.length === 0 || !state.outputPath || state.phase !== 'ready') return state
      return { ...state, phase: 'confirming' }
    case 'cancel-confirm':
      return { ...state, phase: state.phase === 'confirming' ? 'ready' : state.phase }
    case 'process-start':
      return {
        ...state,
        phase: 'processing',
        route: 'operations',
        processProgress: action.progress,
        processResult: null,
      }
    case 'process-progress':
      return { ...state, processProgress: action.progress }
    case 'process-complete':
      return {
        ...state,
        phase: 'completed',
        processProgress: null,
        processResult: action.result,
        history: [action.record, ...state.history].slice(0, 80),
        selectedIds: [],
      }
    case 'dismiss-completion':
      return { ...state, phase: 'ready', processResult: null, processProgress: null, route: 'dashboard' }
    case 'add-toast':
      return { ...state, toasts: [...state.toasts, action.toast].slice(-4) }
    case 'dismiss-toast':
      return { ...state, toasts: state.toasts.filter((toast) => toast.id !== action.id) }
    case 'clear-history':
      return { ...state, history: [] }
    default:
      return state
  }
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)]
}
