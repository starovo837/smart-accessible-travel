// Session credentials stay in memory. Capability credentials are separate per record.
let studioSession=''
export async function apiFetch(path:string,options:RequestInit={}){
  const headers=new Headers(options.headers)
  if(studioSession)headers.set('X-Sai-Session',studioSession)
  const response=await fetch(path,{...options,credentials:'same-origin',headers})
  if(path==='/api/status'&&response.ok){const value=await response.clone().json().catch(()=>null);if(value?.deployment==='studio'&&typeof value.session==='string')studioSession=value.session}
  return response
}
