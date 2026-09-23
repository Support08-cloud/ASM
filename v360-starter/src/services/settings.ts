import { APP } from '../app.config'
import { DEFAULT_SETTINGS, HISTORY_LIMIT, type AppSettings, type HistoryRecord } from '../models/app'

const SETTINGS_KEY = `${APP.slug}.settings.v1`
const HISTORY_KEY = `${APP.slug}.history.v1`
const SOURCE_KEY = `${APP.slug}.source.v1`

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
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, HISTORY_LIMIT)))
}

export function loadSource(): string | null {
  try {
    return localStorage.getItem(SOURCE_KEY)
  } catch {
    return null
  }
}

export function saveSource(label: string | null): void {
  if (label === null) localStorage.removeItem(SOURCE_KEY)
  else localStorage.setItem(SOURCE_KEY, label)
}
