const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  isElectron: true,
  pickDirectory: () => ipcRenderer.invoke('desktop:pick-directory'),
  scanDirectory: (root) => ipcRenderer.invoke('desktop:scan-directory', root),
  copyFile: (sourcePath, destinationPath) =>
    ipcRenderer.invoke('desktop:copy-file', sourcePath, destinationPath),
  openPath: (target) => ipcRenderer.invoke('desktop:open-path', target),
})
