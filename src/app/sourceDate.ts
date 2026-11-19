export function publicSourceDate(value: string) {
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value)
  return isoDay ? `${isoDay[1]}年${Number(isoDay[2])}月${Number(isoDay[3])}日` : value
}
