import {copyDictionary as c} from './copyDictionary.ts'
import type {CardField,Device,DeviceCard,TravelDeviceSpecs,TravelSpecField} from './types'

export const travelSpecFields: TravelSpecField[]=['lengthCm','widthCm','heightCm','weightKg','folded','batteryType','batteryWh','removable','batteryCount']
export const travelSpecLabels: Record<TravelSpecField,string>={lengthCm:c.c3a592cee8d3f0c05,widthCm:c.c2ebf6e1616732254,heightCm:c.c2bec041336da3f26,weightKg:c.c0939e081280f022c,folded:c.travelFoldedLabel,batteryType:c.ccc64d927855b9fde,batteryWh:c.c9e42f5952acf95f5,removable:c.c4be862ee5fc50de2,batteryCount:c.cc0c73dc664361a97}
export function validTravelSpec(field:TravelSpecField,value:unknown):boolean {
 if(['lengthCm','widthCm','heightCm','weightKg','batteryWh'].includes(field))return typeof value==='number'&&Number.isFinite(value)&&value>0
 if(field==='batteryCount')return value===1||value===2
 if(field==='batteryType')return typeof value==='string'&&['none','lithium','other'].includes(value)
 return typeof value==='string'&&['yes','no'].includes(value)
}
export function sampleDeviceField(device:Device,field?:CardField):boolean {
 const evidence=(device as DeviceCard).evidence
 if(device.sample===true)return true
 const sample=(key:CardField)=>{const item=evidence?.[key],note=typeof item?.note==='string'?item.note:'';return item?.sample===true||note.includes(c.c16febcb7f2806ae6)||Boolean(item?.origin==='plate'&&note.includes(c.c6dde0037aa5ea19c))}
 return field?sample(field):Boolean(evidence&&Object.keys(evidence).length&&Object.keys(evidence).every(key=>sample(key as CardField)))
}
/** Keep ordinary unconfirmed values only as drafts; sample values never enter travel drafts. */
export function deviceTravelSpecs(device:Device):TravelDeviceSpecs {
 const card=device as DeviceCard,values=card.values??{},result:TravelDeviceSpecs={confirmed:{},sampleFields:{}}
 const dimensions=device.dimensions.match(/(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)/)
 const folded=card.transportState==='folded'||(card.transportState===undefined&&values.folded==='yes')
 const foldConsistent=values.folded===undefined||values.folded===(folded?'yes':'no')
 const foldConfirmed=foldConsistent&&card.evidence?.folded?.confirmed===true&&!sampleDeviceField(device,'folded')
 for(const field of travelSpecFields){
  const storedField=(folded&&['lengthCm','widthCm','heightCm'].includes(field)?'fold'+field[0].toUpperCase()+field.slice(1):field) as CardField
  const sampled=sampleDeviceField(device,storedField)
  result.sampleFields![field]=sampled
  result.confirmed![field]=!sampled&&card.evidence?.[storedField]?.confirmed===true&&(field!=='folded'||foldConsistent)&&(!folded||!['lengthCm','widthCm','heightCm'].includes(field)||foldConfirmed)
  if(sampled)continue
  let raw:unknown=values[storedField]
  if(!card.values){if(['lengthCm','widthCm','heightCm'].includes(field))raw=dimensions?.[['lengthCm','widthCm','heightCm'].indexOf(field)+1];if(field==='weightKg')raw=device.weight.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[1];if(field==='batteryType'&&device.battery===c.c484d55613910eb8c)raw='none'}
  if(field==='folded'&&raw===undefined&&folded)raw='yes'
  const value=['lengthCm','widthCm','heightCm','weightKg','batteryWh','batteryCount'].includes(field)?Number(raw):raw
  if(validTravelSpec(field,value))Object.assign(result,{[field]:value})
 }
 return result
}
/** This is the only path from editable drafts into transport checks and task copy. */
export function confirmedTravelSpecs(supplied:TravelDeviceSpecs={},device?:Device):TravelDeviceSpecs {
 const result:TravelDeviceSpecs={}
 for(const field of travelSpecFields){
  const card=device as DeviceCard|undefined,folded=card&&(card.transportState==='folded'||(card.transportState===undefined&&card.values?.folded==='yes'))
  const sourceField=(folded&&['lengthCm','widthCm','heightCm'].includes(field)?'fold'+field[0].toUpperCase()+field.slice(1):field) as CardField
  if(supplied.confirmed?.[field]===true&&supplied.sampleFields?.[field]!==true&&(!device||!sampleDeviceField(device,sourceField))&&validTravelSpec(field,supplied[field]))Object.assign(result,{[field]:supplied[field]})
 }
 return result
}
export function updateTravelSpec(current:TravelDeviceSpecs={},field:keyof TravelDeviceSpecs,value:unknown):TravelDeviceSpecs {
 if(field==='confirmed'){
  const flags=value&&typeof value==='object'?value as Partial<Record<TravelSpecField,boolean>>:{}
  return {...current,confirmed:{...current.confirmed,...Object.fromEntries(travelSpecFields.filter(key=>key in flags).map(key=>[key,flags[key]===true&&current.sampleFields?.[key]!==true&&validTravelSpec(key,current[key])]))}}
 }
 if(!travelSpecFields.includes(field as TravelSpecField))return current
 return {...current,[field]:value,confirmed:{...current.confirmed,[field]:false}}
}
export function sanitizeTravelSpecDraft(raw:TravelDeviceSpecs={},device?:Device,legacy=false):TravelDeviceSpecs {
 const result:TravelDeviceSpecs={confirmed:{},sampleFields:{}}
 for(const field of travelSpecFields){
  const sample=raw.sampleFields?.[field]===true||Boolean(device&&sampleDeviceField(device,field))
  result.sampleFields![field]=sample
  result.confirmed![field]=!legacy&&!sample&&raw.confirmed?.[field]===true&&validTravelSpec(field,raw[field])
  if(!sample&&validTravelSpec(field,raw[field]))Object.assign(result,{[field]:raw[field]})
 }
 return result
}
