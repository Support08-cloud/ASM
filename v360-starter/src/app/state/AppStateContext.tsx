import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { buildDemoRecords, DEMO_SOURCE_LABEL } from '../../services/demo-data'
import { filterRecords } from '../../services/search'
import { loadHistory, loadSettings, loadSource, saveHistory, saveSettings, saveSource } from '../../services/settings'
import { runTask, summarize } from '../../services/task-runner'
import { uid } from '../../utils/format'
import { initialState, reducer } from './machine'
import { AppStoreContext, type AppStoreValue } from './store-context'
import type { ConfirmSummary, HistoryRecord, RecordItem, RunResult, ToastTone } from '../../models/app'

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef<AbortController | null>(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    dispatch({
      type: 'hydrate',
      settings: loadSettings(),
      history: loadHistory(),
      sourceLabel: loadSource() ?? undefined,
    })
  }, [])

  useEffect(() => {
    saveSettings(state.settings)
  }, [state.settings])

  useEffect(() => {
    saveHistory(state.history)
  }, [state.history])

  useEffect(() => {
    saveSource(state.sourceLabel)
  }, [state.sourceLabel])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
  }, [state.settings.theme])

  useEffect(() => () => abortRef.current?.abort(), [])

  const visibleRecords = useMemo(
    () => filterRecords(state.records, state.search),
    [state.records, state.search],
  )

  const selectedRecords = useMemo(
    () => state.records.filter((record) => state.selectedIds.includes(record.id)),
    [state.records, state.selectedIds],
  )

  const detailsRecord = useMemo(
    () => state.records.find((record) => record.id === state.detailsId) ?? null,
    [state.records, state.detailsId],
  )

  const confirmSummary = useMemo<ConfirmSummary | null>(() => {
    if (state.phase !== 'confirming') return null
    const totals = summarize(selectedRecords)
    return { recordCount: selectedRecords.length, records: selectedRecords, ...totals }
  }, [state.phase, selectedRecords])

  const toast = useCallback((tone: ToastTone, title: string) => {
    const id = uid('toast')
    dispatch({ type: 'add-toast', toast: { id, tone, title } })
    window.setTimeout(() => dispatch({ type: 'dismiss-toast', id }), 4200)
  }, [])

  const loadSample = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    dispatch({ type: 'set-source', label: DEMO_SOURCE_LABEL })
    dispatch({ type: 'load-start' })
    try {
      const records = buildDemoRecords()
      for (let step = 1; step <= 8; step += 1) {
        if (controller.signal.aborted) return
        dispatch({
          type: 'load-progress',
          progress: {
            itemsSeen: Math.round((records.length * step) / 8),
            percent: step * 12.5,
            message: 'Reading source records',
          },
        })
        await wait(45)
      }
      if (controller.signal.aborted) return
      dispatch({ type: 'load-success', records, loadedAt: new Date().toISOString() })
      toast('success', `${records.length} records loaded`)
    } catch (error) {
      dispatch({
        type: 'load-error',
        error: {
          title: 'Unable to load records.',
          detail: error instanceof Error ? error.message : 'The source may be unavailable.',
          source: stateRef.current.sourceLabel ?? undefined,
        },
      })
    }
  }, [toast])

  const reload = useCallback(async () => {
    await loadSample()
  }, [loadSample])

  const startRun = useCallback(() => {
    if (stateRef.current.selectedIds.length === 0) {
      toast('info', 'Select one or more records to continue.')
      return
    }
    dispatch({ type: 'open-confirm' })
  }, [toast])

  const confirmRun = useCallback(async () => {
    const current = stateRef.current
    const selected = current.records.filter((record) => current.selectedIds.includes(record.id))
    if (selected.length === 0) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    dispatch({
      type: 'run-start',
      progress: { index: 0, total: selected.length, currentLabel: selected[0]?.code ?? '', percent: 0 },
    })

    try {
      const result = await runTask({
        records: selected,
        signal: controller.signal,
        onProgress: (progress) => dispatch({ type: 'run-progress', progress }),
      })
      dispatch({ type: 'run-complete', result, record: toHistory(result, selected) })
      if (result.outcome === 'success') toast('success', `${result.processed} records processed`)
      else if (result.outcome === 'partial') toast('warning', `${result.failed} record(s) failed`)
      else toast('error', 'The run did not complete')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        dispatch({ type: 'dismiss-completion' })
        toast('info', 'Run cancelled')
        return
      }
      const result: RunResult = {
        outcome: 'error',
        processed: 0,
        skipped: 0,
        failed: selected.length,
        total: selected.length,
        errorMessage: error instanceof Error ? error.message : 'The run failed',
      }
      dispatch({ type: 'run-complete', result, record: toHistory(result, selected) })
      toast('error', result.errorMessage ?? 'The run failed')
    }
  }, [toast])

  const cancelRun = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const value: AppStoreValue = {
    state,
    dispatch,
    visibleRecords,
    selectedRecords,
    detailsRecord,
    confirmSummary,
    toast,
    loadSample,
    reload,
    startRun,
    confirmRun,
    cancelRun,
  }

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function toHistory(result: RunResult, records: RecordItem[]): HistoryRecord {
  return {
    id: uid('run'),
    finishedAt: new Date().toISOString(),
    recordCount: records.length,
    recordNames: records.map((record) => record.code),
    processed: result.processed,
    skipped: result.skipped,
    failed: result.failed,
    outcome: result.outcome,
  }
}
