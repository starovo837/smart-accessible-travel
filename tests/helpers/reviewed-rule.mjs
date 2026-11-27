// Synthetic evidence only. Never write these records to deployment/ or app data.
import {inspectRule,approveRule} from '../../server/rule-service.mjs'
export function reviewedRule(rule,now=Date.now(),body=rule.excerpts.map(row=>row.text).join(' ')){
 const inspected=inspectRule(rule,body,now)
 return approveRule(inspected,{reviewer:'合成审核人-仅用于测试',note:'合成文本测试，不是人工核验生产条款。',hash:inspected.pendingHash},now)
}
