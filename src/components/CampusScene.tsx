import { useEffect, useState } from 'react'
import { campusPhoto } from '../app/campusScene'

type Connection = EventTarget & { saveData?: boolean }
const connection = () => (navigator as Navigator & { connection?: Connection }).connection
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const forcedColorsQuery = '(forced-colors: active)'

export function useCampusMotionPreference() {
  function read() {
    return Boolean(window.matchMedia(reducedMotionQuery).matches || window.matchMedia(forcedColorsQuery).matches || connection()?.saveData)
  }
  const [blocked, setBlocked] = useState(read)
  useEffect(() => {
    const media = window.matchMedia(reducedMotionQuery)
    const forcedColors = window.matchMedia(forcedColorsQuery)
    const network = connection()
    const update = () => setBlocked(read())
    media.addEventListener?.('change', update)
    forcedColors.addEventListener?.('change', update)
    network?.addEventListener?.('change', update)
    update()
    return () => {
      media.removeEventListener?.('change', update)
      forcedColors.removeEventListener?.('change', update)
      network?.removeEventListener?.('change', update)
    }
  }, [])
  return blocked
}

export function CampusScene() {
  return <div className="campus-scene" aria-hidden="true">
    <img src={campusPhoto} alt="" />
  </div>
}
