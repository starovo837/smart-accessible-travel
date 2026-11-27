const endpoint='https://modelscope.cn/openapi/v1'
export function normalizePlatformToken(token){
  const value=typeof token==='string'?token.replace(/^[\s\u200b]+|[\s\u200b]+$/g,''):''
  if(value.length>4096||!/^[-A-Za-z0-9._~+\/]{8,}=*$/.test(value))throw Error('输入内容不是可用的魔搭访问令牌。请点击令牌旁的复制图标，勿复制遮盖圆点、网址或提示文字。输入内容未发送。')
  return value
}
export function platformClient(token,fetcher=fetch){
  token=normalizePlatformToken(token)
  return async(path,{method='GET',body}={})=>{
    if(!path.startsWith('/')||path.includes('://'))throw Error('平台请求路径不正确。')
    const response=await fetcher(endpoint+path,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})
    const value=await response.json().catch(()=>null)
    if(!response.ok||value?.success===false){const error=Error('魔搭请求未完成（'+method+' '+path.split('?')[0]+'，HTTP '+response.status+'）。请检查令牌权限、资源状态或网络。');error.status=response.status;throw error}
    if(value?.data===undefined){
      // Write endpoints may acknowledge success without a data payload.
      if(method!=='GET'&&(response.status===204||value?.success===true))return null
      if(method==='GET'&&path.endsWith('/variables')&&value?.variables!==undefined)return {variables:value.variables}
      throw Error('魔搭响应格式不符合当前接口约定（'+method+' '+path.split('?')[0]+'，HTTP '+response.status+'；字段：'+Object.keys(value??{}).join(',')+'），已停止操作。')
    }
    return value.data
  }
}
export function hardwareOptions(data){
  if(Array.isArray(data))return data
  for(const key of ['hardware','hardwares','items','list'])if(Array.isArray(data?.[key]))return data[key]
  throw Error('无法识别魔搭硬件列表，已保留只读状态，未选择资源。')
}
export function requireFreeHardware(options,name){
  const option=options.find(item=>item.name===name)
  if(!option)throw Error('所选硬件不在账号当前返回的列表中。')
  if(String(name).startsWith('paid/')||option.resource_type==='paid')throw Error('此工具只允许免费资源，已拒绝收费硬件。')
  // Unknown billing is not treated as free. Eligibility is checked again by the platform.
  if(option.resource_type!=='platform'&&option.resource_type!=='free'&&option.resource_type!=='xgpu'&&option.is_free!==true)throw Error('平台未明确给出免费资源属性，已停止部署。请核实硬件计费信息。')
  if(option.available===false||option.enabled===false)throw Error('账号当前不能使用所选资源。')
  return option
}
export function accountName(data){return data?.username??data?.name??data?.user_name}

export async function updateStudioSettingsIfChanged(api,apiPath,current,desired){
  if(current.hardware===desired.hardware&&current.visibility===desired.visibility)return false
  await api(apiPath+'/settings',{method:'PATCH',body:{hardware:desired.hardware,visibility:desired.visibility}})
  return true
}

export async function ensureStudioOrigin(api,apiPath,origin){
  if(origin!=='https://starovo-smart-accessible-travel.ms.show')throw Error('应用域名与本作品不匹配。')
  const data=await api(apiPath+'/variables'),raw=data?.variables??data?.items??data
  let entries
  if(Array.isArray(raw))entries=raw
  else if(raw&&typeof raw==='object')entries=Object.entries(raw).map(([key,value])=>({key,value:typeof value==='object'?value?.value:value}))
  else throw Error('无法识别平台变量列表，已停止配置。')
  const current=entries.find(item=>item.key==='SAI_PUBLIC_ORIGINS')
  if(current?.value===origin)return false
  await api(apiPath+'/variables',{method:current?'PUT':'POST',body:{key:'SAI_PUBLIC_ORIGINS',value:origin}})
  return true
}

// The platform exchanges the already-authorized SDK token for Git's existing login credential.
// Keep the response only in process memory; never persist platform cookies or credentials.
export async function gitCredential(token,owner,fetcher=fetch){
  token=normalizePlatformToken(token)
  const response=await fetcher('https://modelscope.cn/api/v1/login',{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json',Cookie:'m_session_id='+token},body:JSON.stringify({AccessToken:token})})
  const payload=await response.json().catch(()=>null),data=payload?.Data??payload?.data
  if(!response.ok||payload?.Success===false||payload?.success===false||data?.Username!==owner)throw Error('魔搭未返回匹配账号的 Git 上传凭证，请检查令牌写权限。凭证未保存。')
  try{return normalizePlatformToken(data?.AccessToken)}catch{throw Error('魔搭未返回可用的 Git 上传凭证，凭证未保存。')}
}
export function redactPlatformOutput(value,secrets=[]){
  let text=String(value??'')
  for(const secret of secrets.filter(Boolean))text=text.split(secret).join('[REDACTED]')
  return text.replace(/ms-[A-Za-z0-9_-]{12,}/g,'[REDACTED]').replace(/https:\/\/[^\s/]*@/g,'https://[REDACTED]@').slice(-8000)
}
