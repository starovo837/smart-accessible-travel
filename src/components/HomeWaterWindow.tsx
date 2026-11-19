import { useEffect, useRef } from 'react'
import { campusPhoto, coverFountain, fountainPainter, heroWindow } from '../app/campusScene'

export function HomeWaterWindow({ playing, positionY = heroWindow.positionY }: { playing: boolean; positionY?: number }) {
  const layer = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const host = layer.current
    const drawing = canvas.current
    if (!playing || !host || !drawing) return
    let context: CanvasRenderingContext2D | null
    try { context = drawing.getContext('2d') } catch { return }
    if (!context) return

    const paint = fountainPainter(context)
    let width = 0, height = 0, frame = 0
    let startedAt: number | undefined
    let lastPaint = -Infinity
    let inView = typeof IntersectionObserver === 'undefined'
    let bounds = coverFountain(0, 0)
    let particles = 80
    const ready = () => inView && !document.hidden && width > 0 && height > 0
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      startedAt = undefined
      lastPaint = -Infinity
      context.clearRect(0, 0, width, height)
    }
    const tick = (stamp: number) => {
      if (!ready()) { stop(); return }
      if (stamp - lastPaint >= 1000 / 30) {
        startedAt ??= stamp
        lastPaint = stamp
        paint((stamp - startedAt) / 1000, bounds, width, height, particles)
      }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      if (!ready()) stop()
      else if (!frame) frame = requestAnimationFrame(tick)
    }
    const resize = () => {
      width = host.clientWidth
      height = host.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      drawing.width = Math.round(width * dpr)
      drawing.height = Math.round(height * dpr)
      context.setTransform(drawing.width / Math.max(1, width), 0, 0, drawing.height / Math.max(1, height), 0, 0)
      bounds = coverFountain(width, height, undefined, positionY)
      particles = Math.min(120, Math.max(80, Math.round(80 + (width - 320) * 40 / 140)))
      sync()
    }
    const sizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize)
    sizeObserver?.observe(host)
    const viewObserver = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      sync()
    })
    viewObserver?.observe(host)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', sync)
    resize()
    return () => {
      stop()
      drawing.width = 0
      drawing.height = 0
      sizeObserver?.disconnect()
      viewObserver?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [playing, positionY])

  return <div className="home-water-window" ref={layer} aria-hidden="true" style={{ height: heroWindow.height }}>
    <img src={campusPhoto} alt="" style={{ objectPosition: `50% ${positionY * 100}%` }}/>
    {playing && <canvas ref={canvas} aria-hidden="true" role="presentation"/>}
  </div>
}
