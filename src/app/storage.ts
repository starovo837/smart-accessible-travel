import { initialJourney } from './journey.ts'
import type { AppSettings, ConsentState, CustomTravelDevice, CustomTravelMode, Device, Feedback, JourneyData, ModuleId, PrivacyPreferences } from './types'

export const STORAGE_KEY = 'smart-accessible-travel'
export interface Snapshot {
  version: 2; savedAt: number; expiresAt: number | null; privacy: PrivacyPreferences;
  modules: ModuleId[]; devices: Device[]; consent: ConsentState; settings: AppSettings;
  journey: JourneyData; feedback: Feedback[]; customModes: CustomTravelMode[]; customDevices: CustomTravelDevice[];
}
export function scopeSnapshot(data: Omit<Snapshot, 'version' | 'savedAt' | 'expiresAt'>, now = Date.now()): Snapshot {
  const base = initialJourney(), { privacy } = data
  return { ...data, version: 2, savedAt: now, expiresAt: privacy.retainDays ? now + privacy.retainDays * 86400000 : null,
    modules: privacy.profile ? data.modules : [], devices: privacy.devices ? data.devices : [],
    customModes: privacy.life ? data.customModes : [], customDevices: privacy.devices ? data.customDevices : [],
    feedback: privacy.life ? data.feedback : [],
    journey: { ...base, cards: privacy.devices ? data.journey.cards : [], comparisons: privacy.devices ? data.journey.comparisons.map(product => product.insight ? { ...product, insight: { ...product.insight, sources: product.insight.sources.map(({image, text, transcript, ...source}) => ({ ...source, text: '' })), needs: privacy.life ? product.insight.needs : { oneHand: false, canFold: 'unknown' as const } } } : product) : [],
      living: privacy.life ? data.journey.living : base.living, life: privacy.life ? { ...data.journey.life, emergency: privacy.devices ? data.journey.life.emergency : { ...data.journey.life.emergency, medicalIds: [], showMedical: false }, care: privacy.devices ? data.journey.life.care : data.journey.life.care.map(item => ({ ...item, deviceId: '' })) } : base.life,
      records: privacy.life && privacy.devices ? data.journey.records : [], shares: privacy.life ? data.journey.shares : [], packet: null },
  }
}
export function readSnapshot(raw: string | null, now = Date.now()): Snapshot | null {
  try {
    let saved = JSON.parse(raw || 'null')
    if (saved && !saved.version && saved.consent === 'granted' && Array.isArray(saved.devices) && Array.isArray(saved.modules)) {
      const base = initialJourney()
      // Preserve the scope the user had already authorized; subsequent choices can narrow it.
      saved = { ...saved, version: 2, savedAt: now, expiresAt: now + 30 * 86400000, privacy: { profile: true, devices: true, life: true, retainDays: 30 }, feedback: [], customModes: saved.customModes ?? [], customDevices: saved.customDevices ?? [], journey: { ...base, ...saved.journey, life: { ...base.life, ...saved.journey?.life } } }
    }
    if (!saved || saved.version !== 2 || saved.consent !== 'granted' || !saved.privacy || saved.expiresAt !== null && saved.expiresAt <= now) return null
    if (!Array.isArray(saved.modules) || !Array.isArray(saved.devices) || !saved.journey?.life || !saved.settings) return null
    const restored=scopeSnapshot(saved,saved.savedAt)
    if(saved.journey.packet&&Array.isArray(saved.journey.packet.checklist)&&Array.isArray(saved.journey.packet.results)&&restored.privacy.life){restored.journey.packet={...saved.journey.packet,cards:restored.privacy.devices&&Array.isArray(saved.journey.packet.cards)?saved.journey.packet.cards:[],records:restored.privacy.devices&&Array.isArray(saved.journey.packet.records)?saved.journey.packet.records:[],life:undefined}}
    return restored
  } catch { return null }
}
