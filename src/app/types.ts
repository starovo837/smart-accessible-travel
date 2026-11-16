export type ModuleId = 'vision' | 'hearing' | 'mobility' | 'speech' | 'cognitive' | 'chronic'
export type Screen = 'learning' | 'welcome' | 'select' | 'consent' | 'devices' | 'home' | 'fitting-workspace' | 'fit-shopping' | 'product-input' | 'product-result' | 'travel-input' | 'travel-result' | 'assistant' | 'profile' | 'about' | 'switch-modules' | 'privacy' | 'device-cards' | 'offline-pack' | 'life-tools' | 'support' | 'support-tool' | 'living-hub' | 'living-service' | 'living-scene'
export type ConsentState = 'undecided' | 'granted' | 'skipped'
export interface LifeData { learning?:import('./learningPlan').LearningData }
export type DeviceType = string
export type TravelMode = string
export type Eligibility = 'allowed' | 'conditional' | 'unknown' | 'restricted'
export interface TravelDeviceSpecs {
  lengthCm?: number; widthCm?: number; heightCm?: number; weightKg?: number;
  folded?: 'yes' | 'no' | 'unknown'; batteryType?: 'none' | 'lithium' | 'other' | 'unknown';
  batteryWh?: number; removable?: 'yes' | 'no' | 'unknown'; batteryCount?: 1 | 2;
}
export interface TravelContext {
  carrier: 'unspecified' | 'airchina' | 'ceair' | 'csair' | 'other'; city?: string; line?: string; journeyDate?: string;
  from?: string; to?: string;
  companionCount?: number;
  availableLengthCm?: number; availableWidthCm?: number; availableHeightCm?: number; doorWidthCm?: number;
  availableWeightKg?: number;
}
export interface CustomTravelMode { id: TravelMode; label: string; icon: import('../components/Icons').IconName; contact: string }
export interface CustomTravelDevice { id: string; name: string; type: DeviceType; icon: import('../components/Icons').IconName }
export interface Device { id: string; type: DeviceType; name: string; battery: string; dimensions: string; weight: string; source: 'manual' | 'plate' }
export type CardField = 'lengthCm' | 'widthCm' | 'heightCm' | 'weightKg' | 'foldLengthCm' | 'foldWidthCm' | 'foldHeightCm' | 'batteryWh' | 'batteryType' | 'removable' | 'batteryCount'
export interface FieldEvidence { origin: 'merchant' | 'plate' | 'measurement' | 'reply'; confirmed: boolean; note: string }
export interface DeviceCard extends Device {
  values: Partial<Record<CardField, string>>;
  evidence: Partial<Record<CardField, FieldEvidence>>;
  productId?: string; prospective: boolean;
  transportState?: 'folded' | 'use';
}
export interface LivingProfile { doorCm?: number; elevatorDoorCm?: number; elevatorLengthCm?: number; elevatorWidthCm?: number; liftKg?: number; canFold: 'unknown' | 'yes' | 'no'; usualModes: TravelMode[] }
export interface CarrierRecord { id: string; signature: string; carrier: string; itinerary: string; date: string; reply: string; recordedAt: string }
export interface OfflinePacket { savedAt: string; mode: TravelMode; cards: DeviceCard[]; results: TravelCheckResult[]; records: CarrierRecord[]; checklist: ChecklistItem[]; communication: string; life?: LifeData }
export interface LocalShare { id: string; expiresAt: number; revoked: boolean; scopes: ('devices' | 'records' | 'checklist')[]; recipient?: string; previewedAt?: string; serverId?:string; ownerToken?:string; viewToken?:string; revision?:number; url?:string }
export interface HomeProfile { doorCm?: number; elevatorDoorCm?: number; bathroomTurnCm?: number; bedClearanceCm?: number; lighting: 'unknown' | 'good' | 'needs-help'; alarm: 'unknown' | 'visual' | 'vibration' | 'none'; chargingPlace?: string; thresholdCm?: number; kitchenHeightCm?: number; stairs?: 'unknown' | 'yes' | 'no'; note?: string }
export interface DailyStatus { energy: 'good' | 'limited' | 'rest'; pain: 'none' | 'mild' | 'strong'; companion: boolean; note: string }
export interface RoutePlan { id?: string; from: string; to: string; mode: TravelMode; accessible: boolean; updatedAt: string; steps: string[]; alternatives: string[]; restroom: string; restStops: string; step?: number; paused?: boolean; facilities?: { id: string; label: string; status: 'unknown' | 'confirmed' | 'unavailable'; note: string; checkedAt?: string }[] }
export interface CareRecord { id: string; deviceId: string; kind: 'maintenance' | 'repair' | 'subsidy' | 'rental' | 'warranty' | 'consumable'; title: string; dueDate?: string; note: string; status: 'todo' | 'done'; provider?: string; phone?: string; cost?: string; region?: string }
export interface EmergencyProfile { helpText: string; caregiver: string; phone: string; showMedical: boolean; offlineReady: boolean; medicalIds?: string[]; location?: string; staffReply?: string }
export interface LifeData { home: HomeProfile; daily: DailyStatus; routes: RoutePlan[]; care: CareRecord[]; emergency: EmergencyProfile; caregiverHelp: boolean; services?:import('./livingServices').LivingServicesData; helpSessions?:import('./liveHelp').HelpSessionRecord[]; sceneProgress?:Partial<Record<import('./livingCatalog').SceneId,string[]>>; assistance?: {reminders?:import('./supportCatalog').DailyReminder[];phrases?:string[];gesturePhrases?:Record<string,string>;tasks:{id:string;title:string;steps:string[]}[];progress:Record<string,number>} }
export interface JourneyData { cards: DeviceCard[]; living: LivingProfile; comparisons: ProductAnalysis[]; records: CarrierRecord[]; packet: OfflinePacket | null; shares: LocalShare[]; life: LifeData }
export interface ProductAnalysis {
  deviceType?: string; insight?: import('./product').ProductInsight;
  id: string; title: string; sourceLabel: string; width: number; length: number; weight: number;
  merchantClaims: string[]; userFeedback: string[]; conclusion: string; evidence: string[]; nextSteps: string[];
  homeFit?: { label: string; detail: string; tone: 'good' | 'warn' };
  deviceScore?: number;
}
export interface TravelCheckResult {
  mode: TravelMode; deviceId: string; deviceName: string; eligibility: Eligibility;
  summary: string; source: string; updatedAt: string; evidence: string;
  status?: 'official-allowed' | 'official-conditional' | 'no-rule-found' | 'carrier-confirmation' | 'restricted';
  confidence?: 'high' | 'medium' | 'low'; applicableTo?: string; ruleDate?: string;
  assessment?:'conditions-met'|'assistance-required'|'information-needed'|'not-met'; missingInformation?:string[]; assessmentScope?:string;
  handling?: string; checks?: string[]; nextSteps?: string[]; sourceLinks?: { label: string; url: string }[];
  ruleEvidence?: import('./ruleCatalog').RuleDocument[];
}
export interface ChecklistItem { id: string; label: string; detail: string; checked: boolean }
export interface AppointmentScript { subject: string; body: string }
export interface AssistantTurn { speaker: 'assistant' | 'user'; text: string; confidence?: 'high' | 'low'; citations?:import('./assistantEvidence').AssistantEvidence[] }
export interface AppSettings { elderMode: boolean; stepMode: boolean; readAloud: boolean; largeText?: boolean; textOnly?: boolean; reducedMotion?: boolean; encouragement?: boolean; travelSingleStep?: boolean; travelDisplayVersion?: 2 }
export interface Feedback { id: string; subject: string; text: string; createdAt?: string; status?: 'local-pending' | 'submitted'; serverId?:string; accessToken?:string }
export interface PrivacyPreferences { profile: boolean; devices: boolean; life: boolean; retainDays: 7 | 30 | 0 }
export interface AppData {
  version: 1; modules: ModuleId[]; devices: Device[]; consent: ConsentState; settings: AppSettings;
  comparisons: ProductAnalysis[]; checklist: ChecklistItem[]; feedback: Feedback[];
}

