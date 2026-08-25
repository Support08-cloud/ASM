import { DEFAULT_SETTINGS, type AppSettings, type HistoryRecord, type ViewMode } from '../models/processing'

const SETTINGS_KEY = 'diamond-utility.settings.v1'
const HISTORY_KEY = 'diamond-utility.history.v1'
const PATHS_KEY = 'diamond-utility.paths.v1'

export interface StoredPaths {
  sourcePath?: string
  outputPath?: string
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveHistory(records: HistoryRecord[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 80)))
}

export function loadPaths(): StoredPaths {
  try {
    const raw = localStorage.getItem(PATHS_KEY)
    return raw ? (JSON.parse(raw) as StoredPaths) : {}
  } catch {
    return {}
  }
}

export function savePaths(paths: StoredPaths): void {
  localStorage.setItem(PATHS_KEY, JSON.stringify(paths))
}

export function persistViewMode(viewMode: ViewMode, current: AppSettings): void {
  saveSettings({ ...current, viewMode })
}
