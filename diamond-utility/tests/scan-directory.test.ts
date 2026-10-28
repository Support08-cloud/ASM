import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { groupDiamonds } from '../src/services/diamond-parser'

const require = createRequire(import.meta.url)
const { scanDirectory } = require('../electron/scan-directory.cjs') as {
  scanDirectory: (root: string) => Promise<{
    folders: Array<{ folderName: string; files: Array<{ name: string; relativePath: string; absolutePath: string }> }>
  }>
}

describe('desktop scanDirectory', () => {
  it('finds MP4s inside Mp4 and still folders without walking deeper', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'du-scan-'))
    try {
      const yash = path.join(root, 'yash-01')
      await mkdir(path.join(yash, 'Mp4'), { recursive: true })
      await mkdir(path.join(yash, 'still'), { recursive: true })
      await mkdir(path.join(yash, 'S1', 'deep'), { recursive: true })
      await writeFile(path.join(yash, 'info.json'), '{}')
      await writeFile(path.join(yash, 'Mp4', '3D.mp4'), 'mp4')
      await writeFile(path.join(yash, 'still', 'front.jpg'), 'jpg')
      await writeFile(path.join(yash, 'S1', 'deep', 'skip.jpg'), 'jpg')
      await mkdir(path.join(root, '260602-362'), { recursive: true })
      await writeFile(path.join(root, '260602-362', '260602-362.mp4'), 'mp4')

      const scanned = await scanDirectory(root)
      const yashFolder = scanned.folders.find((folder) => folder.folderName === 'yash-01')
      expect(yashFolder?.files.map((file) => file.relativePath).sort()).toEqual([
        'yash-01/Mp4/3D.mp4',
        'yash-01/info.json',
        'yash-01/still/front.jpg',
      ])
      expect(yashFolder?.files.every((file) => file.absolutePath.includes(yash))).toBe(true)
      const diamonds = groupDiamonds(scanned.folders)
      expect(diamonds.map((diamond) => diamond.baseName).sort()).toEqual(['260602-362', 'yash'])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
