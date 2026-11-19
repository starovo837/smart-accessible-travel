export const campusPhoto = '/images/seu-sipailou-fountain.jpg'
export const campusPhotoSize = { width: 4320, height: 3240 }
export type FountainPoint = { x: number; y: number }
export type FountainCalibration = {
  height: string
  positionY: number
  jets: readonly FountainPoint[]
  basinY: number
}
// 按原图 4320×3240 标定。顺序为主水柱底部、左侧低喷口、右侧低喷口；基线落在池面。
export const heroWindow: FountainCalibration = {
  height: 'clamp(320px, 56svh, 540px)',
  positionY: .5,
  jets: [{ x: .450, y: .609 }, { x: .238, y: .794 }, { x: .766, y: .806 }],
  basinY: .859,
}

export function campusPhotoCover(width: number, height: number, positionY: number) {
  const scale = Math.max(width / campusPhotoSize.width, height / campusPhotoSize.height)
  const photoWidth = campusPhotoSize.width * scale
  const photoHeight = campusPhotoSize.height * scale
  return {
    x: (width - photoWidth) / 2, y: (height - photoHeight) * positionY,
    w: photoWidth, h: photoHeight,
  }
}

export function projectFountain(width: number, height: number, calibration = heroWindow) {
  const photo = campusPhotoCover(width, height, calibration.positionY)
  const jets = calibration.jets.map(jet => ({ x: photo.x + jet.x * photo.w, y: photo.y + jet.y * photo.h }))
  const basinY = photo.y + calibration.basinY * photo.h
  const rightJet = Math.max(...jets.map(jet => jet.x))
  return { photo, jets, basinY, basinX: Math.max(width * .18, Math.min(width * .84, rightJet - width * .065)) }
}

export function particleCountForCover(width: number, height: number) {
  const fraction = Math.max(0, Math.min(1, (width * height - 320 * 416) / (460 * 520 - 320 * 416)))
  return Math.round(180 + fraction * 80)
}

export function waterMotionAllowed({
  enabled = true, reduced = false, elder = false, saveData = false, forcedColors = false,
}: { enabled?: boolean; reduced?: boolean; elder?: boolean; saveData?: boolean; forcedColors?: boolean }) {
  return enabled && !(reduced || elder || saveData || forcedColors)
}

function radialSprite(owner: Document, color: string, centerAlpha: number, edge: number) {
  const sprite = owner.createElement('canvas')
  sprite.width = 64
  sprite.height = 64
  const context = sprite.getContext('2d')
  if (!context) return sprite
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, `rgba(${color},${centerAlpha})`)
  gradient.addColorStop(.27, `rgba(${color},.56)`)
  gradient.addColorStop(edge * .79, `rgba(${color},.15)`)
  gradient.addColorStop(edge, 'transparent')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  return sprite
}

export function fountainPainter(context: CanvasRenderingContext2D) {
  const droplet = radialSprite(context.canvas.ownerDocument, '244,255,252', .95, .65)
  const glow = radialSprite(context.canvas.ownerDocument, '230,255,244', .85, 1)
  const count = 260
  const phases = new Float32Array(count), durations = new Float32Array(count), spread = new Float32Array(count)
  const sizes = new Float32Array(count), strength = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    phases[i] = Math.random()
    durations[i] = 2.4 + Math.random() * 1.2
    spread[i] = Math.random() * 2 - 1
    sizes[i] = Math.random()
    strength[i] = .2 + Math.random() * .5
  }

  return (time: number, projection: ReturnType<typeof projectFountain>, width: number, height: number, particleCount: number) => {
    const { photo, jets, basinX, basinY } = projection
    context.clearRect(0, 0, width, height)
    context.globalAlpha = .11
    context.drawImage(glow, basinX - width * .38, basinY - 10, width * .76, 31)

    for (let i = 0; i < 11; i++) {
      const phase = i * 1.78 + time * .51
      const size = 20 + (i * 17 % 41)
      const x = basinX + (i - 5) * width * .047 + Math.sin(phase) * 14
      const y = basinY - 7 + Math.cos(phase * .72) * 8
      context.globalAlpha = .045 + Math.sin(phase * .35) * .015
      context.drawImage(glow, x - size / 2, y - size * .30, size, size * .6)
    }

    const scale = Math.min(1.08, Math.max(.78, width / 390))
    for (let i = 0; i < particleCount; i++) {
      // Allocate half of the particles to the central plume when there are three nozzles.
      const jet = jets[Math.max(0, (i % (jets.length + 1)) - 1)]
      const progress = (phases[i] + time / durations[i]) % 1
      const lift = Math.max(photo.h * .033, Math.min(photo.h * .287, (basinY - jet.y) * 1.12))
      const rise = lift * (.78 + sizes[i] * .24)
      const drift = spread[i] * photo.w * .108
      const x = jet.x + drift * progress
      const y = jet.y - 4 * rise * progress * (1 - progress)
      const length = Math.min(8, Math.max(2, (4.0 + sizes[i] * 4.1) * scale))
      const breadth = Math.max(2, length * .65)
      const alpha = strength[i] * Math.min(1, progress * 9, (1 - progress) * 4.5)
      if (i % 3 === 0 && progress > .045) {
        const tail = progress - .029
        const tailY = jet.y - 4 * rise * tail * (1 - tail)
        context.globalAlpha = alpha * .43
        context.drawImage(droplet, jet.x + drift * tail - breadth / 2, tailY - length / 2, breadth, length)
      }
      context.globalAlpha = alpha
      context.drawImage(droplet, x - breadth / 2, y - length / 2, breadth, length)
    }

    context.strokeStyle = '#e6fff4'
    context.lineWidth = 1.2
    for (let i = 0; i < 3; i++) {
      const ripple = (time / 4.8 + i / 3) % 1
      const radius = 2 + (width * .4 - 2) * ripple
      context.globalAlpha = .35 * (1 - ripple)
      context.beginPath()
      context.ellipse(basinX, basinY, radius, Math.max(1, radius * .17), 0, 0, Math.PI * 2)
      context.stroke()
    }

    context.globalAlpha = .07 + Math.sin(time * 1.24) * .02
    context.drawImage(glow, basinX - 32, basinY - 13, 64, 26)
    context.globalAlpha = 1
  }
}
