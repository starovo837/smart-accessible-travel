import type { ProductAnalysis } from './types'
import type { ProductSource } from './product'
import { apiFetch } from './transport'
export async function analyzeSources(sources:ProductSource[],signal:AbortSignal):Promise<ProductAnalysis> {
  const response=await apiFetch('/api/product/analyze',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({sources,consent:true})})
  let payload:{analysis?:ProductAnalysis;error?:string}
  try {payload=await response.json()}catch{throw Error('模型服务未正确响应，请稍后重试。资料仍保留在本页。')}
  if(!response.ok||!payload.analysis?.insight)throw Error(payload.error||'本次解读未完成，没有生成AI结论。')
  return {...payload.analysis,insight:{...payload.analysis.insight,sources:sources.map(source=>({...source,...payload.analysis!.insight!.sources.find(item=>item.id===source.id),image:source.image}))}}
}
