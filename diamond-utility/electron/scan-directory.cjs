const fs = require('fs')
const path = require('path')

const MEDIA = /\.(mp4|m4v|mov|json|jpe?g|png|webp|tiff?|bmp)$/i
const EXTRA_FOLDER_DEPTH = 1

async function scanDirectory(root) {
  const entries = await fs.promises.readdir(root, { withFileTypes: true })
  const folders = []
  let foldersScanned = 0
  let filesSeen = 0

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const folderPath = path.join(root, entry.name)
    foldersScanned += 1
    try {
      const files = []
      const seen = { filesSeen }
      await collectMediaFiles(folderPath, entry.name, [], 0, files, seen)
      filesSeen = seen.filesSeen
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

async function collectMediaFiles(folderPath, folderName, relativeParts, depth, files, seen) {
  const children = await fs.promises.readdir(folderPath, { withFileTypes: true })
  for (const child of children) {
    if (child.isFile()) {
      seen.filesSeen += 1
      if (!MEDIA.test(child.name)) continue
      const absolutePath = path.join(folderPath, child.name)
      let size = 0
      try {
        size = (await fs.promises.stat(absolutePath)).size
      } catch {
        size = 0
      }
      files.push({
        name: child.name,
        relativePath: [folderName, ...relativeParts, child.name].join('/'),
        size,
        absolutePath,
      })
      continue
    }
    if (child.isDirectory() && depth < EXTRA_FOLDER_DEPTH) {
      try {
        await collectMediaFiles(path.join(folderPath, child.name), folderName, [...relativeParts, child.name], depth + 1, files, seen)
      } catch {
        // An unreadable nested folder does not hide the media beside it.
      }
    }
  }
}

module.exports = { scanDirectory }
