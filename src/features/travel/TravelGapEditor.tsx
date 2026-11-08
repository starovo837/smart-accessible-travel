import {useEffect,useId,useRef,useState} from 'react'
import {travelModes} from '../../app/catalog'
import {requiresTravelBattery,requiresTravelDimensions} from '../../app/travelCompleteness'
import {storedDeviceSpecs} from '../../app/travelTaskStorage'
import type {Device,TravelContext,TravelDeviceSpecs} from '../../app/types'

export interface TravelGapPatch {
  deviceIds:string[]
  specs:Record<string,TravelDeviceSpecs>
  context:TravelContext
  mode?:string
}
interface Props {
  focusGap:string
  focusRequest?:number
  availableDevices:Device[]
  devices:Device[]
  specs:Record<string,TravelDeviceSpecs>
  context:TravelContext
  mode:string
  gaps:{id:string;label:string;deviceIds?:string[]}[]
  onApply:(patch:TravelGapPatch)=>void
  onCancel:()=>void
}

/** Draft changes stay in this form until the user saves; never inserts example values. */
export function TravelGapEditor(props:Props){
  const id=useId(),form=useRef<HTMLFormElement>(null),[deviceIds,setDeviceIds]=useState(()=>props.devices.map(device=>device.id)),[specs,setSpecs]=useState(()=>structuredClone(props.specs)),[context,setContext]=useState(()=>({...props.context})),[mode,setMode]=useState(props.mode)
  const options=[...props.availableDevices,...props.devices].filter((device,index,all)=>all.findIndex(item=>item.id===device.id)===index)
  const selected=options.filter(device=>deviceIds.includes(device.id))
  const [message,setMessage]=useState('')
  const gapIds=props.gaps.map(gap=>gap.id)
  useEffect(()=>{
    const deviceId=props.gaps.find(gap=>gap.id===props.focusGap)?.deviceIds?.[0]
    const fields=Array.from(form.current?.querySelectorAll<HTMLElement>(`[data-gap-field="${props.focusGap}"]`)??[])
    const matching=fields.filter(field=>!deviceId||field.closest('fieldset')?.getAttribute('data-device-id')===deviceId)
    const target=(matching.find(field=>field instanceof HTMLInputElement&&!field.value)||matching[0])
      ??form.current?.querySelector<HTMLElement>('[data-gap-field="devices"]')
      ??form.current?.querySelector<HTMLElement>('input,select')
    target?.focus()
  },[props.focusGap,props.focusRequest])
  const update=(deviceId:string,field:keyof TravelDeviceSpecs,value:unknown)=>setSpecs(current=>({...current,[deviceId]:{...current[deviceId],[field]:value}}))
  return <form ref={form} className="travel-gap-editor" aria-labelledby={id+'-heading'} onSubmit={event=>{event.preventDefault();props.onApply({deviceIds,specs,context,mode})}}>
    <h2 id={id+'-heading'}>补充本次行程资料</h2>
    <p>已有资料已带入。可以在同一页补充设备、尺寸和电池，保存后原地更新清单；尚未补齐的条件会继续显示。</p>
    {gapIds.includes('mode')&&<label htmlFor={id+'-mode'}>出行方式<select id={id+'-mode'} data-gap-field="mode" value={mode} onChange={event=>setMode(event.target.value)}><option value="">选择本次出行方式</option>{travelModes.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
    {(gapIds.includes('from')||gapIds.includes('to'))&&<div className="field-grid two">
      <label htmlFor={id+'-from'}>出发站或地点<input id={id+'-from'} data-gap-field="from" value={context.from??''} maxLength={80} onChange={event=>setContext(current=>({...current,from:event.target.value}))}/></label>
      <label htmlFor={id+'-to'}>到达站或地点<input id={id+'-to'} data-gap-field="to" value={context.to??''} maxLength={80} onChange={event=>setContext(current=>({...current,to:event.target.value}))}/></label>
    </div>}
    <label htmlFor={id+'-device'}>设备类型／已有设备<select id={id+'-device'} data-gap-field="devices" value="" onChange={event=>{const deviceId=event.target.value,device=options.find(item=>item.id===deviceId);if(device){setDeviceIds(current=>[...current,deviceId]);setSpecs(current=>({...current,[deviceId]:current[deviceId]??storedDeviceSpecs(device)}));setMessage('已加入设备，并带入此设备已有参数，请核对下方资料。')}}}><option value="">选择要携带的辅具</option>{options.filter(device=>!deviceIds.includes(device.id)).map(device=><option key={device.id} value={device.id}>{device.name}</option>)}</select></label>
    {selected.length===0&&<p>尚未填写设备类型。先选择辅具，再填写它的尺寸及电池资料。</p>}
    {selected.map(device=><fieldset key={device.id} data-device-id={device.id}><legend>{device.name}</legend>
      <button type="button" aria-label={'移除本次携带的'+device.name} onClick={()=>setDeviceIds(current=>current.filter(value=>value!==device.id))}>移除此设备</button>
      {requiresTravelDimensions(device.type)?<div className="field-grid two">{([['lengthCm','长'],['widthCm','宽'],['heightCm','高']] as const).map(([field,label])=><label key={field} htmlFor={id+'-'+device.id+'-'+field}>{device.name}{label}（cm）<input id={id+'-'+device.id+'-'+field} data-gap-field="dimensions" type="number" min="0.01" step="any" inputMode="decimal" value={specs[device.id]?.[field]??''} onChange={event=>update(device.id,field,event.target.value===''?undefined:Number(event.target.value))}/></label>)}</div>:<p>{device.type==='guide-dog'?'导盲犬不填写设备外廓尺寸，通行材料仍需向运营方核对。':'此类小型或佩戴式辅具无需以三维外廓作为本次清单解锁条件。'}</p>}
      {requiresTravelBattery(device.type)?<label htmlFor={id+'-'+device.id+'-battery'}>{device.name}电池类型<select id={id+'-'+device.id+'-battery'} data-gap-field="batteryType" value={specs[device.id]?.batteryType??''} onChange={event=>update(device.id,'batteryType',event.target.value||undefined)}><option value="">根据铭牌或说明书选择电池类型</option><option value="none">没有电池</option><option value="lithium">锂电池</option><option value="other">其他电池</option></select></label>:<p>此设备不以电池信息作为解锁条件。</p>}
    </fieldset>)}
    <p role="status">{message}</p>
    <div className="travel-task-toolbar"><button type="submit" className="button-primary">保存并更新清单</button><button type="button" onClick={props.onCancel}>取消补充</button></div>
  </form>
}
