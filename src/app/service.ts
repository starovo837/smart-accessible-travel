import { apiFetch } from './transport'
export async function service<T>(path:string, input?:unknown, token?:string, signal?:AbortSignal, method?:string):Promise<T> {
  const response=await apiFetch('/api/'+path,{method:method??(input===undefined?'GET':'POST'),cache:'no-store',signal,headers:{'Content-Type':'application/json',...(token?{'X-Sai-Capability':token}:{})},...(input!==undefined?{body:JSON.stringify(input)}:{})})
  const value=await response.json().catch(()=>({error:'服务没有返回有效数据，请检查服务是否正在运行。'}))
  if(!response.ok)throw Error(value.error??'操作没有完成。')
  return value
}
export const prepareService=()=>service('status')
