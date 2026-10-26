/** Public, manually checked service entry points. No provider API or booking claim. */
export interface ServiceProvider {
  id: string
  name: string
  category: 'map' | 'healthcare' | 'benefits' | 'equipment' | 'home' | 'participation'
  url: string
  scope: string
  channel: 'official-site' | 'platform-search' | 'phone'
  phone?: string
  description: string
  verifiedAt: string
  sourceUrl: string
  booking: 'external-only' | 'not-booking'
}

const checked = '2026-10-26'

export const serviceProviders: ServiceProvider[] = [
  {
    id: 'amap', name: '高德地图', category: 'map', url: 'https://www.amap.com/',
    scope: '中国大陆地点搜索；设施是否适合本人需另行核实', channel: 'platform-search',
    description: '在真实地图中搜索用户填写的地点。地图结果不等于门宽、电梯可用性或无障碍路线已经核实。',
    verifiedAt: checked, sourceUrl: 'https://lbs.amap.com/api/uri-api/guide/search/search', booking: 'not-booking',
  },
  {
    id: 'baidu-map', name: '百度地图', category: 'map', url: 'https://map.baidu.com/',
    scope: '中国大陆地点搜索；设施状态需联系场所确认', channel: 'platform-search',
    description: '提供另一种地图搜索渠道，不根据普通地点搜索结果自动认定无障碍条件。',
    verifiedAt: checked, sourceUrl: 'https://lbsyun.baidu.com/faq/api?title=webapi%2Furi%2Fweb', booking: 'not-booking',
  },
  {
    id: 'national-service', name: '国家政务服务平台', category: 'benefits', url: 'https://gjzwfw.www.gov.cn/col/col881/',
    scope: '全国入口；实际条件、材料和受理机构按办理地区确认', channel: 'official-site',
    description: '查询残疾人康复、补贴、家庭无障碍改造和就业等办事入口。需在官方平台选择地区，不在本应用判定资格。',
    verifiedAt: checked, sourceUrl: 'https://gjzwfw.www.gov.cn/col/col881/', booking: 'external-only',
  },
  {
    id: 'cdpf-app', name: '中国残联残疾人服务APP', category: 'benefits', url: 'https://www.cdpf.org.cn/lwyd1/fwptydAPP2025/index.htm',
    scope: '全国服务入口；具体事项取决于办理地区和身份认证', channel: 'official-site',
    description: '中国残联官方页面介绍并提供APP下载渠道，可办理残疾人证、精准康复、儿童康复等事项。下载和申请在官方渠道完成。',
    verifiedAt: checked, sourceUrl: 'https://www.cdpf.org.cn/lwyd1/fwptydAPP2025/index.htm', booking: 'external-only',
  },
  {
    id: 'cdpf-hotline', name: '残疾人服务热线12385', category: 'benefits', url: 'https://www.cdpf.org.cn/',
    scope: '残疾人服务咨询；受理范围与接听安排以当地实际为准', channel: 'phone', phone: '12385',
    description: '中国残联官网公开的服务热线。可询问本地办事、服务与权益渠道；不是紧急救援，也不表示已有人接单。',
    verifiedAt: checked, sourceUrl: 'https://www.cdpf.org.cn/', booking: 'not-booking',
  },
  {
    id: 'crrc-hospital', name: '中国康复研究中心·北京博爱医院', category: 'healthcare', url: 'https://www.crrc.com.cn/',
    scope: '北京；外地就诊者需提前确认就诊及转诊安排', channel: 'official-site',
    description: '从医院官网查看科室、就医指南与预约渠道。是否有号、无障碍协助和服务费用，须向医院核对；本应用不代为挂号。',
    verifiedAt: checked, sourceUrl: 'https://www.crrc.com.cn/', booking: 'external-only',
  },
  {
    id: 'beijing-114', name: '北京114预约挂号电话', category: 'healthcare', url: 'https://english.bjchy.gov.cn/node/476',
    scope: '北京，限参与平台的医疗机构与号源', channel: 'phone', phone: '010-114',
    description: '通过真实电话渠道询问预约。网页入口不作为已接通的挂号接口；微信公众号或京通等移动渠道以平台最新说明为准。',
    verifiedAt: checked, sourceUrl: 'https://www.btch.edu.cn/docs/20220128165624411647.pdf', booking: 'external-only',
  },
  {
    id: 'crrc-engineering', name: '中国康复研究中心康复工程', category: 'equipment', url: 'https://www.crrc.com.cn/Html/News/Articles/18273.html',
    scope: '北京；个体评估及相关服务是否受理需先联系机构', channel: 'official-site',
    description: '了解假肢矫形与辅具等专业范围，再从医院正规渠道咨询评估、适配和训练；不保证承接任意品牌维修或租赁。',
    verifiedAt: checked, sourceUrl: 'https://www.crrc.com.cn/Html/News/Articles/18273.html', booking: 'external-only',
  },
  {
    id: 'yuwell-service', name: '鱼跃官方使用与售后渠道', category: 'equipment', url: 'https://www.yuwell.com/news',
    scope: '鱼跃品牌适用产品；按具体型号、保修和地区核实', channel: 'phone', phone: '400-828-7768',
    description: '官方提供使用指南、售后维修与配件等渠道。联系前准备型号和购买凭据；不承诺保修、上门、费用或到场时间。',
    verifiedAt: checked, sourceUrl: 'https://ai.yuyue.com.cn/yuwellScan/%E9%B1%BC%E8%B7%83%E5%81%A5%E5%BA%B7_%E9%9A%90%E7%A7%81%E6%94%BF%E7%AD%96.html', booking: 'external-only',
  },
  {
    id: 'home-adaptation', name: '家庭无障碍改造办事入口', category: 'home', url: 'https://gjzwfw.www.gov.cn/col/col881/',
    scope: '全国办事入口；改造项目、资格与补贴由办理地确定', channel: 'official-site',
    description: '进入官方平台查询家庭无障碍改造事项及当地渠道。改造方案仍需结合实际空间和本人需求评估。',
    verifiedAt: checked, sourceUrl: 'https://gjzwfw.www.gov.cn/col/col881/', booking: 'external-only',
  },
  {
    id: 'mijia', name: '米家官方平台与接入说明', category: 'home', url: 'https://home.mi.com/index.html',
    scope: '仅米家实际支持的设备、网关、地区及账号', channel: 'official-site',
    description: '在米家APP按官方说明绑定设备、设置提醒与场景。本应用没有取得米家账号或设备控制权限；具体门铃、报警器等需逐款确认兼容。',
    verifiedAt: checked, sourceUrl: 'https://ics-resources.xiaomi.com/ics-resources/articles/60bf175420a523e5ed34b3f3.html', booking: 'not-booking',
  },
  {
    id: 'cdpee', name: '中国残疾人就业创业网络服务平台', category: 'participation', url: 'https://www.cdpee.org.cn/',
    scope: '全国招聘和就业服务入口；岗位与活动以平台当日信息为准', channel: 'official-site',
    description: '查求职招聘、就业指导和职业培训渠道，申请及身份认证在平台完成。本应用不复制或保证岗位有效、录用或薪资。',
    verifiedAt: checked, sourceUrl: 'https://www.bdpf.org.cn/cms68/web1459/subject/n1/n1459/n1551/n5605/n5606/c137942/content.html', booking: 'external-only',
  },
  {
    id: 'smartedu', name: '国家智慧教育公共服务平台', category: 'participation', url: 'https://www.smartedu.cn/',
    scope: '全国教育资源；各资源无障碍特性和使用条件需逐项查看', channel: 'official-site',
    description: '查课程与教育服务。可先询问字幕、文字材料和合理便利，不保证每一门课程都具有相同无障碍支持。',
    verifiedAt: checked, sourceUrl: 'https://system.smartedu.cn/', booking: 'not-booking',
  },
  {
    id: 'accessible-library', name: '中国盲人数字图书馆', category: 'participation', url: 'https://www.cdlvi.cn/user/index',
    scope: '无障碍阅读资源；部分内容需依平台规则注册或认证', channel: 'official-site',
    description: '国家图书馆主办的无障碍数字阅读服务，包含电子书、有声书、音乐、讲座和电影等栏目。资源授权与账号条件以平台为准。',
    verifiedAt: checked, sourceUrl: 'https://www.cdlvi.cn/comment/basm', booking: 'not-booking',
  },
]

