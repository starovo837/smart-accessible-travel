import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})}
const digest=value=>createHash('sha256').update(String(value??'')).digest()
const matches=(value,expected)=>timingSafeEqual(digest(value),expected)
const secret=()=>randomBytes(24).toString('base64url')
const onlyKeys=(input,keys)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))fail('求助资料包含不支持的字段；不会上传个人档案、证件或病历。')}
const text=(input,label,max,required=false)=>{if(typeof input!=='string'||input.length>max)fail(`${label}格式不正确或超过${max}字。`);const value=input.trim();if(required&&!value)fail(`请填写${label}。`);return value}

function locationOf(input){
 if(input===undefined||input===null)return undefined
 onlyKeys(input,['label','latitude','longitude'])
 const label=input.label===undefined?'':text(input.label,'位置说明',200)
 const supplied=input.latitude!==undefined||input.longitude!==undefined
 if(supplied&&(!Number.isFinite(input.latitude)||input.latitude< -90||input.latitude>90||!Number.isFinite(input.longitude)||input.longitude< -180||input.longitude>180))fail('位置坐标无效。')
 if(!label&&!supplied)return undefined
 return {label,...(supplied?{latitude:input.latitude,longitude:input.longitude}:{})}
}

// Short-lived, capability-scoped requests. There is no dispatch, messaging or
// rescue claim here: only a recipient's explicit response is a real receipt.
export function createHelpService({now=Date.now,capacity=500}={}){
 const records=new Map()
 const sweep=()=>{const current=now();for(const[id,record]of records)if(record.expiresAt<=current)records.delete(id)}
 const timer=setInterval(sweep,60000);timer.unref?.()
 const get=(id,token,owner=false)=>{
  const record=records.get(id)
  if(!record||!matches(token,owner?record.ownerHash:record.viewHash))fail('求助链接或管理凭据无效。',403)
  if(record.expiresAt<=now()){records.delete(id);fail('求助链接已到期，无法继续查看。',410)}
  return record
 }
 const visible=record=>({id:record.id,text:record.text,recipientLabel:record.recipientLabel,...(record.location?{location:{...record.location}}:{}),createdAt:record.createdAt,expiresAt:record.expiresAt,status:record.status,...(record.response?{response:{...record.response}}:{})})
 return {
  create(input){
   onlyKeys(input,['text','recipientLabel','location','minutes','consent','previewed'])
   if(input.consent!==true||input.previewed!==true)fail('请先预览，并同意将这次选定的求助内容暂存到当前服务。')
   if(![15,30,60].includes(input.minutes))fail('有效期只能选择15、30或60分钟。')
   const message=text(input.text,'求助内容',1000,true),recipientLabel=text(input.recipientLabel??'','接收对象称呼',60),location=locationOf(input.location)
   sweep();if(records.size>=capacity)fail('当前求助数量较多，请稍后再试。',429)
   const ownerToken=secret(),viewToken=secret(),createdAt=now(),id='help-'+randomBytes(12).toString('hex')
   const record={id,text:message,recipientLabel,location,createdAt,expiresAt:createdAt+input.minutes*60000,status:'waiting',ownerHash:digest(ownerToken),viewHash:digest(viewToken)}
   records.set(id,record)
   return {...visible(record),ownerToken,viewToken}
  },
  read(id,viewToken){return visible(get(id,viewToken))},
  readOwner(id,ownerToken){return visible(get(id,ownerToken,true))},
  acknowledge(id,viewToken,input){
   onlyKeys(input,['response','name'])
   if(!['acknowledged','declined'].includes(input.response))fail('请选择明确回应或暂时无法协助。')
   const name=text(input.name??'','接收方称呼',40),record=get(id,viewToken)
   if(record.response){if(record.response.status===input.response&&record.response.name===name)return visible(record);fail('此链接已有回执，不能覆盖；请联系发起人确认。',409)}
   record.status=input.response;record.response={status:input.response,name,at:now()}
   return visible(record)
  },
  revoke(id,ownerToken){
   const record=records.get(id)
   if(!record)return {revoked:true}
   if(!matches(ownerToken,record.ownerHash))fail('求助管理凭据无效。',403)
   records.delete(id)
   return {revoked:true}
  },
  dispose(){clearInterval(timer);records.clear()}
 }
}
export const helpService=createHelpService()
