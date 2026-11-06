import type { TravelActionEvidence } from './travelTaskTypes'

/** Entry points checked against official publishers; no live facility status is implied. */
export interface TravelPlanSource {
  id: string
  title: string
  url: string
  pageUpdatedAt: string | null
  checkedAt: string
  excerpt: string
}
const checkedAt = '2026-11-06'
export const travelPlanSources: Record<string, TravelPlanSource> = {
  railAssistance: {
    id: 'rail-assistance', title: '12306 · 重点旅客预约服务说明',
    url: 'https://kyfw.12306.cn/otn/view/icentre_qxyyInfo.html', pageUpdatedAt: null, checkedAt,
    excerpt: '特殊重点旅客预约须在乘车前6小时线上提交申请',
  },
  railEntry: {
    id: 'rail-entry', title: '中国铁路12306 · 官方服务与订单入口',
    url: 'https://www.12306.cn/index/', pageUpdatedAt: null, checkedAt, excerpt: '中国铁路12306',
  },
  railComplaint: {
    id: 'rail-complaint', title: '12306 · 服务投诉入口',
    url: 'https://kyfw.12306.cn/otn/view/advice_complaint.html', pageUpdatedAt: null, checkedAt,
    excerpt: '通过拨打12306铁路客服电话进行人工投诉',
  },
  transport: {
    id: 'transport-contact', title: '交通运输部 · 官方服务监督渠道',
    url: 'https://www.mot.gov.cn/hudong/', pageUpdatedAt: null, checkedAt,
    excerpt: '12328 交通运输服务监督电话',
  },
  transportScope: {
    id: 'transport-scope', title: '交通运输部 · 12328热线管理办法',
    url: 'https://xxgk.mot.gov.cn/jigou/ysfws/202109/t20210930_3620504.html',
    pageUpdatedAt: '2021-09-30', checkedAt, excerpt: '公路、水路、道路运输、城市客运',
  },
  shanghaiMetro: {
    id: 'shanghai-metro', title: '上海长宁区政府 · 地铁无障碍渡板服务',
    url: 'https://www.shcn.gov.cn/col6991/20240318/1256444.html',
    pageUpdatedAt: '2024-03-17', checkedAt, excerpt: '拨打地铁服务热线64370000申请服务',
  },
  hangzhouMetro: {
    id: 'hangzhou-metro', title: '杭州政协网 · 杭州地铁爱心预约',
    url: 'https://www.hzzx.gov.cn/cshz/content/2024-01/12/content_8673909.htm',
    pageUpdatedAt: '2024-01-12', checkedAt, excerpt: '服务热线0571-96600爱心预约',
  },
  airchina: {
    id: 'airchina-contact', title: '国航 · 官方服务热线',
    url: 'https://webresource.airchina.com.cn/zh-CN/content/contact_us/customer/service_hotline/hotline/',
    pageUpdatedAt: null, checkedAt, excerpt: '电话：0086-10-95583',
  },
  ceair: {
    id: 'ceair-contact', title: '中国东方航空 · 旅客须知与服务热线',
    url: 'https://global.ceair.com/global/static/MutualSupport/CommonProblem/passengernotice/',
    pageUpdatedAt: null, checkedAt, excerpt: '东航旅客服务热线：95530',
  },
  csair: {
    id: 'csair-contact', title: '中国南方航空 · 官方客服与电子机票',
    url: 'https://www.csair.com/cn/tourguide/faq/reserve/e-ticket.shtml',
    pageUpdatedAt: null, checkedAt, excerpt: '南航官方客服电话95539',
  },
  civilAviation: {
    id: 'aviation-contact', title: '交通运输部 · 民航服务质量监督12326',
    url: 'https://www.mot.gov.cn/hudong/', pageUpdatedAt: null, checkedAt,
    excerpt: '12326 民航服务质量监督',
  },
}

export function safeOfficialTravelUrl(raw: string): string {
  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()
    const known = ['12306.cn', 'gov.cn', 'airchina.com.cn', 'airchina.com', 'ceair.com', 'csair.com', 'shmetro.com', 'hzmetro.com']
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && known.some(domain => host === domain || host.endsWith('.' + domain)) ? url.href : ''
  } catch { return '' }
}

export function sourceEvidence(source: TravelPlanSource, now: number): TravelActionEvidence {
  const stale = now > Date.parse(source.checkedAt + 'T23:59:59Z') + 30 * 86400000
  return {
    level: 'official-excerpt', status: stale ? 'historical' : 'current',
    expiresAt: new Date(Date.parse(source.checkedAt + 'T23:59:59Z') + 30 * 86400000).toISOString(),
    updatedAt: (source.pageUpdatedAt ? '原页面更新：' + source.pageUpdatedAt : '原页面未标注更新日') + '；入口核对：' + source.checkedAt,
    officialUrl: source.url, officialLabel: source.title, sourceTitle: source.title, originalText: source.excerpt,
  }
}
