/** Turn an ffmpeg stderr dump into one sentence for the editor. */
export function shortFfmpegError(raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (/moov atom not found/i.test(text)) {
    return 'This file is not a finished MP4. It has no movie header, so it cannot be played or exported.'
  }
  if (/no such file or directory/i.test(text)) return 'The video file could not be found.'
  if (/permission denied|access is denied/i.test(text)) return 'The video file could not be read. Check that the drive is connected.'
  if (/invalid data found when processing input/i.test(text)) return 'This file could not be read as a video.'
  return 'This video could not be prepared.'
}
