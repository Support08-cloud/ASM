import { describe, expect, it } from 'vitest'
import { initialState, reducer, type AppState } from '../src/app/state/machine'
import { buildDemoRecords } from '../src/services/demo-data'
import type { HistoryRecord, RunResult } from '../src/models/app'

const records = buildDemoRecords(6)

function readyState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...initialState,
    phase: 'ready',
    records,
    lastLoadedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('reducer', () => {
  it('moves into the loading phase and drops stale selection', () => {
    const next = reducer(readyState({ selectedIds: [records[0]!.id], detailsId: records[0]!.id }), {
      type: 'load-start',
    })

    expect(next.phase).toBe('loading')
    expect(next.route).toBe('dashboard')
    expect(next.selectedIds).toEqual([])
    expect(next.detailsId).toBeNull()
    expect(next.loadProgress).not.toBeNull()
  })

  it('stores records on a successful load', () => {
    const loadedAt = new Date().toISOString()
    const next = reducer(initialState, { type: 'load-success', records, loadedAt })

    expect(next.phase).toBe('ready')
    expect(next.records).toHaveLength(records.length)
    expect(next.lastLoadedAt).toBe(loadedAt)
    expect(next.loadProgress).toBeNull()
  })

  it('toggles selection on and off', () => {
    const selected = reducer(readyState(), { type: 'toggle-select', id: records[1]!.id })
    expect(selected.selectedIds).toEqual([records[1]!.id])

    const cleared = reducer(selected, { type: 'toggle-select', id: records[1]!.id })
    expect(cleared.selectedIds).toEqual([])
  })

  it('deduplicates ids when selecting everything visible', () => {
    const ids = [records[0]!.id, records[0]!.id, records[2]!.id]
    const next = reducer(readyState(), { type: 'select-visible', ids })

    expect(next.selectedIds).toEqual([records[0]!.id, records[2]!.id])
  })

  it('only opens the confirmation when ready with a selection', () => {
    expect(reducer(readyState(), { type: 'open-confirm' }).phase).toBe('ready')
    expect(reducer(readyState({ selectedIds: [records[0]!.id] }), { type: 'open-confirm' }).phase).toBe('confirming')
    expect(
      reducer(readyState({ phase: 'loading', selectedIds: [records[0]!.id] }), { type: 'open-confirm' }).phase,
    ).toBe('loading')
  })

  it('records history and clears selection when a run completes', () => {
    const result: RunResult = { outcome: 'success', processed: 2, skipped: 0, failed: 0, total: 2 }
    const record: HistoryRecord = {
      id: 'run-1',
      finishedAt: new Date().toISOString(),
      recordCount: 2,
      recordNames: [records[0]!.code, records[1]!.code],
      processed: 2,
      skipped: 0,
      failed: 0,
      outcome: 'success',
    }

    const next = reducer(readyState({ phase: 'running', selectedIds: [records[0]!.id] }), {
      type: 'run-complete',
      result,
      record,
    })

    expect(next.phase).toBe('completed')
    expect(next.history).toEqual([record])
    expect(next.selectedIds).toEqual([])
    expect(next.runProgress).toBeNull()
  })

  it('keeps at most four toasts', () => {
    const withToasts = Array.from({ length: 6 }, (_, index) => index).reduce(
      (state, index) =>
        reducer(state, { type: 'add-toast', toast: { id: `t-${index}`, tone: 'info', title: `Toast ${index}` } }),
      initialState,
    )

    expect(withToasts.toasts.map((toast) => toast.id)).toEqual(['t-2', 't-3', 't-4', 't-5'])
  })

  it('throws on an unknown action so new variants must be handled', () => {
    // @ts-expect-error -- exercising the exhaustiveness guard at runtime
    expect(() => reducer(initialState, { type: 'not-a-real-action' })).toThrow(/Unhandled action/)
  })
})
