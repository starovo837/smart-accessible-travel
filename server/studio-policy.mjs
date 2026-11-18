import { normalizeAddress } from './request-sessions.mjs'

export function studioPolicy(env=process.env){
  const enabled=env.SAI_DEPLOYMENT==='studio'
  const origins=String(env.SAI_PUBLIC_ORIGINS??'').split(',').map(value=>value.trim()).filter(Boolean).map(value=>{const url=new URL(value);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('公开来源必须是HTTPS网址。');if(url.pathname!=='/'||url.search||url.hash)throw Error('公开来源只填写协议和域名。');return url.origin})
  const trustedProxies=String(env.SAI_TRUSTED_PROXY_IPS??'').split(',').map(value=>value.trim()).filter(Boolean).map(value=>{
    const address=normalizeAddress(value)
    if(!address)throw Error('受信代理必须填写明确的 IP 地址。')
    return address
  })
  return {enabled,origins,trustedProxies}
}
export function allowedRequest(req,policy){
  const origin=req.headers.origin,host=String(req.headers.host??'')
  if(!policy.enabled)return !origin||origin===`http://${host}`||origin===`https://${host}`
  if(req.headers['sec-fetch-site']==='cross-site')return false
  // No forwarded header can independently authorize an Origin.
  return !origin||policy.origins.includes(origin)||origin===`https://${host}`||(['127.0.0.1','localhost'].includes(host.split(':')[0])&&origin===`http://${host}`)
}
