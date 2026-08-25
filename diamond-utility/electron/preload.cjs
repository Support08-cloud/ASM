const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  isElectron: true,
  pickDirectory: () => ipcRenderer.invoke('desktop:pick-directory'),
  pickMedia: (kind) => ipcRenderer.invoke('desktop:pick-media', kind),
  scanDirectory: (root) => ipcRenderer.invoke('desktop:scan-directory', root),
  copyFile: (sourcePath, destinationPath) =>
    ipcRenderer.invoke('desktop:copy-file', sourcePath, destinationPath),
  openPath: (target) => ipcRenderer.invoke('desktop:open-path', target),
  writeTextFile: (filePath, contents) => ipcRenderer.invoke('desktop:write-text-file', filePath, contents),
  runFfmpeg: (args) => ipcRenderer.invoke('desktop:run-ffmpeg', args),
  resolveSample: (rel) => ipcRenderer.invoke('desktop:resolve-sample', rel),
  fontFile: () => ipcRenderer.invoke('desktop:font-file'),
  mediaInfo: (filePath) => ipcRenderer.invoke('desktop:media-info', filePath),
  toMediaUrl: (filePath) => {
    const encoded = Buffer.from(String(filePath), 'utf8').toString('base64url')
    return `du-media://host/${encoded}`
  },
})
