import { useEffect, useRef, useState } from 'react'
import { campusPhoto, coverFountain, fountainPainter } from '../app/campusScene'

type Connection = EventTarget & { saveData?: boolean }
const connection = () => (navigator as Navigator & { connection?: Connection }).connection

export function useCampusMotionPreference() {
  function read() {
    return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches || connection()?.saveData)
  }
  const [blocked, setBlocked] = useState(read)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const network = connection()
    const update = () => setBlocked(read())
    media.addEventListener?.('change', update)
    network?.addEventListener?.('change', update)
    update()
    return () => {
      media.removeEventListener?.('change', update)
      network?.removeEventListener?.('change', update)
    }
  }, [])
  return blocked
}

export function CampusScene({ playing = false }: { playing?: boolean }) {
  const layer = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const host = layer.current, drawing = canvas.current
    if (!playing || !host || !drawing) return
    let context: CanvasRenderingContext2D | null
    try { context = drawing.getContext('2d') } catch { return }
    if (!context) return
    const forced = window.matchMedia('(forced-colors: active)')
    const paint = fountainPainter(context)
    let x = 0, y = 0, frame = 0, last = 0, baseline: number | undefined
    let inView = true, bounds = coverFountain(0, 0)
    const stop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      last = 0
      baseline = undefined
      context.clearRect(0, 0, x, y)
    }
    const ready = () => !document.hidden && inView && !forced.matches && x > 0 && y > 0 &&
      bounds.x < x && bounds.x + bounds.w > 0 && bounds.y < y && bounds.y + bounds.h > 0
    const tick = (stamp: number) => {
      if (!ready()) { stop(); return }
      frame = requestAnimationFrame(tick)
      baseline ??= stamp
      const interval = 1000 / 30
      if (last && stamp - last < interval) return
      last = stamp
      paint((stamp - baseline) / 1000, bounds, x, y, x < 600 ? 80 : 140)
    }
    const sync = () => {
      if (!ready()) stop()
      else if (!frame) frame = requestAnimationFrame(tick)
    }
    const resize = () => {
      x = host.clientWidth
      y = host.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      drawing.width = Math.round(x * dpr)
      drawing.height = Math.round(y * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      bounds = coverFountain(x, y)
      sync()
    }
    const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      sync()
    })
    observer?.observe(host)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', sync)
    forced.addEventListener?.('change', sync)
    resize()

    return () => {
      stop()
      drawing.width = 0
      drawing.height = 0
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', sync)
      forced.removeEventListener?.('change', sync)
    }
  }, [playing])

  return <div className="campus-scene" ref={layer} aria-hidden="true">
    <img src={campusPhoto} alt="" />
    {playing && <canvas ref={canvas} aria-hidden="true" role="presentation" />}
  </div>
}
