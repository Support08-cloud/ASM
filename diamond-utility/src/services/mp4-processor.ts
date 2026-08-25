import { countKind } from '../models/diamond'
import type { Diamond, DiamondFolder } from '../models/diamond'
import type { DiamondProcessJob, DuplicatePolicy, ProcessFileResult, ProcessProgress, ProcessResult } from '../models/processing'

export interface ExtractOptions {
  diamonds: Diamond[]
  outputPath: string
  duplicatePolicy: DuplicatePolicy
  signal?: AbortSignal
  onProgress: (progress: ProcessProgress) => void
  copyFile?: (sourcePath: string, destinationPath: string) => Promise<void>
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }))
      return
    }
    const timer = window.setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }))
      },
      { once: true },
    )
  })
}

function outputName(folder: DiamondFolder, fileName: string, index: number): string {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.mp4'
  if (index === 0) return `${folder.folderName}${ext}`
  return `${folder.folderName}_${index + 1}${ext}`
}

export async function extractMp4s(options: ExtractOptions): Promise<ProcessResult> {
  const { diamonds, outputPath, duplicatePolicy, signal, onProgress, copyFile } = options
  const jobs: DiamondProcessJob[] = diamonds.map((diamond) => ({
    diamondId: diamond.id,
    diamondName: diamond.baseName,
    steps: diamond.folders.map((folder) => ({
      viewId: folder.id,
      viewLabel: folder.folderName,
      folderName: folder.folderName,
      status: 'pending',
    })),
  }))

  const files: ProcessFileResult[] = []
  const usedNames = new Map<string, number>()
  let copied = 0
  let skipped = 0
  let failed = 0
  let completedSteps = 0
  const totalSteps = Math.max(
    jobs.reduce((sum, job) => sum + job.steps.length, 0),
    1,
  )

  const emit = (diamondIndex: number, currentDiamond: string, currentFile?: string) => {
    onProgress({
      diamondIndex,
      diamondTotal: diamonds.length,
      currentDiamond,
      currentFile,
      percent: Math.round((completedSteps / totalSteps) * 100),
      jobs: jobs.map((job) => ({ ...job, steps: job.steps.map((step) => ({ ...step })) })),
    })
  }

  emit(0, diamonds[0]?.baseName ?? '', undefined)

  for (let diamondIndex = 0; diamondIndex < diamonds.length; diamondIndex += 1) {
    const diamond = diamonds[diamondIndex]
    const job = jobs[diamondIndex]
    emit(diamondIndex, diamond.baseName)

    for (let stepIndex = 0; stepIndex < diamond.folders.length; stepIndex += 1) {
      if (signal?.aborted) {
        return finalize('error', copied, skipped, failed, files, outputPath, 'Processing cancelled.')
      }
      const folder = diamond.folders[stepIndex]
      const step = job.steps[stepIndex]
      step.status = 'running'

      if (!folder.accessible) {
        step.status = 'error'
        step.message = folder.errorMessage ?? 'Folder inaccessible'
        failed += 1
        files.push({
          diamondName: diamond.baseName,
          viewLabel: folder.folderName,
          sourcePath: folder.relativePath,
          outputPath: '',
          status: 'failed',
          message: step.message,
        })
        completedSteps += 1
        emit(diamondIndex, diamond.baseName)
        continue
      }

      const mp4s = folder.files.filter((file) => file.kind === 'mp4')
      if (mp4s.length === 0) {
        step.status = 'skipped'
        step.message = 'No MP4 found'
        skipped += 1
        files.push({
          diamondName: diamond.baseName,
          viewLabel: folder.folderName,
          sourcePath: folder.relativePath,
          outputPath: '',
          status: 'skipped',
          message: 'No MP4 found',
        })
        completedSteps += 1
        emit(diamondIndex, diamond.baseName)
        await sleep(90, signal)
        continue
      }

      for (const [fileIndex, file] of mp4s.entries()) {
        const destName = outputName(folder, file.name, fileIndex)
        const destPath = joinPath(outputPath, diamond.baseName, destName)
        const key = destPath.toLowerCase()
        step.currentFile = file.relativePath
        emit(diamondIndex, diamond.baseName, file.relativePath)

        if (usedNames.has(key) && duplicatePolicy === 'skip') {
          skipped += 1
          files.push({
            diamondName: diamond.baseName,
            viewLabel: folder.folderName,
            sourcePath: file.relativePath,
            outputPath: destPath,
            status: 'skipped',
            message: 'Duplicate skipped',
          })
          continue
        }

        const finalPath =
          usedNames.has(key) && duplicatePolicy === 'rename' ? uniquify(destPath, usedNames) : destPath
        usedNames.set(finalPath.toLowerCase(), 1)

        if (copyFile && file.absolutePath) {
          try {
            await copyFile(file.absolutePath, finalPath)
          } catch (error) {
            failed += 1
            files.push({
              diamondName: diamond.baseName,
              viewLabel: folder.folderName,
              sourcePath: file.relativePath,
              outputPath: finalPath,
              status: 'failed',
              message: error instanceof Error ? error.message : 'Copy failed',
            })
            continue
          }
        } else {
          await sleep(140, signal)
        }

        copied += 1
        files.push({
          diamondName: diamond.baseName,
          viewLabel: folder.folderName,
          sourcePath: file.relativePath,
          outputPath: finalPath,
          status: 'copied',
        })
      }

      step.status = countKind(folder, 'mp4') > 1 ? 'done' : 'done'
      completedSteps += 1
      emit(diamondIndex, diamond.baseName)
    }
  }

  const outcome = failed > 0 && copied > 0 ? 'partial' : failed > 0 ? 'error' : 'success'
  return finalize(outcome, copied, skipped, failed, files, outputPath)
}

function uniquify(path: string, used: Map<string, number>): string {
  const dot = path.lastIndexOf('.')
  const base = dot === -1 ? path : path.slice(0, dot)
  const ext = dot === -1 ? '' : path.slice(dot)
  let n = 2
  let candidate = `${base}_${n}${ext}`
  while (used.has(candidate.toLowerCase())) {
    n += 1
    candidate = `${base}_${n}${ext}`
  }
  return candidate
}

function joinPath(...parts: string[]): string {
  const root = parts[0] ?? ''
  const sep = root.includes('\\') ? '\\' : '/'
  return parts
    .map((part, index) =>
      index === 0 ? part.replace(/[\\/]+$/, '') : part.replace(/^[\\/]+/, ''),
    )
    .join(sep)
}

function finalize(
  outcome: ProcessResult['outcome'],
  copied: number,
  skipped: number,
  failed: number,
  files: ProcessFileResult[],
  outputPath: string,
  errorMessage?: string,
): ProcessResult {
  return {
    outcome,
    copied,
    skipped,
    failed,
    total: copied + skipped + failed,
    outputPath,
    files,
    errorMessage,
    errorPath: files.find((file) => file.status === 'failed')?.sourcePath,
  }
}

export function countSelectedFolders(diamonds: Diamond[]): number {
  return diamonds.reduce((sum, diamond) => sum + diamond.sourceFolderCount, 0)
}

export function countSelectedMp4s(diamonds: Diamond[]): number {
  return diamonds.reduce(
    (sum, diamond) => sum + diamond.folders.reduce((inner, folder) => inner + countKind(folder, 'mp4'), 0),
    0,
  )
}
