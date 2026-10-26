const fail=(text,status=400)=>{throw Object.assign(Error(text),{status})}
export function validateFacilityQuery(input){
 if(input?.consent!==true)fail('请先确认将本次坐标用于在线设施查询。')
 const lat=input.latitude,lon=input.longitude,radius=input.radius??1000
 if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -85||lat>85||lon< -180||lon>180||![500,1000,2000].includes(radius))fail('请填写有效WGS84坐标，并选择支持的查询范围。')
 return {latitude:lat,longitude:lon,radius}
}
export function normalizeFacilityElements(raw,at=new Date().toISOString()){
 if(!Array.isArray(raw?.elements))fail('地图服务没有返回有效设施记录。',502)
 return raw.elements.slice(0,80).flatMap(element=>{
  if(!element||typeof element!=='object')return []
  const lat=element.lat??element.center?.lat,lon=element.lon??element.center?.lon,t=element.tags??{}
  if(!['node','way','relation'].includes(element.type)||!Number.isSafeInteger(element.id)||element.id<=0||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return []
  const kind=t.highway==='elevator'?'电梯位置':t.amenity==='toilets'?'厕所位置':t.entrance?'出入口':'已标记地点'
  return [{id:'osm-'+element.type+'-'+element.id,name:String(t['name:zh']??t.name??kind).slice(0,120),address:[t['addr:city'],t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ').slice(0,250),latitude:lat,longitude:lon,kind,wheelchair:['yes','limited','no'].includes(t.wheelchair)?t.wheelchair:'unknown',sourceUrl:'https://www.openstreetmap.org/'+element.type+'/'+element.id,source:'OpenStreetMap贡献者',sourceCheckedAt:String(t['check_date:wheelchair']??t.check_date??'').slice(0,40),fetchedAt:at,notes:[kind,t.wheelchair?'OSM轮椅标签：'+t.wheelchair:'未提供轮椅标签',t.opening_hours?'开放时间原文：'+String(t.opening_hours).slice(0,200):'开放时间未提供','地图标记不代表设施现在可用；门宽、台阶和电梯运行需另行核实。'].join('；')}]
 })
}
export function createFacilityService({fetcher=fetch,now=Date.now}={}){
 const cache=new Map();let active=false,last=-Infinity
 return async input=>{
  const {latitude,longitude,radius}=validateFacilityQuery(input),key=[latitude.toFixed(4),longitude.toFixed(4),radius].join(',')
  const cached=cache.get(key);if(cached&&cached.expires>now())return cached.value
  if(active||now()-last<3000)fail('地图服务正在查询，请稍后再试。',429)
  active=true;last=now()
  try{
   const around=`around:${radius},${latitude},${longitude}`,query=`[out:json][timeout:12];(nwr(${around})["wheelchair"];nwr(${around})["amenity"="toilets"];nwr(${around})["highway"="elevator"];);out center tags 80;`
   const response=await fetcher('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'SmartAccessibleTravel/0.1 (+https://modelscope.cn/studios/starovo/smart-accessible-travel)'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(16000)})
   if(!response.ok)fail('在线设施服务暂不可用。可继续打开高德/百度地图，或填写自己的设施记录。',502)
   const buffer=await response.arrayBuffer();if(buffer.byteLength>2*1024*1024)fail('地图结果过大，请缩小查询范围。',502)
   let raw;try{raw=JSON.parse(new TextDecoder().decode(buffer))}catch{fail('地图服务本次没有返回有效结果。',502)}
   const value={facilities:normalizeFacilityElements(raw,new Date(now()).toISOString()),source:'OpenStreetMap / Overpass API',license:'ODbL',sourceUrl:'https://www.openstreetmap.org/copyright',fetchedAt:new Date(now()).toISOString()}
   for(const [k,v]of cache)if(v.expires<=now())cache.delete(k);if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{expires:now()+600000,value});return value
  }catch(error){if(error.status)throw error;fail('在线地图查询超时或网络未连通，未生成模拟设施。可改用国内地图入口。',502)}finally{active=false}
 }
}
