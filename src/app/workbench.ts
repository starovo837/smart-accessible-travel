import type { IconName } from '../components/Icons'
import { supportTools, type SupportToolId } from './supportCatalog.ts'

export type WorkbenchTarget = SupportToolId | 'fitting' | 'shop' | 'travel' | 'assistant' | 'profile' | 'devices' | 'choose-needs' | 'offline'

export interface WorkbenchItem {
  id: WorkbenchTarget
  target: WorkbenchTarget
  label: string
  description: string
  icon: IconName
}

export interface WorkbenchGroup {
  id: string
  title: string
  items: WorkbenchItem[]
}

function tool(id: SupportToolId): WorkbenchItem {
  const item = supportTools.find(entry => entry.id === id)
  if (!item) throw new Error('工作台功能未找到：' + id)
  return { id, target: id, label: item.title, description: item.detail, icon: item.icon }
}

function action(id: WorkbenchTarget, label: string, icon: IconName, description: string): WorkbenchItem {
  return { id, target: id, label, icon, description }
}

export const workbenchGroups: WorkbenchGroup[] = [
  {
    id: 'equipment-travel', title: '辅具与出行', items: [
      action('fitting', '三维试配', 'cube', '旋转查看人体与辅具的三维示意，按需要填写尺寸'),
      action('shop', '买辅具', 'cart', '读懂商品资料，核对依据并比较候选款式'),
      action('travel', '出行查询', 'train', '结合实物设备资料，检查交通携带要求'),
      tool('equipment-service'),
    ],
  },
  {
    id: 'reading-communication', title: '阅读与沟通', items: [
      tool('vision'), tool('magnifier'), tool('color'), tool('communication'), { ...tool('gestures'), label:'基础手势' },
      action('assistant', '文字助手', 'message', '输入问题或选择常用问题，逐项理解当前资料'),
    ],
  },
  {
    id: 'daily-health', title: '生活与健康', items: [
      { ...tool('life'), icon: 'home' }, tool('steps'), tool('reminders'),
      { ...tool('healthcare'), icon: 'hospital' }, { ...tool('home-connect'), icon: 'home-connect' },
    ],
  },
  {
    id: 'affairs-participation', title: '办事与参与', items: [
      { ...tool('benefits'), icon: 'documents' }, { ...tool('digital-help'), icon: 'digital-form' },
      { ...tool('participation'), icon: 'book-open' },
    ],
  },
  {
    id: 'map-help', title: '地图与求助', items: [
      { ...tool('places'), icon: 'map-pin' }, tool('help'), { ...tool('live-help'), icon: 'handshake' },
    ],
  },
  {
    id: 'personal-settings', title: '我的与设置', items: [
      action('profile', '我的资料', 'user', '查看个人资料、隐私和纠错记录'),
      action('devices', '我的设备', 'wheelchair', '添加设备，编辑参数与资料来源'),
      action('choose-needs', '辅助组合', 'settings', '自由选择或调整辅助需要，不限制其他功能'),
      tool('needs'),
      action('offline', '离线随身包', 'cube', '按选择的范围准备可离线查看的设备与出行资料'),
    ],
  },
]

export const workbenchItems = workbenchGroups.flatMap(group => group.items)
