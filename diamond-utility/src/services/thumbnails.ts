export async function captureFilmstrip(src: string, count = 5): Promise<string[]> {
  if (!src) return []
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = src
  try {
    await waitFor(video, 'loadedmetadata', 4000)
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1
    const frames: string[] = []
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 54
    const ctx = canvas.getContext('2d')
    if (!ctx) return []
    const n = Math.max(1, Math.min(count, 8))
    for (let i = 0; i < n; i += 1) {
      const t = ((i + 0.5) / n) * Math.max(duration - 0.05, 0)
      video.currentTime = t
      await waitFor(video, 'seeked', 2500)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      frames.push(canvas.toDataURL('image/jpeg', 0.62))
    }
    return frames
  } catch {
    return []
  } finally {
    video.src = ''
  }
}

function waitFor(video: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (event === 'loadedmetadata' && video.readyState >= 1) {
      resolve()
      return
    }
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('timeout'))
    }, timeoutMs)
    const onOk = () => {
      cleanup()
      resolve()
    }
    const onErr = () => {
      cleanup()
      reject(new Error('media error'))
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener(event, onOk)
      video.removeEventListener('error', onErr)
    }
    video.addEventListener(event, onOk, { once: true })
    video.addEventListener('error', onErr, { once: true })
  })
}
