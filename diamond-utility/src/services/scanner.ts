import { classifyFile } from './diamond-parser'
import type { ScannedFolderInput } from './diamond-parser'
import type { ScanProgress } from '../models/diamond'

export interface ScanSource {
  label: string
  handle?: FileSystemDirectoryHandle
  kind: 'demo' | 'directory'
}

const IMAGE_AND_MEDIA = /\.(mp4|m4v|mov|json|jpe?g|png|webp|tiff?|bmp)$/i

export async function scanDirectory(
  handle: FileSystemDirectoryHandle,
  onProgress: (progress: ScanProgress) => void,
  signal?: AbortSignal,
): Promise<ScannedFolderInput[]> {
  const topLevel: Array<{ name: string; handle: FileSystemDirectoryHandle }> = []
  let foldersScanned = 0
  let filesSeen = 0

  for await (const entry of handle.values()) {
    throwIfAborted(signal)
    if (entry.kind === 'directory') {
      topLevel.push({ name: entry.name, handle: entry as FileSystemDirectoryHandle })
    }
  }

  const total = Math.max(topLevel.length, 1)
  const folders: ScannedFolderInput[] = []

  for (const folder of topLevel) {
    throwIfAborted(signal)
    foldersScanned += 1
    try {
      const files: ScannedFolderInput['files'] = []
      const seen = { filesSeen }
      await collectMediaFiles(folder.handle, folder.name, [], 0, signal, files, seen)
      filesSeen = seen.filesSeen
      folders.push({
        folderName: folder.name,
        relativePath: folder.name,
        files,
      })
    } catch (error) {
      folders.push({
        folderName: folder.name,
        relativePath: folder.name,
        accessible: false,
        errorMessage: error instanceof Error ? error.message : 'Unable to read this folder.',
        files: [],
      })
    }
    onProgress({
      foldersScanned,
      filesSeen,
      percent: Math.round((foldersScanned / total) * 100),
      message: 'Reading folders and media files',
    })
  }

  onProgress({
    foldersScanned,
    filesSeen,
    percent: 100,
    message: 'Scan complete',
  })

  return folders
}

const EXTRA_FOLDER_DEPTH = 1

async function collectMediaFiles(
  handle: FileSystemDirectoryHandle,
  folderName: string,
  relativeParts: string[],
  depth: number,
  signal: AbortSignal | undefined,
  files: ScannedFolderInput['files'],
  seen: { filesSeen: number },
): Promise<void> {
  for await (const entry of handle.values()) {
    throwIfAborted(signal)
    if (entry.kind === 'file') {
      seen.filesSeen += 1
      const fileHandle = entry as FileSystemFileHandle
      const file = await fileHandle.getFile()
      if (!IMAGE_AND_MEDIA.test(file.name) && classifyFile(file.name) === 'other') continue
      files.push({
        name: file.name,
        relativePath: [folderName, ...relativeParts, file.name].join('/'),
        size: file.size,
      })
      continue
    }
    if (entry.kind === 'directory' && depth < EXTRA_FOLDER_DEPTH) {
      try {
        await collectMediaFiles(
          entry as FileSystemDirectoryHandle,
          folderName,
          [...relativeParts, entry.name],
          depth + 1,
          signal,
          files,
          seen,
        )
      } catch {
        // An unreadable nested folder does not hide the media beside it.
      }
    }
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const abortError = new Error('Scan cancelled')
    abortError.name = 'AbortError'
    throw abortError
  }
}
