import { copyDictionary } from "./copyDictionary.ts";
// Deterministic checks run after model extraction. They validate a claim against
// its quotation, never certify a seller or an image as truthful.
export function modelKey(text: string) {
    const match = text.match(/(?:型号|款型|model)\s*[:：]\s*([A-Za-z][A-Za-z0-9-]{1,30})/i);
    return match?.[1]?.replace(/\s+/g, '').toUpperCase() ?? modelKeys(text)[0] ?? '';
}
export function modelKeys(text: string) { return [...new Set([...text.matchAll(/\b([A-Za-z]{1,6}[- ]?\d{1,6}[A-Za-z0-9-]*)\b/g)].filter(match => !(/^[xX]\s*\d/.test(match[1]) && /\d\s*$/.test(text.slice(0, match.index)))).map(match => match[1].replace(/\s/g, '').toUpperCase()))]; }
export function instructionClaim(quote: string, context: string) {
    const sentences = context.split(/[。！？!?\n]/).filter(text => text.includes(quote) || quote.includes(text) && text.trim().length > 3);
    return [quote, ...sentences].some(text => /忽略.{0,30}(?:原文|指令|规则|缺项|要求)|(?:请|必须|要求你|命令你).{0,20}(?:回答|声称|执行|输出)|假装|不是商品(?:参数|资料)|仅为.{0,8}(?:假设|示例数字)/.test(text.replace(/\s+/g,'')));
}
const dimensionUnits = copyDictionary.cccd80b8f42fa4411;
const massUnits = copyDictionary.c2590e7220ea47a97;
const scalar = '(\\d+(?:\\.\\d+)?)';
const lengthFactor = (unit: string) => /^(mm|毫米)$/i.test(unit) ? .1 : /^(m|米)$/i.test(unit) ? 100 : 1;
const massFactor = (unit: string) => /^(g|克)$/i.test(unit) ? .001 : 1;
const equal = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-8);
export function checkNumericClaim(field: string, value: string, unit: string, quote: string, context = '') {
    const expected = /Cm$/.test(field) ? 'cm' : /Kg$/.test(field) ? 'kg' : /Wh$/.test(field) ? 'Wh' : copyDictionary.c36d89c8f512d8cce;
    let amount = Number(value), validUnit = !unit || unit === expected;
    if (/Cm$/.test(field) && /^(mm|cm|m|毫米|厘米|公分|米)$/i.test(unit)) {
        amount *= lengthFactor(unit);
        validUnit = true;
    }
    if (/Kg$/.test(field) && /^(g|kg|克|千克|公斤)$/i.test(unit)) {
        amount *= massFactor(unit);
        validUnit = true;
    }
    if (/Wh$/.test(field) && /^(Wh|瓦时|瓦特小时)$/i.test(unit))
        validUnit = true;
    if (field === 'batteryCount' && /^(块|个)$/.test(unit))
        validUnit = true;
    const result = (ok: boolean, reason: string) => ({ ok: ok && validUnit && Number.isFinite(amount) && amount > 0, value: String(amount), unit: expected, reason: !validUnit ? copyDictionary.cffa8539ddf218235 : reason });
    if (/Cm$/.test(field)) {
        const at = context.indexOf(quote), before = at >= 0 ? context.slice(Math.max(0, at - 80), at).split(/[。；;\n]/).at(-1) ?? '' : '';
        const nearby = before + quote;
        const folded = /折叠(?:后|尺寸|长|宽|高|状态)|收纳|收起|收拢|folded/i.test(nearby);
        if (/fold/.test(field) && !folded)
            return result(false, copyDictionary.cc92cb8414c8ca6a0);
        if (!/fold/.test(field) && folded && !/展开|使用(?:状态|尺寸)/.test(nearby))
            return result(false, copyDictionary.c9ec558f225d7588c);
        const axis = /Width/.test(field) || field === 'widthCm' ? copyDictionary.ce1c1ff99e88da7c0 : /Height/.test(field) || field === 'heightCm' ? copyDictionary.c7d355b716494319e : copyDictionary.cc41c7295913e8ef0;
        const direct = [...quote.matchAll(new RegExp('(?:' + axis + copyDictionary.cf2918bd1b18a890e + scalar + '\\s*' + dimensionUnits, 'gi'))];
        if (direct.length)
            return result(direct.some(match => equal(amount, Number(match[1]) * lengthFactor(match[2]))), copyDictionary.c902a6f2434ba3d47);
        const component = copyDictionary.cc9639fe2278578e2;
        const triple = quote.match(new RegExp(component + '\\s*[×xX*]\\s*' + component + '\\s*[×xX*]\\s*' + component + '\\s*' + dimensionUnits, 'i'));
        const order = (quote + ' ' + nearby).match(/(长|宽|高|length|width|height)\s*[×xX*、,，/]\s*(长|宽|高|length|width|height)\s*[×xX*、,，/]\s*(长|宽|高|length|width|height)/i);
        if (triple && order) {
            const axes = order.slice(1).map(value => /长|length/i.test(value) ? 'length' : /宽|width/i.test(value) ? 'width' : 'height'), target = /Width/.test(field) || field === 'widthCm' ? 'width' : /Height/.test(field) || field === 'heightCm' ? 'height' : 'length';
            if (new Set(axes).size !== 3)
                return result(false, copyDictionary.cbbdc6384780a643b);
            const cell = triple[axes.indexOf(target) + 1].replace(/[（）()]/g, '');
            if (/[-~～–至]/.test(cell))
                return result(false, copyDictionary.c9812bcc0b198d6a3);
            return result(equal(amount, Number(cell) * lengthFactor(triple[4])), copyDictionary.c145b3a18c8fa27b0);
        }
        return result(false, copyDictionary.c51ad9d96785e4834);
    }
    if (/Kg$/.test(field)) {
        const match = quote.match(new RegExp(scalar + '\\s*' + massUnits, 'i'));
        const batteryOnly = /电池(?:重量|重)|battery\s*weight/i.test(quote);
        return result(!!match && /重|weight|mass/i.test(quote) && (field === 'batteryWeightKg' ? batteryOnly : !batteryOnly) && equal(amount, Number(match[1]) * massFactor(match[2])), copyDictionary.c3c1d2739fbaa4a92);
    }
    if (/Wh$/.test(field)) {
        const match = quote.match(new RegExp('(?<![A-Za-z])' + scalar + copyDictionary.cae414cbcd30c6f31, 'i'));
        return result(!!match && equal(amount, Number(match[1])), copyDictionary.c595219690d28cd8e);
    }
    const match = quote.match(/(?:驱动)?电池[：:\s]*(\d+)\s*(?:块|个)/);
    return result(!!match && equal(amount, Number(match[1])), copyDictionary.c6d8d1fe7f79a788f);
}
export function checkEnumClaim(field: string, value: string, quote: string) {
    if (field === 'foldHands')
        return value === copyDictionary.ce54550a82a667a4a ? /双手|两只手/.test(quote) && !/不需要双手|无需双手|不用双手|不需双手|不需要两只手/.test(quote) : value === copyDictionary.cf23e99bce57fa0ac ? /单手|一只手/.test(quote) && !/不能|无法|不支持|不可|非单手/.test(quote) : false;
    if (field === 'batteryType')
        return value === 'none' ? /无电池|没有电池|不带电池|无需电池/.test(quote) : value === 'lithium' ? /锂/.test(quote) && !/不是锂|非锂|无锂|不含锂/.test(quote) : value === 'other' ? /铅酸|镍氢|镍镉|锌|碱性|干电池/i.test(quote) && !/锂/.test(quote) : false;
    if (field === 'weightIncludesBattery')
        return value === 'no' ? /不含电池|未含电池|不包括电池|excluding.*batter/i.test(quote) : value === 'yes' ? /(?:包含|包括|含)(?:蓄)?电池|including.*batter/i.test(quote) && !/不含|未含|不包括/.test(quote) : false;
    if (field === 'removable')
        return value === 'yes' ? /可拆|能拆|可取下|removable/i.test(quote) && !/不可拆|不能拆/.test(quote) : value === 'no' ? /不可拆|不能拆|固定电池|non.removable/i.test(quote) : false;
    if (field === 'foldable')
        return value === 'yes' ? /折叠|fold/i.test(quote) && !/不可折叠|不能折叠/.test(quote) : value === 'no' ? /不可折叠|不能折叠/.test(quote) : false;
    return quote.replace(/\s/g, '').includes(value.replace(/\s/g, ''));
}
