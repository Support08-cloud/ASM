const { app, BrowserWindow, dialog, ipcMain, shell, protocol, net } = require('electron')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')

const MEDIA = /\.(mp4|m4v|mov|json|jpe?g|png|webp|tiff?|bmp)$/i

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'du-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
])

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

function samplesDir() {
  const packaged = path.join(__dirname, '..', 'dist', 'samples')
  if (fs.existsSync(packaged)) return packaged
  return path.join(__dirname, '..', 'public', 'samples')
}

function resolveSample(rel) {
  const name = String(rel || '').replace(/^(\.\/)?samples\//, '').replace(/^.*[/\\]/, '')
  return path.join(samplesDir(), name)
}

function fontFile() {
  if (process.platform === 'win32') {
    const arial = 'C:\\Windows\\Fonts\\arial.ttf'
    if (fs.existsSync(arial)) return arial
  }
  const linux = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
  ]
  return linux.find((file) => fs.existsSync(file)) ?? null
}

function parseMediaInfo(stderr) {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  let durationMs = 0
  if (match) {
    durationMs = Math.round((Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000)
  }
  return { durationMs, hasAudio: /Audio:/i.test(stderr) }
}

function mediaInfo(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBinary(), ['-hide_banner', '-i', filePath], { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', () => resolve(parseMediaInfo(stderr)))
  })
}

app.whenReady().then(() => {
  protocol.handle('du-media', (request) => {
    const prefix = 'du-media://local/'
    const encoded = request.url.startsWith(prefix) ? request.url.slice(prefix.length) : request.url.replace(/^du-media:\/\//, '')
    const filePath = decodeURIComponent(encoded.split('?')[0])
    return net.fetch(pathToFileURL(filePath).href)
  })

  ipcMain.handle('desktop:pick-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select folder',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle('desktop:pick-media', async (_event, kind) => {
    const audio = [
      { name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg'] },
    ]
    const video = [
      { name: 'Video', extensions: ['mp4', 'mov', 'm4v', 'mkv', 'webm'] },
    ]
    const result = await dialog.showOpenDialog({
      title: kind === 'audio' ? 'Add music' : 'Add media',
      properties: ['openFile'],
      filters: kind === 'audio' ? audio : video,
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

  ipcMain.handle('desktop:write-text-file', async (_event, filePath, contents) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, contents, 'utf8')
  })

  ipcMain.handle('desktop:run-ffmpeg', async (_event, args) => {
    const output = args[args.length - 1]
    if (typeof output === 'string') fs.mkdirSync(path.dirname(output), { recursive: true })
    await runFfmpeg(args)
  })

  ipcMain.handle('desktop:resolve-sample', async (_event, rel) => {
    return resolveSample(rel)
  })

  ipcMain.handle('desktop:font-file', async () => {
    return fontFile()
  })

  ipcMain.handle('desktop:media-info', async (_event, filePath) => {
    return mediaInfo(filePath)
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function ffmpegBinary() {
  const packed = path.join(process.resourcesPath, 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  if (fs.existsSync(packed)) return packed
  const local = path.join(__dirname, '..', 'extra-bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  if (fs.existsSync(local)) return local
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBinary(), args, { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim().slice(-1000) || `ffmpeg exited with code ${code}`))
    })
  })
}
