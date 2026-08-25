const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const fs = require('fs')
const path = require('path')

const MEDIA = /\.(mp4|m4v|mov|json|jpe?g|png|webp|tiff?|bmp)$/i

function stateFile() {
  return path.join(app.getPath('userData'), 'window.json')
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'))
  } catch {
    return { width: 1440, height: 900 }
  }
}

function createWindow() {
  const saved = loadWindowState()
  const win = new BrowserWindow({
    width: saved.width ?? 1440,
    height: saved.height ?? 900,
    x: saved.x,
    y: saved.y,
    minWidth: 1100,
    minHeight: 720,
    title: 'Diamond Utility',
    backgroundColor: '#0c0e12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.setMenuBarVisibility(false)

  if (saved.isMaximized) win.maximize()

  const persist = () => {
    if (win.isDestroyed()) return
    const payload = {
      ...win.getBounds(),
      isMaximized: win.isMaximized(),
    }
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
    fs.writeFileSync(stateFile(), JSON.stringify(payload))
  }

  win.on('close', persist)

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  } else {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173')
  }
}

function scanDirectory(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true })
  const folders = []
  let foldersScanned = 0
  let filesSeen = 0

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const folderPath = path.join(root, entry.name)
    foldersScanned += 1
    try {
      const files = []
      for (const child of fs.readdirSync(folderPath, { withFileTypes: true })) {
        if (!child.isFile()) continue
        filesSeen += 1
        if (!MEDIA.test(child.name)) continue
        const absolutePath = path.join(folderPath, child.name)
        const stat = fs.statSync(absolutePath)
        files.push({
          name: child.name,
          relativePath: path.join(entry.name, child.name),
          size: stat.size,
          absolutePath,
        })
      }
      folders.push({
        folderName: entry.name,
        relativePath: folderPath,
        files,
      })
    } catch (error) {
      folders.push({
        folderName: entry.name,
        relativePath: folderPath,
        accessible: false,
        errorMessage: error instanceof Error ? error.message : 'Unable to read this folder.',
        files: [],
      })
    }
  }

  return { folders, foldersScanned, filesSeen }
}

app.whenReady().then(() => {
  ipcMain.handle('desktop:pick-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select folder',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle('desktop:scan-directory', async (_event, root) => {
    return scanDirectory(root)
  })

  ipcMain.handle('desktop:copy-file', async (_event, sourcePath, destinationPath) => {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true })
    await fs.promises.copyFile(sourcePath, destinationPath)
  })

  ipcMain.handle('desktop:open-path', async (_event, target) => {
    const err = await shell.openPath(target)
    if (err) throw new Error(err)
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
