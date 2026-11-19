import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { campusPhoto, coverFountain, fountainBounds, heroWindow, type FountainBounds } from '../app/campusScene'
import { copyDictionary as copy } from '../app/copyDictionary'
import { HomeWaterWindow } from './HomeWaterWindow'
import './FountainCalibration.css'

function BandCalibration() {
  const preview = useRef<HTMLDivElement>(null)
  const [positionY, setPositionY] = useState(heroWindow.positionY)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const node = preview.current
    if (!node) return
    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [])
  const bounds = coverFountain(size.width, size.height, fountainBounds, positionY)
  return <main className="fountain-calibration">
    <h1>{copy.fountainBandPreview}</h1>
    <div ref={preview} className="fountain-band-preview">
      <HomeWaterWindow playing={false} positionY={positionY}/>
      <div className="fountain-calibration-box" aria-hidden="true"
        style={{ left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }}>
        <span className="fountain-calibration-origin"/><span className="fountain-calibration-ripple"/>
      </div>
    </div>
    <label>{copy.fountainBandPosition}
      <input type="range" min="0" max="1" step=".001" value={positionY}
        onChange={event => setPositionY(event.target.valueAsNumber)}/>
    </label>
    <label>{copy.fountainBandValues}
      <textarea readOnly value={JSON.stringify({ height: heroWindow.height, positionY })} rows={2}/>
    </label>
  </main>
}

export default function FountainCalibration() {
  return new URLSearchParams(location.search).get('band') === '1' ? <BandCalibration/> : <OriginalCalibration/>
}

function OriginalCalibration() {
  const frame = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState(fountainBounds)
  const [copied, setCopied] = useState(false)
  const drag = useRef<{ x: number; y: number; start: FountainBounds; resize: boolean } | null>(null)
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))
  const start = (event: PointerEvent<HTMLElement>, resize: boolean) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, start: bounds, resize }
  }
  const move = (event: PointerEvent<HTMLElement>) => {
    const previous = drag.current, rect = frame.current?.getBoundingClientRect()
    if (!previous || !rect) return
    const { start } = previous
    const dx = (event.clientX - previous.x) / rect.width, dy = (event.clientY - previous.y) / rect.height
    setBounds(previous.resize
      ? { ...start, w: clamp(start.w + dx, .005, 1 - start.x), h: clamp(start.h + dy, .005, 1 - start.y) }
      : { ...start, x: clamp(start.x + dx, 0, 1 - start.w), y: clamp(start.y + dy, 0, 1 - start.h) })
  }
  const change = (key: keyof FountainBounds, value: number) => {
    if (!Number.isFinite(value)) return
    const max = { x: 1 - bounds.w, y: 1 - bounds.h, w: 1 - bounds.x, h: 1 - bounds.y }
    setBounds({ ...bounds, [key]: clamp(value, key === 'w' || key === 'h' ? .005 : 0, max[key]) })
  }
  const json = JSON.stringify(Object.fromEntries(
    Object.entries(bounds).map(([key, value]) => [key, Number(value.toFixed(5))]),
  ))
  const stop = () => { drag.current = null }
  return <main className="fountain-calibration">
    <h1>喷泉坐标标定</h1>
    <div ref={frame} className="fountain-calibration-photo">
      <img src={campusPhoto} alt="东南大学四牌楼校区大礼堂与喷泉原图" />
      <div className="fountain-calibration-box"
        style={{ left: bounds.x * 100 + '%', top: bounds.y * 100 + '%', width: bounds.w * 100 + '%', height: bounds.h * 100 + '%' }}
        onPointerDown={event => start(event, false)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
        <span className="fountain-calibration-origin" /><span className="fountain-calibration-ripple" />
        <button type="button" aria-label="拖动此角缩放，或使用下方数字输入"
          onPointerDown={event => start(event, true)} onPointerMove={event => { event.stopPropagation(); move(event) }}
          onPointerUp={stop} onPointerCancel={stop} />
      </div>
    </div>
    <div className="fountain-calibration-values">
      {(Object.keys(bounds) as (keyof FountainBounds)[]).map(key => <label key={key}>{key}
        <input type="number" min="0" max="1" step=".001" value={Number(bounds[key].toFixed(5))}
          onChange={event => change(key, event.target.valueAsNumber)} />
      </label>)}
    </div>
    <label>归一化坐标<textarea readOnly value={json} rows={2} /></label>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(json); setCopied(true) } catch { setCopied(false) }
    }}>复制 JSON</button>
    <p role="status">{copied ? '已复制。' : '也可以选择文本后复制。'}</p>
  </main>
}
