function finiteInRange(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Keep a restored window on a visible display. An off-screen position looks like the program never opened. */
function boundsOnScreen(saved, displays, fallback = { width: 1440, height: 900 }) {
  const width = finiteInRange(saved && saved.width, 1100, 3840, fallback.width)
  const height = finiteInRange(saved && saved.height, 720, 2160, fallback.height)
  const areas = (displays || [])
    .map((display) => (display && display.workArea) || display)
    .filter((area) => area && Number.isFinite(area.x) && Number.isFinite(area.y) && Number.isFinite(area.width) && area.width > 0)
  const x = saved && saved.x
  const y = saved && saved.y
  const visible = areas.some((area) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false
    const left = Math.max(x, area.x)
    const top = Math.max(y, area.y)
    const right = Math.min(x + width, area.x + area.width)
    const bottom = Math.min(y + height, area.y + area.height)
    return right - left >= 160 && bottom - top >= 120
  })
  if (!visible) return { width, height, center: true, maximized: false }
  return { width, height, x, y, center: false, maximized: Boolean(saved && saved.isMaximized) }
}

module.exports = { boundsOnScreen }
