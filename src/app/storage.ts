import { initialJourney } from './journey.ts'
import { sanitizeLearning, removeLearning } from './learningPlan.ts'
import { sanitizeLivingServices } from './livingServices.ts'
import { sanitizeHelpSessions } from './liveHelp.ts'
import { sceneSteps, type SceneId } from './livingCatalog.ts'
import {normalizeDisabilityProfile,type DisabilityProfile} from './disabilityProfile.ts'
import {copyDictionary as c} from './copyDictionary.ts'
import type { AppSettings, ConsentState, CustomTravelDevice, CustomTravelMode, Device, Feedback, JourneyData, LocalShare, ModuleId, PrivacyPreferences } from './types'

export const STORAGE_KEY = 'smart-accessible-travel'
export const DISABILITY_PROFILE_KEY = 'smart-accessible-disability-v1'
type ProfileStore=Pick<Storage,'getItem'|'setItem'|'removeItem'>
export const canSaveDisabilityProfile=(consent?:ConsentState,privacy?:Pick<PrivacyPreferences,'profile'>)=>consent==='granted'&&privacy?.profile===true
export function removeDisabilityProfile(storage?:ProfileStore){
 const store=storage??localStorage
 store.removeItem(DISABILITY_PROFILE_KEY)
 if(store.getItem(DISABILITY_PROFILE_KEY)!==null)throw Error(c.profileCleanupFailed)
}
export function restoreDisabilityProfile(snapshot:Pick<Snapshot,'consent'|'privacy'>|null,storage?:ProfileStore):{profile:DisabilityProfile;error:string}{
 const allowed=canSaveDisabilityProfile(snapshot?.consent,snapshot?.privacy)
 try{
  const store=storage??localStorage
  if(!allowed){removeDisabilityProfile(store);return {profile:{selections:[]},error:''}}
  return {profile:normalizeDisabilityProfile(JSON.parse(store.getItem(DISABILITY_PROFILE_KEY)??'null')),error:''}
 }catch{return {profile:{selections:[]},error:allowed?c.profileReadFailed:c.profileStartupCleanupFailed}}
}
export function persistDisabilityProfile(profile:DisabilityProfile,consent:ConsentState,privacy:Pick<PrivacyPreferences,'profile'>,storage?:ProfileStore){
 const store=storage??localStorage
 if(!canSaveDisabilityProfile(consent,privacy)){removeDisabilityProfile(store);return}
 const raw=JSON.stringify(normalizeDisabilityProfile(profile));store.setItem(DISABILITY_PROFILE_KEY,raw)
 if(store.getItem(DISABILITY_PROFILE_KEY)!==raw)throw Error(c.profileSaveFailed)
}
/** Only profile scopes change. Device/life data stay under their existing authorization. */
export function clearProfileStorage({storage,all=false}:{storage?:ProfileStore;all?:boolean}={}){
 const store=storage??localStorage
 removeDisabilityProfile(store)
 const raw=store.getItem(STORAGE_KEY)
 if(raw===null)return
 const saved=all?null:readSnapshot(raw)
 if(!saved){store.removeItem(STORAGE_KEY);if(store.getItem(STORAGE_KEY)!==null)throw Error(c.profileCleanupFailed);return}
 const next=JSON.stringify({...saved,modules:[],privacy:{...saved.privacy,profile:false}})
 store.setItem(STORAGE_KEY,next)
 if(store.getItem(STORAGE_KEY)!==next)throw Error(c.profileCleanupFailed)
}
export interface Snapshot {
  version: 2; savedAt: number; expiresAt: number | null; privacy: PrivacyPreferences;
  modules: ModuleId[]; devices: Device[]; consent: ConsentState; settings: AppSettings;
  journey: JourneyData; feedback: Feedback[]; customModes: CustomTravelMode[]; customDevices: CustomTravelDevice[];
}
export function sharesForPrivacyWithdrawal(shares: LocalShare[], withdrawal: { devices: boolean; life: boolean }) {
  return shares.filter(share => !share.revoked && (withdrawal.life
    || withdrawal.devices && share.scopes.some(scope => scope === 'devices' || scope === 'records')))
}
export function withoutLifeAssistance(life: JourneyData['life']): JourneyData['life'] {
  const { assistance: _assistance, ...rest } = removeLearning(life)
  return rest
}
export function writeScopedSnapshot(data: Omit<Snapshot, 'version' | 'savedAt' | 'expiresAt'>, store: ProfileStore = localStorage) {
  const next = JSON.stringify(scopeSnapshot(data))
  store.setItem(STORAGE_KEY, next)
  if (store.getItem(STORAGE_KEY) !== next) throw Error()
}
export function scopeSnapshot(data: Omit<Snapshot, 'version' | 'savedAt' | 'expiresAt'>, now = Date.now()): Snapshot {
  const base = initialJourney(), { privacy } = data
  const settings = { ...data.settings }
  const life = privacy.life ? { ...data.journey.life, learning: data.journey.life.learning ? sanitizeLearning(data.journey.life.learning) : undefined } : removeLearning(base.life)
  Reflect.deleteProperty(settings, 'voiceInput')
  return { ...data, settings, version: 2, savedAt: now, expiresAt: privacy.retainDays ? now + privacy.retainDays * 86400000 : null,
    modules: canSaveDisabilityProfile(data.consent,privacy) ? data.modules : [], devices: privacy.devices ? data.devices : [],
    customModes: privacy.life ? data.customModes : [], customDevices: privacy.devices ? data.customDevices : [],
    feedback: privacy.life ? data.feedback : [],
    journey: { ...base, cards: privacy.devices ? data.journey.cards : [], comparisons: privacy.devices ? data.journey.comparisons.map(product => product.insight ? { ...product, insight: { ...product.insight, sources: product.insight.sources.map(({image, text, transcript, ...source}) => ({ ...source, text: '' })), needs: privacy.life ? product.insight.needs : { oneHand: false, canFold: 'unknown' as const } } } : product) : [],
      living: privacy.life ? data.journey.living : base.living, life: privacy.life ? { ...life, emergency: privacy.devices ? data.journey.life.emergency : { ...data.journey.life.emergency, medicalIds: [], showMedical: false }, care: privacy.devices ? data.journey.life.care : data.journey.life.care.map(item => ({ ...item, deviceId: '' })) } : base.life,
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
    if(restored.privacy.life){
      const life=restored.journey.life
      if(life.services!==undefined)life.services=sanitizeLivingServices(life.services)
      if(life.helpSessions!==undefined)life.helpSessions=sanitizeHelpSessions(life.helpSessions)
      if(life.sceneProgress!==undefined){
        const source=life.sceneProgress
        life.sceneProgress={}
        for(const scene of Object.keys(sceneSteps) as SceneId[]){
          const ids=source&&typeof source==='object'?source[scene]:undefined
          if(Array.isArray(ids))life.sceneProgress[scene]=sceneSteps[scene].filter(step=>ids.includes(step.id)).map(step=>step.id)
        }
      }
    }
    if(saved.journey.packet&&Array.isArray(saved.journey.packet.checklist)&&Array.isArray(saved.journey.packet.results)&&restored.privacy.life){restored.journey.packet={...saved.journey.packet,cards:restored.privacy.devices&&Array.isArray(saved.journey.packet.cards)?saved.journey.packet.cards:[],records:restored.privacy.devices&&Array.isArray(saved.journey.packet.records)?saved.journey.packet.records:[],life:undefined}}
    return restored
  } catch { return null }
}
