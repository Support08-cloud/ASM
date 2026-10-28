import { describe, expect, it } from 'vitest'
import { shortFfmpegError } from '../src/services/ffmpeg-error'
import { ffmpegInputPath } from '../src/services/media-url'

describe('ffmpeg errors', () => {
  it('hides the ffmpeg build banner and explains a missing movie header', () => {
    const raw = [
      'libvpl --enable-nvdec --enable-nvenc --enable-vaapi',
      '[mov,mp4,m4a,3gp,3g2,mj2 @ 000001] moov atom not found',
      'Error opening input file Z:\\Krish_1\\stacking\\5ttetrewt\\5ttetrewt-1.mp4: Invalid data found when processing input',
    ].join(' ')
    expect(shortFfmpegError(raw)).toBe(
      'This file is not a finished MP4. It has no movie header, so it cannot be played or exported.',
    )
  })

  it('exports from the prepared proxy when one exists', () => {
    expect(
      ffmpegInputPath({
        sourcePath: 'Z:/Krish_1/stacking/5ttetrewt/5ttetrewt-1.mp4',
        absolutePath: 'Z:/Krish_1/stacking/5ttetrewt/5ttetrewt-1.mp4',
        proxyPath: 'D:/out/.edit-cache/proxy-clip.mp4',
      }),
    ).toBe('D:/out/.edit-cache/proxy-clip.mp4')
  })
})
