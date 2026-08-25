/// <reference types="vite/client" />

interface FileSystemDirectoryHandle {
  readonly kind: 'directory'
  readonly name: string
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  values(): AsyncIterableIterator<FileSystemHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
}

interface FileSystemFileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
}

interface FileSystemHandle {
  readonly kind: 'file' | 'directory'
  readonly name: string
}

interface Window {
  showDirectoryPicker?: (options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: FileSystemDirectoryHandle | 'desktop' | 'documents' | 'downloads'
  }) => Promise<FileSystemDirectoryHandle>
  desktop?: {
    isElectron: true
    pickDirectory: () => Promise<string | null>
    scanDirectory: (root: string) => Promise<{
      folders: Array<{
        folderName: string
        relativePath: string
        accessible?: boolean
        errorMessage?: string
        files: Array<{ name: string; relativePath?: string; size?: number; absolutePath?: string }>
      }>
      foldersScanned: number
      filesSeen: number
    }>
    copyFile: (sourcePath: string, destinationPath: string) => Promise<void>
    openPath: (target: string) => Promise<void>
  }
}
