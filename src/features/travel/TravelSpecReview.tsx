import {useState,useRef,useEffect} from 'react'
import {copyDictionary as c} from '../../app/copyDictionary'
import {sampleDeviceField,travelSpecFields,travelSpecLabels,validTravelSpec} from '../../app/travelSpecEvidence'
import {formatCardValue} from '../../app/journey'
import type {Device,TravelDeviceSpecs} from '../../app/types'

export function TravelSpecReview({devices,specs,onChange,legacy=false}:{devices:Device[];specs:Record<string,TravelDeviceSpecs>;onChange:(id:string,field:keyof TravelDeviceSpecs,value:unknown)=>void;legacy?:boolean}){
 const [message,setMessage]=useState('')
 const root=useRef<HTMLElement>(null),advance=useRef(false)
 useEffect(()=>{if(advance.current){advance.current=false;const next=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-review-confirm]')??[]).find(button=>button.offsetParent!==null);(next??root.current)?.focus()}},[specs])
 const anyPending=devices.some(device=>sampleDeviceField(device)||travelSpecFields.some(field=>validTravelSpec(field,specs[device.id]?.[field])&&specs[device.id]?.confirmed?.[field]!==true))
 if(!anyPending&&!message)return null
 return <section ref={root} tabIndex={-1} aria-label={c.travelReviewHelp} className="task-panel">
  {devices.map(device=>{
   const draft=specs[device.id]??{},pending=travelSpecFields.filter(field=>validTravelSpec(field,draft[field])&&(draft.confirmed?.[field]!==true||draft.sampleFields?.[field]===true))
   if(sampleDeviceField(device))return <article key={device.id}><h3>{device.name}</h3><p>{c.travelSampleBlocked}</p><a href="#device-cards">{c.travelGotoEquipment}</a></article>
   if(!pending.length)return null
   return <article key={device.id}><h3>{device.name} · {c.travelDraftReview}</h3><p>{legacy?c.travelLegacyReview:c.travelReviewHelp}</p><details><summary aria-label={device.name+'，'+c.travelDraftReview+'，'+c.travelReviewOpen}>{c.travelReviewOpen}</summary>
    {pending.map(field=><div className="parameter-edit" key={field}><p>{travelSpecLabels[field]}：{formatCardValue(field,String(draft[field]))} · {c.travelDraftReview}</p>{draft.sampleFields?.[field]===true?<p>{c.travelSampleBlocked}</p>:<button data-review-confirm type="button" aria-label={device.name+'，'+travelSpecLabels[field]+'，'+c.travelDraftReview+'，'+c.travelReviewConfirm} onClick={()=>{advance.current=true;onChange(device.id,'confirmed',{[field]:true});setMessage(device.name+'，'+travelSpecLabels[field]+'，'+c.travelReviewed)}}>{c.travelReviewConfirm}：{travelSpecLabels[field]}</button>}</div>)}
   </details></article>
  })}
  <p role="status">{message}</p>
 </section>
}
