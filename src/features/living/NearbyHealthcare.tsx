import {useEffect,useRef,useState} from 'react'
import {Icon} from '../../components/Icons'
import {prepareService,service} from '../../app/service'
import {buildHospitalPlaceMapLinks,buildHospitalRegionMapLinks,buildNearbyHospitalMapLinks,formatHospitalDistance,HOSPITAL_SEARCH_RADII,type HospitalSearchRadius,type NearbyHealthcareResult,type NearbyHospital,type Wgs84Location} from '../../app/nearbyHealthcare'
import './nearby-healthcare.css'

export function NearbyHealthcare({onChoose}:{onChoose:(hospital:NearbyHospital)=>void}){
 const [position,setPosition]=useState<Wgs84Location|null>(null),[radius,setRadius]=useState<HospitalSearchRadius>(2000),[result,setResult]=useState<NearbyHealthcareResult|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[region,setRegion]=useState(''),[manual,setManual]=useState(false)
 const epoch=useRef(0),request=useRef<AbortController|null>(null),lock=useRef(false)
 useEffect(()=>()=>{epoch.current++;request.current?.abort()},[])
 const finish=(version:number)=>{if(version===epoch.current){lock.current=false;setBusy(false)}}
 const query=async(point:Wgs84Location,version:number)=>{
  const controller=new AbortController();request.current?.abort();request.current=controller
  setMessage('正在按这次位置查找附近医院…');setResult(null)
  try{await prepareService();controller.signal.throwIfAborted();const data=await service<NearbyHealthcareResult>('healthcare/nearby',{...point,radius,consent:true},undefined,controller.signal);if(version===epoch.current){setResult(data);setMessage(data.hospitals.length?`找到${data.hospitals.length}条医院或诊所地图记录，已按距离排列。`:data.notice)}}
  catch(error){if(version===epoch.current&&(error as Error).name!=='AbortError')setMessage((error as Error).message)}finally{finish(version)}
 }
 const locate=()=>{
  if(lock.current)return
  if(!navigator.geolocation||!window.isSecureContext){setMessage('此浏览器或当前连接不能定位。手机通常需要HTTPS，可改填城市、区县或街道查找。');setManual(true);return}
  const version=++epoch.current;lock.current=true;setBusy(true);setResult(null);setPosition(null);setMessage('请在浏览器提示中选择是否允许这一次定位。')
  navigator.geolocation.getCurrentPosition(value=>{if(version!==epoch.current)return;const point={latitude:Math.round(value.coords.latitude*1e6)/1e6,longitude:Math.round(value.coords.longitude*1e6)/1e6};setPosition(point);void query(point,version)},error=>{if(version!==epoch.current)return;setMessage(error.code===1?'你没有允许定位。可以手动填写城市或地区，仍能查找医院。':'这次未能取得位置，请重试或手动填写地区。');setManual(true);finish(version)},{enableHighAccuracy:false,timeout:12000,maximumAge:0})
 }
 const clear=()=>{epoch.current++;request.current?.abort();lock.current=false;setBusy(false);setPosition(null);setResult(null);setMessage('已移除这次位置和查询结果。')}
 const nearbyLinks=position?buildNearbyHospitalMapLinks(position,radius):[],regionLinks=buildHospitalRegionMapLinks(region)
 return <section className="nearby-healthcare" aria-labelledby="nearby-healthcare-title"><div className="nearby-heading"><span aria-hidden="true"><Icon name="hospital" size={27}/></span><div><h2 id="nearby-healthcare-title">先找附近的医院</h2><p>按你的位置查找，选择由你决定。</p></div></div>
  <p id="hospital-location-explanation">点击下方按钮才会请求一次位置权限；允许后，将本次坐标用于当前服务和OpenStreetMap附近查询。不持续追踪，也不附带你的身体或病情资料。</p>
  <label>附近查找范围<select aria-label="附近查找范围" value={radius} disabled={busy} onChange={event=>{setRadius(Number(event.target.value) as HospitalSearchRadius);setResult(null)}}>{HOSPITAL_SEARCH_RADII.map(value=><option key={value} value={value}>{value/1000}公里</option>)}</select></label>
  <button className="nearby-location-button" disabled={busy} onClick={locate} aria-describedby="hospital-location-explanation"><Icon name="map-pin" size={21}/>{busy?'正在查找…':'定位一次，查附近医院'}</button>
  <div className="living-actions nearby-secondary-actions"><button disabled={busy} onClick={()=>setManual(value=>!value)} aria-expanded={manual} aria-controls="hospital-region-search">{manual?'收起地区输入':'手动选择城市或地区'}</button>{(busy||position)&&<button onClick={clear}>{busy?'取消这次查询':'移除这次位置'}</button>}</div>
  {manual&&<div id="hospital-region-search" className="hospital-region-search"><label>城市、区县或街道<input value={region} maxLength={120} onChange={event=>setRegion(event.target.value)} placeholder="填写你要就医的地区" autoComplete="address-level2"/></label><p>不需要定位。点击地图链接时只发送这里填写的地区。</p><div className="living-actions">{regionLinks.map(link=><a key={link.provider} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.label} ↗</a>)}</div></div>}
  <p className="nearby-status" role="status">{message}</p>
  {position&&<section className="hospital-domestic-maps"><h3>也可以直接用国内地图</h3><p>已取得一次位置。点击地图入口才会把本次坐标交给所选平台；服务方页面可继续查看医院和预约渠道。</p><div className="living-actions">{nearbyLinks.map(link=><a key={link.provider} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.label} ↗</a>)}</div><p className="living-meta">高德入口标出本次位置，可在图内搜索附近医院。</p>{!busy&&<button onClick={()=>{if(lock.current)return;const version=++epoch.current;lock.current=true;setBusy(true);void query(position,version)}}>按所选范围重新查找</button>}</section>}
  {result&&<section className="hospital-results"><h3>附近医院与诊所</h3><p>{result.notice}</p>{result.hospitals.map(hospital=><article className="nearby-hospital-card" key={hospital.id}><div className="hospital-card-title"><h4>{hospital.name}</h4><span>{formatHospitalDistance(hospital.distanceMeters)}</span></div><p>{hospital.categoryLabel} · {hospital.address||'详细地址请在地图原始记录或医院渠道核对'}</p><p className="living-meta">{hospital.source} · 读取于 {new Date(hospital.fetchedAt).toLocaleString('zh-CN')}</p><div className="living-actions">{buildHospitalPlaceMapLinks(hospital).map(link=><a key={link.provider} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.label} ↗</a>)}<button onClick={()=>onChoose(hospital)}>选这家，准备就医需求</button></div><a className="hospital-source" href={hospital.sourceUrl} target="_blank" rel="noopener noreferrer">查看原始地图记录 ↗</a></article>)}</section>}
 </section>
}
