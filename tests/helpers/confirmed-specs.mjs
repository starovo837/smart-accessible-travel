// Explicitly reviewed synthetic measurements for pre-existing transport regression fixtures.
// Never use this helper with production devices, saved drafts, samples or UI data.
const fields=['lengthCm','widthCm','heightCm','weightKg','batteryWh','batteryType','batteryCount','removable','folded']
export const reviewedSpecs=raw=>({...raw,confirmed:Object.fromEntries(fields.filter(field=>field in raw).map(field=>[field,true]))})
