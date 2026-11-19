import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { campusPhoto, campusPhotoSize, heroWindow, projectFountain } from '../app/campusScene'
import { copyDictionary as copy } from '../app/copyDictionary'
import { useCampusMotionPreference } from './CampusScene'
import { HomeCover } from './HomeCover'
import './FountainCalibration.css'

type Handle = number | 'basin'
const normalized = (value: number) => Number(Math.max(0, Math.min(1, value)).toFixed(5))
const heightOptions = ['320px', '414px', '473px', '504px', '540px']
const widthOptions = [320, 390, 458]

export default function FountainCalibration() {
  const original = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const dragging = useRef<Handle | null>(null)
  const [calibration, setCalibration] = useState(heroWindow)
  const [previewWidth, setPreviewWidth] = useState(390)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [copied, setCopied] = useState(false)
  const [playing, setPlaying] = useState(false)
  const motionBlocked = useCampusMotionPreference()
  const json = JSON.stringify(calibration, null, 2)
  const projected = useMemo(() => projectFountain(size.width, size.height, calibration), [size, calibration])

  useEffect(() => {
    const element = preview.current
    if (!element) return
    const measure = () => {
      const { width, height } = element.getBoundingClientRect()
      setSize({ width, height })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [])

  function changeJet(index: number, coordinate: { x?: number; y?: number }) {
    const x = coordinate.x !== undefined && Number.isFinite(coordinate.x) ? normalized(coordinate.x) : undefined
    const y = coordinate.y !== undefined && Number.isFinite(coordinate.y) ? normalized(coordinate.y) : undefined
    setCalibration(previous => ({
      ...previous,
      jets: previous.jets.map((jet, i) => i === index ? { x: x ?? jet.x, y: y ?? jet.y } : jet),
    }))
    setCopied(false)
  }

  function changeBasin(y: number) {
    if (!Number.isFinite(y)) return
    setCalibration(previous => ({ ...previous, basinY: normalized(y) }))
    setCopied(false)
  }

  function move(event: PointerEvent<HTMLButtonElement>, handle: Handle) {
    const rect = original.current?.getBoundingClientRect()
    if (dragging.current !== handle || !rect?.width || !rect.height) return
    const y = (event.clientY - rect.top) / rect.height
    if (handle === 'basin') changeBasin(y)
    else changeJet(handle, { x: (event.clientX - rect.left) / rect.width, y })
  }

  function dragEvents(handle: Handle) {
    const stop = () => { dragging.current = null }
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return
        dragging.current = handle
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => move(event, handle),
      onPointerUp: stop,
      onPointerCancel: stop,
      onLostPointerCapture: stop,
    }
  }

  return <main className="fountain-calibration">
    <h1>{copy.fountainCalibrationTitle}</h1>
    <div ref={original} className="fountain-calibration-photo">
      <img src={campusPhoto} alt={copy.fountainOriginal} width={campusPhotoSize.width} height={campusPhotoSize.height}/>
      <button type="button" className="fountain-basin-handle" aria-label={copy.fountainBasinLine}
        style={{ top: calibration.basinY * 100 + '%' }} {...dragEvents('basin')}/>
      {calibration.jets.map((jet, index) => <button type="button" className="fountain-point-handle" key={index}
        aria-label={copy.fountainJetLabels[index]} style={{ left: jet.x * 100 + '%', top: jet.y * 100 + '%' }}
        {...dragEvents(index)}><span>{index + 1}</span></button>)}
    </div>
    <div className="fountain-calibration-values">
      {calibration.jets.map((jet, index) => <fieldset key={index}>
        <legend>{copy.fountainJetLabels[index]}</legend>
        <label>{copy.fountainJetX}<input type="number" min="0" max="1" step=".001" value={jet.x}
          onChange={event => changeJet(index, { x: event.target.valueAsNumber })}/></label>
        <label>{copy.fountainJetY}<input type="number" min="0" max="1" step=".001" value={jet.y}
          onChange={event => changeJet(index, { y: event.target.valueAsNumber })}/></label>
      </fieldset>)}
      <label>{copy.fountainBasinLine}<input type="number" min="0" max="1" step=".001" value={calibration.basinY}
        onChange={event => changeBasin(event.target.valueAsNumber)}/></label>
    </div>
    <h2>{copy.fountainCoverPreview}</h2>
    <div className="fountain-calibration-values">
      <label>{copy.fountainPhotoPosition}
        <input type="range" min="0" max="1" step=".001" value={calibration.positionY}
          onChange={event => { setCalibration({ ...calibration, positionY: event.target.valueAsNumber }); setCopied(false) }}/>
      </label>
      <label>{copy.fountainCoverHeight}
        <select value={calibration.height} onChange={event => { setCalibration({ ...calibration, height: event.target.value }); setCopied(false) }}>
          <option value={heroWindow.height}>{copy.fountainResponsiveHeight}</option>
          {heightOptions.map(height => <option key={height}>{height}</option>)}
        </select>
      </label>
      <label>{copy.fountainPreviewWidth}
        <select value={previewWidth} onChange={event => setPreviewWidth(Number(event.target.value))}>
          {widthOptions.map(width => <option key={width} value={width}>{width}px</option>)}
        </select>
      </label>
      <label><input type="checkbox" checked={playing} disabled={motionBlocked}
        onChange={event => setPlaying(event.target.checked)}/>{copy.fountainPreviewMotion}</label>
    </div>
    <div ref={preview} className="fountain-cover-preview" style={{ width: previewWidth }}>
      <HomeCover playing={playing && !motionBlocked} calibration={calibration}/>
      <div aria-hidden="true" className="fountain-preview-guides">
        <span className="fountain-basin-handle" style={{ top: projected.basinY }}/>
        {projected.jets.map((jet, index) => <span key={index} className="fountain-preview-point" style={{ left: jet.x, top: jet.y }}>{index + 1}</span>)}
      </div>
    </div>
    <label>{copy.fountainCalibrationValues}<textarea readOnly value={json} rows={12}/></label>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(json); setCopied(true) } catch { setCopied(false) }
    }}>{copy.fountainCopy}</button>
    <p role="status">{copied ? copy.fountainCopied : copy.fountainManualCopy}</p>
  </main>
}
