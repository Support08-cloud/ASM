import { describe, expect, it, vi } from 'vitest'
import { runTask, summarize } from '../src/services/task-runner'
import type { RecordItem, RecordStatus } from '../src/models/app'

function record(id: string, status: RecordStatus): RecordItem {
  return {
    id,
    code: id.toUpperCase(),
    label: `${id} collection`,
    status,
    itemCount: 5,
    sizeBytes: 1_000,
    updatedAt: '2026-09-23T00:00:00.000Z',
    tags: ['batch-a'],
  }
}

describe('runTask', () => {
  it('reports success when every record is ready', async () => {
    const result = await runTask({ records: [record('a', 'ready'), record('b', 'ready')], stepDelayMs: 0 })

    expect(result).toMatchObject({ outcome: 'success', processed: 2, skipped: 0, failed: 0, total: 2 })
  })

  it('reports a partial outcome when a record fails', async () => {
    const result = await runTask({
      records: [record('a', 'ready'), record('b', 'warning'), record('c', 'error')],
      stepDelayMs: 0,
    })

    expect(result).toMatchObject({ outcome: 'partial', processed: 1, skipped: 1, failed: 1, total: 3 })
  })

  it('reports an error when nothing could be processed', async () => {
    const result = await runTask({ records: [record('a', 'error')], stepDelayMs: 0 })

    expect(result.outcome).toBe('error')
  })

  it('emits progress for each record plus a final 100%', async () => {
    const onProgress = vi.fn()
    await runTask({ records: [record('a', 'ready'), record('b', 'ready')], stepDelayMs: 0, onProgress })

    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress.mock.calls.at(0)?.[0]).toMatchObject({ index: 0, total: 2, currentLabel: 'A', percent: 0 })
    expect(onProgress.mock.calls.at(-1)?.[0]).toMatchObject({ percent: 100 })
  })

  it('rejects with an AbortError once the signal aborts', async () => {
    const controller = new AbortController()
    const pending = runTask({
      records: [record('a', 'ready'), record('b', 'ready')],
      stepDelayMs: 20,
      signal: controller.signal,
    })

    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('summarize', () => {
  it('adds up item counts and sizes', () => {
    expect(summarize([record('a', 'ready'), record('b', 'ready')])).toEqual({ itemCount: 10, sizeBytes: 2_000 })
  })

  it('returns zeroes for an empty selection', () => {
    expect(summarize([])).toEqual({ itemCount: 0, sizeBytes: 0 })
  })
})
