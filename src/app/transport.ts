import { copyDictionary } from './copyDictionary';
import { isPages } from './deployment';

// Session credentials stay in memory. Capability credentials are separate per record.
let studioSession=''
export async function apiFetch(path:string,options:RequestInit={}){
  if (isPages) throw Error(copyDictionary.pagesBackendUnavailable);
  const headers=new Headers(options.headers)
  if(studioSession)headers.set('X-Sai-Session',studioSession)
  // The Studio gateway accepts GET/POST but rejects DELETE before it reaches us.
  const deleting=options.method?.toUpperCase()==='DELETE'
  if(deleting)headers.set('X-Sai-Action','delete')
  const response=await fetch(path,{...options,...(deleting?{method:'POST'}:{}),credentials:'same-origin',headers})
  if(path==='/api/status'&&response.ok){const value=await response.clone().json().catch(()=>null);if(value?.deployment==='studio'&&typeof value.session==='string')studioSession=value.session}
  return response
}
