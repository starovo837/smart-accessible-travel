// Deterministic checks run after model extraction. They validate a claim against
// its quotation, never certify a seller or an image as truthful.
export function modelKey(text: string) {
  const match = text.match(/(?:型号|款型|model)\s*[:：]\s*([A-Za-z][A-Za-z0-9-]{1,30})/i)
  return match?.[1]?.replace(/\s+/g, '').toUpperCase() ?? modelKeys(text)[0] ?? ''
}
export function modelKeys(text:string){return [...new Set([...text.matchAll(/\b([A-Za-z]{1,6}[- ]?\d{1,6}[A-Za-z0-9-]*)\b/g)].filter(match=>!(/^[xX]\s*\d/.test(match[1])&&/\d\s*$/.test(text.slice(0,match.index)))).map(match=>match[1].replace(/\s/g,'').toUpperCase()))]}
export function instructionClaim(quote:string,context:string) {
  const sentences=context.split(/[。！？!?\n]/).filter(text=>text.includes(quote)||quote.includes(text)&&text.trim().length>3)
  return [quote,...sentences].some(text=>/忽略.{0,30}(?:原文|指令|规则|缺项|要求)|(?:请|必须|要求你|命令你).{0,20}(?:回答|声称|执行|输出)|假装|不是商品参数|仅为.{0,8}(?:假设|示例数字)/.test(text))
}
const dimensionUnits = '(毫米|厘米|公分|米|mm|cm|m)'
const massUnits = '(千克|公斤|克|kg|g)'
const scalar = '(\\d+(?:\\.\\d+)?)'
const lengthFactor = (unit: string) => /^(mm|毫米)$/i.test(unit) ? .1 : /^(m|米)$/i.test(unit) ? 100 : 1
const massFactor = (unit: string) => /^(g|克)$/i.test(unit) ? .001 : 1
const equal = (a: number, b: number) => Math.abs(a-b) <= Math.max(1e-6, Math.abs(b)*1e-8)
export function checkNumericClaim(field: string, value: string, unit: string, quote: string, context = '') {
  const expected = /Cm$/.test(field) ? 'cm' : /Kg$/.test(field) ? 'kg' : /Wh$/.test(field) ? 'Wh' : '块'
  let amount = Number(value), validUnit = !unit || unit === expected
  if (/Cm$/.test(field) && /^(mm|cm|m|毫米|厘米|公分|米)$/i.test(unit)) { amount *= lengthFactor(unit); validUnit = true }
  if (/Kg$/.test(field) && /^(g|kg|克|千克|公斤)$/i.test(unit)) { amount *= massFactor(unit); validUnit = true }
  if (/Wh$/.test(field) && /^(Wh|瓦时|瓦特小时)$/i.test(unit)) validUnit = true
  if (field === 'batteryCount' && /^(块|个)$/.test(unit)) validUnit = true
  const result = (ok: boolean, reason: string) => ({ ok: ok && validUnit && Number.isFinite(amount) && amount > 0, value: String(amount), unit: expected, reason: !validUnit ? '模型单位无法可靠换算，请重新提供带单位的依据。' : reason })
  if (/Cm$/.test(field)) {
    const at=context.indexOf(quote),before=at>=0?context.slice(Math.max(0,at-80),at).split(/[。；;\n]/).at(-1)??'':''
    const nearby=before+quote
    const folded=/折叠(?:后|尺寸|长|宽|高|状态)|收纳|收起|收拢|folded/i.test(nearby)
    if (/fold/.test(field) && !folded) return result(false,'没有明确说明是折叠后的尺寸，不能用于折叠状态比较。')
    if (!/fold/.test(field) && folded && !/展开|使用(?:状态|尺寸)/.test(nearby)) return result(false,'这是折叠尺寸，不能作为使用状态的尺寸。')
    const axis = /Width/.test(field) || field === 'widthCm' ? '宽|width' : /Height/.test(field) || field === 'heightCm' ? '高|height' : '长|length'
    const direct = [...quote.matchAll(new RegExp('(?:'+axis+')(?:度)?[：:\\s]*'+scalar+'\\s*'+dimensionUnits, 'gi'))]
    if (direct.length) return result(direct.some(match => equal(amount, Number(match[1])*lengthFactor(match[2]))), '数值与引用中的尺寸不一致。')
    const component='([（(]?\\d+(?:\\.\\d+)?(?:\\s*[-~～–至]\\s*\\d+(?:\\.\\d+)?)?[）)]?)'
    const triple = quote.match(new RegExp(component+'\\s*[×xX*]\\s*'+component+'\\s*[×xX*]\\s*'+component+'\\s*'+dimensionUnits, 'i'))
    const order = (quote+' '+nearby).match(/(长|宽|高|length|width|height)\s*[×xX*、,，/]\s*(长|宽|高|length|width|height)\s*[×xX*、,，/]\s*(长|宽|高|length|width|height)/i)
    if (triple && order) {
      const axes=order.slice(1).map(value=>/长|length/i.test(value)?'length':/宽|width/i.test(value)?'width':'height'),target=/Width/.test(field)||field==='widthCm'?'width':/Height/.test(field)||field==='heightCm'?'height':'length'
      if(new Set(axes).size!==3)return result(false,'尺寸顺序含重复轴，不能采用。')
      const cell=triple[axes.indexOf(target)+1].replace(/[（）()]/g,'')
      if(/[-~～–至]/.test(cell))return result(false,'原文为尺寸范围，不能擅自取一个端点作为精确尺寸。')
      return result(equal(amount,Number(cell)*lengthFactor(triple[4])),'数值与原文明示的尺寸顺序不一致。')
    }
    return result(false, '引用缺少明确尺寸单位或长宽高顺序，不能自动采用。')
  }
  if (/Kg$/.test(field)) {
    const match = quote.match(new RegExp(scalar+'\\s*'+massUnits, 'i'))
    const batteryOnly = /电池(?:重量|重)|battery\s*weight/i.test(quote)
    return result(!!match && /重|weight|mass/i.test(quote) && (field === 'batteryWeightKg' ? batteryOnly : !batteryOnly) && equal(amount, Number(match[1])*massFactor(match[2])), '重量数值、单位或整机／电池口径与引用不一致。')
  }
  if (/Wh$/.test(field)) { const match = quote.match(new RegExp('(?<![A-Za-z])'+scalar+'\\s*(Wh|瓦时|瓦特小时)(?![A-Za-z])','i')); return result(!!match && equal(amount, Number(match[1])), '引用没有对应的明确Wh标称值；不能用V×Ah或续航里程替代。') }
  const match = quote.match(/(?:驱动)?电池[：:\s]*(\d+)\s*(?:块|个)/)
  return result(!!match && equal(amount, Number(match[1])), '引用没有对应的驱动电池数量。')
}
export function checkEnumClaim(field: string, value: string, quote: string) {
  if (field === 'foldHands') return value==='双手' ? /双手|两只手/.test(quote)&&!/不需要双手|无需双手|不用双手|不需双手|不需要两只手/.test(quote) : value==='单手' ? /单手|一只手/.test(quote) && !/不能|无法|不支持|不可|非单手/.test(quote) : false
  if (field === 'batteryType') return value === 'none' ? /无电池|没有电池|不带电池|无需电池/.test(quote) : value === 'lithium' ? /锂/.test(quote)&&!/不是锂|非锂|无锂|不含锂/.test(quote) : value === 'other' ? /铅酸|镍氢|镍镉|锌|碱性|干电池/i.test(quote)&&!/锂/.test(quote) : false
  if (field === 'weightIncludesBattery') return value === 'no' ? /不含电池|未含电池|不包括电池|excluding.*batter/i.test(quote) : value === 'yes' ? /(?:包含|包括|含)(?:蓄)?电池|including.*batter/i.test(quote) && !/不含|未含|不包括/.test(quote) : false
  if (field === 'removable') return value === 'yes' ? /可拆|能拆|可取下|removable/i.test(quote) && !/不可拆|不能拆/.test(quote) : value === 'no' ? /不可拆|不能拆|固定电池|non.removable/i.test(quote) : false
  if (field === 'foldable') return value === 'yes' ? /折叠|fold/i.test(quote) && !/不可折叠|不能折叠/.test(quote) : value === 'no' ? /不可折叠|不能折叠/.test(quote) : false
  return quote.replace(/\s/g,'').includes(value.replace(/\s/g,''))
}
