import { useState, type Dispatch, type SetStateAction } from 'react'
import { readText, stopReading } from '../app/accessibility'
import { checkEnumClaim, checkNumericClaim } from '../app/evidence'
import { inSelectedModel, type ProductFact } from '../app/product'
import type { ProductAnalysis } from '../app/types'

export function EvidenceReview({product,setProduct}:{product:ProductAnalysis;setProduct:Dispatch<SetStateAction<ProductAnalysis>>}) {
  const insight=product.insight!, [factId,setFactId]=useState(''),[method,setMethod]=useState('厂家可访问文字'),[basis,setBasis]=useState(''),[notice,setNotice]=useState('')
  const groups=[...new Set(insight.facts.map(fact=>fact.modelKey||''))]
  const images=insight.sources.filter(source=>source.image||source.transcript)
  const candidates=insight.facts.filter(fact=>inSelectedModel(insight,fact)&&fact.verification==='image')
  const fact=candidates.find(item=>item.id===factId)
  const confirm=()=>{
    if(!fact||!basis.trim())return
    const numeric=/Cm$|Kg$|Wh$/.test(fact.field)||fact.field==='batteryCount'
    const matches=numeric?checkNumericClaim(fact.field,fact.value,fact.unit,basis).ok:checkEnumClaim(fact.field,fact.value,basis)
    if(!matches){setNotice('补充依据与这项参数不一致或缺少单位，尚未确认。请先核对或返回补充资料重新解读。');return}
    setProduct(current=>({...current,insight:current.insight?{...current.insight,facts:current.insight.facts.map(item=>item.id===fact.id?{...item,confirmed:true,reviewMethod:method,independentQuote:basis.trim().slice(0,800)}:item)}:undefined}))
    setNotice('已记录本人提供的独立复核依据；不表示平台或厂家已替你认证。');setBasis('')
  }
  return <section className="intake-panel" aria-label="型号与可访问复核">
    <h2>先确认资料对应哪一款</h2>
    <label>本次采用的型号／规格<select value={insight.selectedModel??groups[0]??''} onChange={event=>setProduct(current=>({...current,insight:current.insight?{...current.insight,selectedModel:event.target.value,resolutions:{}}:undefined}))}>{groups.map(key=><option key={key} value={key}>{key||'未标注型号（请补充确认）'}</option>)}</select></label>
    {groups.length>1&&<p role="status">资料包含不同或未标注的型号。这里只比较所选组，其他组不会混入计算；切换后需重新处理矛盾。</p>}
    {insight.facts.filter(item=>item.verification==='unverified').length>0&&<details><summary>查看未通过校验的项目</summary>{insight.facts.filter(item=>item.verification==='unverified').map(item=><p key={item.id}><strong>{item.label}：{item.value} {item.unit}</strong>。{item.validationNote||'未找到支持这项结论的原文。'}不参与计算。</p>)}</details>}
    {images.map(source=><details key={source.id}><summary>逐行阅读图片文字：{source.name}</summary><p>这是AI转写，并非独立复核。模型对清晰度的提示：{source.imageQuality==='clear'?'可读，仍可能误识别':source.imageQuality==='unreadable'?'难以辨认，请重拍':'部分不确定，请补充可访问文字'}。</p>{source.transcript?<><button onClick={()=>readText(source.transcript!)}>朗读整份转写</button><button onClick={stopReading}>停止朗读</button><ol>{source.transcript.split(/\n+/).filter(Boolean).map((line,index)=><li key={index}>{line}<button aria-label={`朗读第${index+1}行`} onClick={()=>readText(line)}>朗读此行</button></li>)}</ol></>:<p>本次没有获得完整转写。请补充厂家文字说明，或重新上传清晰、正对、包含型号和单位的参数页。</p>}<p>无法看图时，可自行补充厂家文字、本人实测记录，或由你授权的协助者核对；不要求只能看原图。</p></details>)}
    {candidates.length>0&&<details><summary>用独立依据复核图片参数</summary><p>不要把上面的AI转写当成第二份证据。请提供另行取得的说明书文字、实际测量记录或授权协助者的核对记录。</p><label>需要复核的项目<select value={factId} onChange={event=>setFactId(event.target.value)}><option value="">请选择</option>{candidates.map(item=><option key={item.id} value={item.id}>{item.label}：{item.value} {item.unit}{item.confirmed?'（已记录复核）':''}</option>)}</select></label><label>复核方式<select value={method} onChange={event=>setMethod(event.target.value)}>{['厂家可访问文字','本人实测','本人授权协助者核对'].map(item=><option key={item}>{item}</option>)}</select></label><label>独立依据原文（保留参数名称与单位）<textarea value={basis} maxLength={800} onChange={event=>setBasis(event.target.value)} placeholder="例如：说明书写明使用宽度63cm"/></label><button disabled={!fact||!basis.trim()} onClick={confirm}>核对一致，记录本人确认</button></details>}
    <p role="status">{notice}</p>
  </section>
}
