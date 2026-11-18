import { randomBytes, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const defaultDirectory=process.env.SAI_DATA_DIR||fileURLToPath(new URL('../.app-data/',import.meta.url))
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})}
const hash=value=>createHash('sha256').update(String(value)).digest('hex')
const token=()=>randomBytes(24).toString('base64url')
const clean=(value,max=2000)=>typeof value==='string'?value.trim().slice(0,max):''
const id=prefix=>prefix+'-'+randomBytes(12).toString('hex')
const secretMatches=(secret,digest)=>{const actual=Buffer.from(hash(secret)),expected=Buffer.from(digest);return actual.length===expected.length&&timingSafeEqual(actual,expected)}
export function createWorkspaceService({directory=defaultDirectory,now=()=>Date.now()}={}) {
  let queue=Promise.resolve(),state,key
  async function load(){
    if(state)return state
    await mkdir(directory,{recursive:true})
    try{key=await readFile(path.join(directory,'workspace.key'))}catch(error){if(error.code!=='ENOENT')throw error;key=randomBytes(32);await writeFile(path.join(directory,'workspace.key'),key,{flag:'wx',mode:0o600})}
    try{const data=JSON.parse(await readFile(path.join(directory,'workspace.enc'),'utf8')),decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(data.iv,'base64'));decipher.setAuthTag(Buffer.from(data.tag,'base64'));state=JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.data,'base64')),decipher.final()]).toString('utf8'))}catch(error){if(error.code!=='ENOENT')throw Error('协作资料无法读取，未覆盖原记录。');state={cases:[],shares:[]}}
    return state
  }
  async function save(){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([cipher.update(JSON.stringify(state)),cipher.final()]);await writeFile(path.join(directory,'workspace.enc.tmp'),JSON.stringify({iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')}),{mode:0o600});await rename(path.join(directory,'workspace.enc.tmp'),path.join(directory,'workspace.enc'))}
  const mutate=fn=>{const work=queue.then(async()=>{await load();state.shares=state.shares.filter(item=>!item.revoked&&item.expiresAt>now());state.cases=state.cases.filter(item=>!item.expiresAt||item.expiresAt>now());const result=await fn(state);await save();return result});queue=work.catch(()=>{});return work}
  const purgeTimer=setInterval(()=>void mutate(()=>({purged:true})).catch(()=>{}),3600000);purgeTimer.unref()
  const event=(actor,text,status)=>({at:new Date(now()).toISOString(),actor,text,status})
  const publicCase=record=>{const{capHash,...visible}=record;return visible}
  const authCase=(data,key,secret)=>{const record=data.cases.find(item=>item.id===key&&(!item.expiresAt||item.expiresAt>now()));if(!record||!secretMatches(secret,record.capHash))fail('没有访问这条纠错记录的权限，或记录已到期。',record?403:404);return record}
  const authShare=(data,key,secret,owner=false)=>{const record=data.shares.find(item=>item.id===key);if(!record||!secretMatches(secret,owner?record.ownerHash:record.viewHash))fail('分享凭据无效。',403);if(record.revoked||record.expiresAt<=now())fail('分享已到期或撤销。',410);return record}
  const publicShare=record=>({id:record.id,recipient:record.recipient,expiresAt:record.expiresAt,revision:record.revision,payload:record.payload,proposals:record.proposals,updatedAt:record.updatedAt,permissions:record.permissions})
  const payloadOf=(input,scopes)=>{
    const payload={}
    if(scopes.includes('devices'))payload.devices=(Array.isArray(input.devices)?input.devices:[]).slice(0,30).map(card=>({id:clean(card.id,100),name:clean(card.name,120),values:Object.fromEntries(Object.entries(card.values??{}).filter(([field])=>/^(lengthCm|widthCm|heightCm|weightKg|foldLengthCm|foldWidthCm|foldHeightCm|batteryWh|batteryType|removable|batteryCount)$/.test(field)).map(([field,value])=>[field,clean(value,80)])),evidence:Object.fromEntries(Object.entries(card.evidence??{}).filter(([field])=>/^(lengthCm|widthCm|heightCm|weightKg|foldLengthCm|foldWidthCm|foldHeightCm|batteryWh|batteryType|removable|batteryCount)$/.test(field)).map(([field,value])=>[field,{confirmed:value?.confirmed===true}]))}))
    if(scopes.includes('records'))payload.records=(Array.isArray(input.records)?input.records:[]).slice(0,30).map(record=>({id:clean(record.id,100),carrier:clean(record.carrier,120),itinerary:clean(record.itinerary,160),date:clean(record.date,30),reply:clean(record.reply)}))
    if(scopes.includes('checklist'))payload.checklist=(Array.isArray(input.checklist)?input.checklist:[]).slice(0,50).map(item=>({id:clean(item.id,100),label:clean(item.label,160),detail:clean(item.detail,500),checked:item.checked===true}))
    return payload
  }
  return {
    async createCase(input){if(input.consent!==true)fail('请先同意把这次纠错内容交给当前服务处理。');const accessToken=token();return mutate(data=>{if(data.cases.length>=500)fail('待处理记录已达上限，请联系处理人。',429);const text=clean(input.text),subject=clean(input.subject,160);if(!text||!subject)fail('请填写问题和对应项目。');const record={id:id('case'),capHash:hash(accessToken),subject,text,status:'submitted',createdAt:new Date(now()).toISOString(),expiresAt:now()+30*86400000,revision:1,events:[event('提交人','问题已交给当前服务，等待处理。','submitted')]};data.cases.push(record);return {...publicCase(record),accessToken}})},
    async getCase(key,secret){const data=await load();return publicCase(authCase(data,key,secret))},
    async replyCase(key,secret,input){return mutate(data=>{const record=authCase(data,key,secret),text=clean(input.text);if(!text)fail('请填写补充依据。');record.events.push(event('提交人',text,'submitted'));record.status='submitted';record.revision++;return publicCase(record)})},
    async deleteCase(key,secret){return mutate(data=>{if(!data.cases.some(item=>item.id===key))return {deleted:true};authCase(data,key,secret);data.cases=data.cases.filter(item=>item.id!==key);return {deleted:true}})},
    async reviewCases(){const data=await load();return data.cases.filter(item=>!item.expiresAt||item.expiresAt>now()).map(publicCase)},
    async reviewCase(key,input){return mutate(data=>{const record=data.cases.find(item=>item.id===key);if(!record)fail('没有这条记录。',404);if(input.revision!==record.revision)fail('记录已有更新，请刷新后再处理。',409);if(!['reviewing','needs-info','resolved','closed'].includes(input.status))fail('处理状态不正确。');const reviewer=clean(input.reviewer,40),note=clean(input.note);if(!reviewer||!note)fail('请填写处理人和核查说明。');if(input.status==='resolved'&&!clean(input.reference,500))fail('完成处理必须提供依据、修正版本或明确的核查结论。');record.status=input.status;record.revision++;record.events.push(event(reviewer,note+(input.reference?'\n依据／版本：'+clean(input.reference,500):''),record.status));return publicCase(record)})},
    async createShare(input){if(input.consent!==true)fail('请先确认本次要共享的内容和范围。');const scopes=[...new Set(input.scopes??[])].filter(value=>['devices','records','checklist'].includes(value));if(!scopes.length)fail('至少选择一项共享内容。');const ownerToken=token(),viewToken=token();return mutate(data=>{data.shares=data.shares.filter(item=>item.expiresAt>now()&&!item.revoked);if(data.shares.length>=100)fail('有效分享数量已达上限。',429);const days=[1,3,7].includes(input.days)?input.days:1;const record={id:id('share'),ownerHash:hash(ownerToken),viewHash:hash(viewToken),scopes,recipient:clean(input.recipient,60),permissions:input.allowSuggestions===true?'suggest':'view',payload:payloadOf(input.payload??{},scopes),expiresAt:now()+days*86400000,revoked:false,revision:1,proposals:[],updatedAt:new Date(now()).toISOString()};data.shares.push(record);return {...publicShare(record),ownerToken,viewToken}})},
    async getShare(key,secret,owner=false){return publicShare(authShare(await load(),key,secret,owner))},
    async deleteShare(key,secret){return mutate(data=>{const record=data.shares.find(item=>item.id===key);if(!record)return {deleted:true};if(!secretMatches(secret,record.ownerHash))fail('分享管理凭据无效。',403);data.shares=data.shares.filter(item=>item.id!==key);return {deleted:true}})},
    async updateShare(key,secret,input){return mutate(data=>{const record=authShare(data,key,secret,true);if(input.revision!==record.revision)fail('共享内容已更新，请先刷新。',409);if(input.revoke===true){record.revoked=true;record.payload={};record.proposals=[];return {revoked:true}}if(input.payload)record.payload=payloadOf(input.payload,record.scopes);if(Array.isArray(input.acceptedIds))record.proposals=record.proposals.filter(item=>!input.acceptedIds.includes(item.itemId));record.revision++;record.updatedAt=new Date(now()).toISOString();return publicShare(record)})},
    async suggest(key,secret,input){return mutate(data=>{const record=authShare(data,key,secret);if(record.permissions!=='suggest'||!record.scopes.includes('checklist'))fail('该分享只允许查看。',403);if(input.revision!==record.revision)fail('清单已有更新，请刷新后再建议。',409);if(!record.payload.checklist?.some(item=>item.id===input.itemId))fail('没有这项清单。');const proposal={itemId:input.itemId,checked:input.checked===true,at:new Date(now()).toISOString()};record.proposals=[...record.proposals.filter(item=>item.itemId!==input.itemId),proposal];record.revision++;record.updatedAt=proposal.at;return publicShare(record)})},
  }
}
export const workspaceService=createWorkspaceService()
