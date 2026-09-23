import {
  DEFAULT_SETTINGS,
  HISTORY_LIMIT,
  type AppPhase,
  type AppSettings,
  type HistoryRecord,
  type LoadError,
  type LoadProgress,
  type RecordItem,
  type RouteId,
  type RunProgress,
  type RunResult,
  type ThemeMode,
  type ToastItem,
  type ViewMode,
} from '../../models/app'

export interface AppState {
  phase: AppPhase
  route: RouteId
  sourceLabel: string | null
  records: RecordItem[]
  lastLoadedAt: string | null
  loadProgress: LoadProgress | null
  loadError: LoadError | null
  search: string
  selectedIds: string[]
  detailsId: string | null
  runProgress: RunProgress | null
  runResult: RunResult | null
  history: HistoryRecord[]
  toasts: ToastItem[]
  settings: AppSettings
}

export const initialState: AppState = {
  phase: 'idle',
  route: 'dashboard',
  sourceLabel: null,
  records: [],
  lastLoadedAt: null,
  loadProgress: null,
  loadError: null,
  search: '',
  selectedIds: [],
  detailsId: null,
  runProgress: null,
  runResult: null,
  history: [],
  toasts: [],
  settings: DEFAULT_SETTINGS,
}

export type AppAction =
  | { type: 'hydrate'; settings: AppSettings; history: HistoryRecord[]; sourceLabel?: string }
  | { type: 'navigate'; route: RouteId }
  | { type: 'toggle-sidebar' }
  | { type: 'set-theme'; theme: ThemeMode }
  | { type: 'set-view-mode'; viewMode: ViewMode }
  | { type: 'set-source'; label: string }
  | { type: 'load-start' }
  | { type: 'load-progress'; progress: LoadProgress }
  | { type: 'load-success'; records: RecordItem[]; loadedAt: string }
  | { type: 'load-error'; error: LoadError }
  | { type: 'set-search'; search: string }
  | { type: 'toggle-select'; id: string }
  | { type: 'select-visible'; ids: string[] }
  | { type: 'clear-selection' }
  | { type: 'open-details'; id: string }
  | { type: 'close-details' }
  | { type: 'open-confirm' }
  | { type: 'cancel-confirm' }
  | { type: 'run-start'; progress: RunProgress }
  | { type: 'run-progress'; progress: RunProgress }
  | { type: 'run-complete'; result: RunResult; record: HistoryRecord }
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
        sourceLabel: action.sourceLabel ?? state.sourceLabel,
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
    case 'set-view-mode':
      return { ...state, settings: { ...state.settings, viewMode: action.viewMode } }
    case 'set-source':
      return { ...state, sourceLabel: action.label, loadError: null }
    case 'load-start':
      return {
        ...state,
        phase: 'loading',
        route: 'dashboard',
        loadProgress: { itemsSeen: 0, percent: 0, message: 'Preparing' },
        loadError: null,
        selectedIds: [],
        detailsId: null,
        runResult: null,
      }
    case 'load-progress':
      return { ...state, loadProgress: action.progress }
    case 'load-success':
      return {
        ...state,
        phase: 'ready',
        records: action.records,
        lastLoadedAt: action.loadedAt,
        loadProgress: null,
        loadError: null,
      }
    case 'load-error':
      return { ...state, phase: 'load_error', loadProgress: null, loadError: action.error }
    case 'set-search':
      return { ...state, search: action.search }
    case 'toggle-select': {
      const selectedIds = state.selectedIds.includes(action.id)
        ? state.selectedIds.filter((id) => id !== action.id)
        : [...state.selectedIds, action.id]
      return { ...state, selectedIds }
    }
    case 'select-visible':
      return { ...state, selectedIds: [...new Set(action.ids)] }
    case 'clear-selection':
      return { ...state, selectedIds: [] }
    case 'open-details':
      return { ...state, detailsId: action.id }
    case 'close-details':
      return { ...state, detailsId: null }
    case 'open-confirm':
      if (state.phase !== 'ready' || state.selectedIds.length === 0) return state
      return { ...state, phase: 'confirming' }
    case 'cancel-confirm':
      return { ...state, phase: state.phase === 'confirming' ? 'ready' : state.phase }
    case 'run-start':
      return { ...state, phase: 'running', runProgress: action.progress, runResult: null }
    case 'run-progress':
      return { ...state, runProgress: action.progress }
    case 'run-complete':
      return {
        ...state,
        phase: 'completed',
        runProgress: null,
        runResult: action.result,
        history: [action.record, ...state.history].slice(0, HISTORY_LIMIT),
        selectedIds: [],
      }
    case 'dismiss-completion':
      return { ...state, phase: 'ready', runProgress: null, runResult: null, route: 'dashboard' }
    case 'add-toast':
      return { ...state, toasts: [...state.toasts, action.toast].slice(-4) }
    case 'dismiss-toast':
      return { ...state, toasts: state.toasts.filter((toast) => toast.id !== action.id) }
    case 'clear-history':
      return { ...state, history: [] }
    default:
      return assertNever(action)
  }
}

function assertNever(action: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(action)}`)
}