// Validate scheme and a specific host allowlist. It is not a redirect or service
// availability guarantee. User-entered facility notes are never put into URLs.
const allowedHosts = new Set([
  'www.amap.com', 'uri.amap.com', 'map.baidu.com', 'api.map.baidu.com',
  'gjzwfw.www.gov.cn', 'www.cdpf.org.cn', 'www.crrc.com.cn', 'www.cdpee.org.cn',
  'www.cdlvi.cn', 'cdlvi.cn', 'www.smartedu.cn', 'system.smartedu.cn',
  'home.mi.com', 'ics-resources.xiaomi.com', 'www.yuwell.com', 'ai.yuyue.com.cn',
  'english.bjchy.gov.cn', 'www.btch.edu.cn', 'www.bdpf.org.cn', 'lbs.amap.com',
  'lbsyun.baidu.com',
])
export function safeServiceUrl(raw: string): string {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && allowedHosts.has(url.hostname.toLowerCase()) ? url.toString() : ''
  } catch { return '' }
}

export type MapPlatform = 'amap' | 'baidu'
/** Only the explicit place query is sent; no location or profile is attached. */
export function platformMapUrl(query: string, platform: MapPlatform = 'amap'): string {
  const text = query.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160)
  if (!text) return ''
  const url = new URL(platform === 'baidu' ? 'https://api.map.baidu.com/place/search' : 'https://uri.amap.com/search')
  if (platform === 'baidu') {
    url.search = new URLSearchParams({ query: text, region: '全国', output: 'html', src: 'webapp.smartAccessibleTravel.placeSearch' }).toString()
  } else {
    url.search = new URLSearchParams({ keyword: text, view: 'map', callnative: '0' }).toString()
  }
  return safeServiceUrl(url.toString())
}
