export const campusPhoto = '/images/seu-sipailou-fountain.jpg'
export const campusPhotoSize = { width: 4320, height: 3240 }
export type FountainBounds = { x: number; y: number; w: number; h: number }
// Calibrated on the original photo using the 900 × 675 development preview.
export const fountainBounds: FountainBounds = { x: 0.37556, y: 0.31111, w: 0.19667, h: 0.60889 }

export function coverFountain(width: number, height: number, bounds = fountainBounds) {
  const scale = Math.max(width / campusPhotoSize.width, height / campusPhotoSize.height)
  const photoWidth = campusPhotoSize.width * scale
  const photoHeight = campusPhotoSize.height * scale
  return {
    x: (width - photoWidth) / 2 + bounds.x * photoWidth,
    y: bounds.y * photoHeight,
    w: bounds.w * photoWidth,
    h: bounds.h * photoHeight,
  }
}

export function waterMotionAllowed({
  enabled = true, reduced = false, elder = false, saveData = false, forcedColors = false,
}: { enabled?: boolean; reduced?: boolean; elder?: boolean; saveData?: boolean; forcedColors?: boolean }) {
  return enabled && !(reduced || elder || saveData || forcedColors)
}

export function fountainPainter(context: CanvasRenderingContext2D) {
  const count = 140
  const phases = new Float32Array(count), durations = new Float32Array(count), spread = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    phases[i] = Math.random()
    durations[i] = 1.65 + Math.random() * .75
    spread[i] = Math.random() - .5
  }
  const jetWidth = [-.045, .003, .048]

  return (time: number, bounds: FountainBounds, width: number, height: number, particleCount: number) => {
    context.clearRect(0, 0, width, height)
    context.save()
    context.beginPath()
    context.rect(bounds.x, bounds.y, bounds.w, bounds.h)
    context.clip()
    const originX = bounds.x + bounds.w * .39
    const originY = bounds.y + bounds.h * .49
    for (let i = 0; i < particleCount; i++) {
      const progress = (phases[i] + time / durations[i]) % 1
      const heightFactor = 4 * progress * (1 - progress)
      const mist = i % 14 === 0
      const x = originX + bounds.w * (jetWidth[i % 3] * progress + spread[i] * (mist ? .40 : .23) * progress)
      const y = originY - bounds.h * (.45 + spread[i] * .09) * heightFactor
      const radius = mist ? 3 + bounds.w * .025 * progress : .65 + 1.1 * (1 - progress)
      context.globalAlpha = Math.sin(progress * Math.PI) * (mist ? .12 : .62)
      context.fillStyle = '#f1fff9'
      context.beginPath()
      context.ellipse(x, y, radius, mist ? radius : radius * 2.7, 0, 0, Math.PI * 2)
      context.fill()
    }

    const ripple = time % 4 / 4
    context.globalAlpha = Math.sin(ripple * Math.PI) * .32
    context.strokeStyle = '#dcf5ee'
    context.lineWidth = 1
    context.beginPath()
    context.ellipse(bounds.x + bounds.w * .735, bounds.y + bounds.h * .90,
      3 + bounds.w * .22 * ripple, 1 + bounds.h * .035 * ripple, 0, 0, Math.PI * 2)
    context.stroke()
    context.restore()
  }
}
