import { describe, expect, it } from 'vitest'
import { groupDiamonds } from '../src/services/diamond-parser'
import { scanDirectory } from '../src/services/scanner'
import { mediaFilesForEdit } from '../src/services/timeline'

describe('scanDirectory', () => {
  it('reads media one folder deeper and still keeps 260602-362 whole', async () => {
    const root = fakeDir('root', [
      dir('yash-01', [
        file('info.json'),
        dir('Mp4', [file('3D.mp4'), file('Top.mp4')]),
        dir('S1', [file('001.jpg'), dir('deep', [file('skip.jpg')])]),
      ]),
      dir('260602-362', [dir('Mp4', [file('spin.mp4')])]),
    ])

    const folders = await scanDirectory(root, () => undefined)
    const yash = folders.find((folder) => folder.folderName === 'yash-01')
    const stone = folders.find((folder) => folder.folderName === '260602-362')
    expect(yash?.files.map((item) => item.relativePath).sort()).toEqual([
      'yash-01/Mp4/3D.mp4',
      'yash-01/Mp4/Top.mp4',
      'yash-01/S1/001.jpg',
      'yash-01/info.json',
    ])
    expect(stone?.files.map((item) => item.name)).toEqual(['spin.mp4'])

    const diamonds = groupDiamonds(folders)
    expect(diamonds.map((diamond) => diamond.baseName).sort()).toEqual(['260602-362', 'yash'])
    const editable = mediaFilesForEdit(diamonds, false)
    expect(editable.map((item) => item.outputPath).sort()).toEqual([
      '260602-362/Mp4/spin.mp4',
      'yash-01/Mp4/3D.mp4',
      'yash-01/Mp4/Top.mp4',
    ])
  })
})

interface FakeFile {
  kind: 'file'
  name: string
}
interface FakeDir {
  kind: 'directory'
  name: string
  children: Array<FakeFile | FakeDir>
}

function file(name: string): FakeFile {
  return { kind: 'file', name }
}

function dir(name: string, children: Array<FakeFile | FakeDir>): FakeDir {
  return { kind: 'directory', name, children }
}

function fakeDir(name: string, children: Array<FakeFile | FakeDir>): FileSystemDirectoryHandle {
  return {
    name,
    kind: 'directory',
    async *values() {
      for (const child of children) {
        if (child.kind === 'file') {
          yield {
            kind: 'file',
            name: child.name,
            getFile: async () => ({ name: child.name, size: 8 }),
          }
        } else {
          yield fakeDir(child.name, child.children)
        }
      }
    },
  } as unknown as FileSystemDirectoryHandle
}
