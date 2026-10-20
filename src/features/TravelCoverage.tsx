import { getTravelMeta } from '../app/catalog'
import { ruleCurrent, rulesFor, type RuleDocument } from '../app/ruleCatalog'
import type { TravelContext } from '../app/types'
export function TravelCoverage({mode,context,documents,loading,message,onRefresh}:{mode:string;context:TravelContext;documents:RuleDocument[];loading:boolean;message:string;onRefresh:()=>void}){
 const matching=rulesFor(mode,context,documents),when=Math.max(Date.now(),Date.parse(context.journeyDate??'')||0),valid=matching.filter(rule=>ruleCurrent(rule,when))
 return <section className="task-panel" aria-label="当前规则覆盖范围"><h2>先看本次能核验什么</h2><p>已接入：中国铁路国内携带品、国航辅助设备及轮椅电池条款。公交、地铁及其他运营方仍可准备资料，尚未接入其正式规则。</p><p role="status">当前选择：{getTravelMeta(mode).label} · {matching.length?`匹配${matching.length}份来源，其中${valid.length}份在复核期限内。`:'没有匹配的正式来源，本次只能给准备建议和缺项，不能作出携带许可判断。'}</p><p>核验只读取公开页面，不上传你的设备资料。{message}</p><button disabled={loading} onClick={onRefresh}>{loading?'正在核验公开来源……':'更新官方来源与版本'}</button></section>
}
