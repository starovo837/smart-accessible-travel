import { getTravelMeta } from '../app/catalog'
import { ruleCurrent, rulesFor, type RuleDocument } from '../app/ruleCatalog'
import type { TravelContext } from '../app/types'
import { travelPlanSources } from '../app/travelPlanSources'
export function TravelCoverage({mode,context,documents,loading,message,onRefresh}:{mode:string;context:TravelContext;documents:RuleDocument[];loading:boolean;message:string;onRefresh:()=>void}){
 const matching=rulesFor(mode,context,documents),when=Math.max(Date.now(),Date.parse(context.journeyDate??'')||0),valid=matching.filter(rule=>ruleCurrent(rule,when))
 return <section className="task-panel" aria-label="当前规则覆盖范围"><h2>依据与行动如何区分</h2><p>当前方式：{getTravelMeta(mode).label}。已整理 {Object.keys(travelPlanSources).length} 个铁路、航空、城市交通及监督渠道的官方入口。站内设施和具体运输安排仍需逐项向运营方核实。</p><p role="status">{matching.length?`设备条款匹配${matching.length}份，其中${valid.length}份在复核期限内。历史条款保留原文，并附官方核验入口。`:'没有专用设备条款时，仍会生成联系运营方、安排协助、进出站和替代接驳的五段清单。'}</p><p>每条行动标明依据等级、更新时间和官方入口。{message}</p><button disabled={loading} onClick={onRefresh}>{loading?'正在核验公开来源……':'更新官方来源与版本'}</button></section>
}
