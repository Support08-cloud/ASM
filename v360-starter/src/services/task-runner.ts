import type { RecordItem, RunProgress, RunResult } from '../models/app'

export interface RunTaskOptions {
  records: RecordItem[]
  signal?: AbortSignal
  stepDelayMs?: number
  onProgress?: (progress: RunProgress) => void
}

/**
 * Stand-in for the real long-running job. It keeps the progress/abort/result
 * contract the UI depends on, so replacing the body is usually all that is needed.
 */
export async function runTask({
  records,
  signal,
  stepDelayMs = 90,
  onProgress,
}: RunTaskOptions): Promise<RunResult> {
  let processed = 0
  let skipped = 0
  let failed = 0

  for (const [index, record] of records.entries()) {
    throwIfAborted(signal)

    onProgress?.({
      index,
      total: records.length,
      currentLabel: record.code,
      percent: Math.round((index / records.length) * 100),
    })

    await wait(stepDelayMs, signal)

    if (record.status === 'error') failed += 1
    else if (record.status === 'warning') skipped += 1
    else processed += 1
  }

  throwIfAborted(signal)
  onProgress?.({
    index: records.length,
    total: records.length,
    currentLabel: '',
    percent: 100,
  })

  return {
    outcome: outcomeFor(processed, failed, records.length),
    processed,
    skipped,
    failed,
    total: records.length,
  }
}

export function summarize(records: RecordItem[]): { itemCount: number; sizeBytes: number } {
  return records.reduce(
    (totals, record) => ({
      itemCount: totals.itemCount + record.itemCount,
      sizeBytes: totals.sizeBytes + record.sizeBytes,
    }),
    { itemCount: 0, sizeBytes: 0 },
  )
}

function outcomeFor(processed: number, failed: number, total: number): RunResult['outcome'] {
  if (total > 0 && processed === 0) return 'error'
  if (failed > 0) return 'partial'
  return 'success'
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  throw new DOMException('Task aborted', 'AbortError')
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Task aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
