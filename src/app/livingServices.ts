import { copyDictionary } from "./copyDictionary.ts";
export type LivingToolId = 'places' | 'healthcare' | 'benefits' | 'equipment-service' | 'digital-help' | 'home-connect' | 'participation';
export type FacilityState = 'unknown' | 'available' | 'unavailable';
export interface FacilityRecord {
    id: string;
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    doorCm?: number;
    steps: 'unknown' | 'none' | 'present';
    elevator: 'unknown' | 'working' | 'unavailable';
    toilet: FacilityState;
    source: string;
    checkedAt: string;
    notes: string;
    feedback: string[];
}
export interface MaterialItem {
    id: string;
    label: string;
    checked: boolean;
}
export interface ServiceConfirmation {
    source: string;
    reference: string;
    confirmedAt: string;
}
export interface ServiceCase {
    id: string;
    kind: 'healthcare' | 'benefits' | 'equipment-service' | 'participation';
    title: string;
    region: string;
    date: string;
    needs: string;
    notes: string;
    providerId: string;
    openedAt: string;
    materials: MaterialItem[];
    confirmation?: ServiceConfirmation;
}
export interface DigitalTask {
    id: string;
    title: string;
    sourceText: string;
    deadline: string;
    steps: MaterialItem[];
    confirmed: boolean;
    createdAt: string;
}
export interface HomeConnection {
    id: string;
    name: string;
    brandModel: string;
    event: string;
    channel: 'text' | 'voice' | 'vibration';
    platformId: string;
    compatibility: 'unknown' | 'supported' | 'unsupported';
    compatibilitySource: string;
    checkedAt: string;
    connected: false;
}
export interface LivingServicesData {
    version: 1;
    facilities: FacilityRecord[];
    cases: ServiceCase[];
    digitalTasks: DigitalTask[];
    homeConnections: HomeConnection[];
}
export const initialLivingServices = (): LivingServicesData => ({ version: 1, facilities: [], cases: [], digitalTasks: [], homeConnections: [] });
export const livingToolMeta: Record<LivingToolId, {
    title: string;
    subtitle: string;
}> = {
    places: { title: copyDictionary.c9cd0e9cf5f79e85b, subtitle: copyDictionary.cc662148366773e04 },
    healthcare: { title: copyDictionary.ca8d199a7c34d4375, subtitle: copyDictionary.c0c61d22015b122d4 },
    benefits: { title: copyDictionary.c9dd05cc784dff794, subtitle: copyDictionary.c9cd1c6e3fc61710a },
    'equipment-service': { title: copyDictionary.cb09d86198686f906, subtitle: copyDictionary.cf9e51d61c41391a6 },
    'digital-help': { title: copyDictionary.c10818950ba694893, subtitle: copyDictionary.c801c2de64dba26c7 },
    'home-connect': { title: copyDictionary.c4a535c7a5b32219f, subtitle: copyDictionary.cdf56ca7c96fe6b7e },
    participation: { title: copyDictionary.c5d0c2d21c6a0b7cb, subtitle: copyDictionary.c9b64884714b1cd06 }
};
export function emptyFacility(): FacilityRecord { return { id: '', name: '', address: '', steps: 'unknown', elevator: 'unknown', toilet: 'unknown', source: '', checkedAt: '', notes: '', feedback: [] }; }
export function facilitySummary(record: FacilityRecord) {
    const labels = [record.doorCm ? copyDictionary.c39524617d1e01d7d + record.doorCm + copyDictionary.cb5039c325d7107d6 : copyDictionary.c1c1f3031b62d0f37, record.steps === 'none' ? copyDictionary.cd7eb4ee49f368301 : record.steps === 'present' ? copyDictionary.c06d4589f40bacec2 : copyDictionary.ce9948ec340efd3e9, record.elevator === 'working' ? copyDictionary.c36cbece7cf2f8688 : record.elevator === 'unavailable' ? copyDictionary.c276985665d32e76d : copyDictionary.ce65e823269e17aef, record.toilet === 'available' ? copyDictionary.cd6b57f969bdff50f : record.toilet === 'unavailable' ? copyDictionary.ce39bbf1826d20e15 : copyDictionary.c972d2ce7ceb55bdc];
    return { labels, hasSource: Boolean(record.source.trim() && Number.isFinite(Date.parse(record.checkedAt))), notice: copyDictionary.cd108f75e469eb41d };
}
export const defaultMaterials: Record<ServiceCase['kind'], string[]> = {
    healthcare: [copyDictionary.ce68ff6495bd65ca0, copyDictionary.cb7a5ad740fd4dc12, copyDictionary.c330756c3d8af97df],
    benefits: [copyDictionary.c8a5a9adab490dfc6, copyDictionary.c2cce5ef84d141fce, copyDictionary.ccf2c5bd48f62b0c8],
    'equipment-service': [copyDictionary.c8c1f5d3df2b2371a, copyDictionary.c83df96907a8968a2, copyDictionary.c69e1c96ba1d8a452],
    participation: [copyDictionary.cc342ea6ff20d7a50, copyDictionary.c305bd0cb91cf8732, copyDictionary.c93df356949897b81]
};
export function emptyServiceCase(kind: ServiceCase['kind']): ServiceCase { return { id: '', kind, title: '', region: '', date: '', needs: '', notes: '', providerId: '', openedAt: '', materials: defaultMaterials[kind].map((label, index) => ({ id: 'material-' + index, label, checked: false })) }; }
export function caseStatus(record: ServiceCase) { return record.confirmation?.source.trim() && record.confirmation.reference.trim() && Number.isFinite(Date.parse(record.confirmation.confirmedAt)) ? copyDictionary.c88f9e99179f87b72 : record.openedAt ? copyDictionary.c863d308fe1b05de4 : copyDictionary.c4e5a2f2af97e8b7c; }
export function caseCard(record: ServiceCase) {
    const title = record.kind === 'healthcare' ? copyDictionary.cb26474fd62104d16 : record.kind === 'benefits' ? copyDictionary.c82a4c528ed39ce02 : record.kind === 'equipment-service' ? copyDictionary.cedbc6c6480532fea : copyDictionary.c2bf2939035ba4516;
    return [title, copyDictionary.c42e75a89ef16494a + record.title, record.region && copyDictionary.cd20fccdb7e46e642 + record.region, record.date && copyDictionary.c84e5a9c28d3e070f + record.date, record.needs && copyDictionary.c2eac3a901b18cf19 + record.needs, record.notes && copyDictionary.cd22c69ea0bb57209 + record.notes, copyDictionary.cbe9757e6281d2a15].filter(Boolean).join('\n');
}
export function digitalDraft(sourceText: string): MaterialItem[] {
    const lines = sourceText.split(/[\n。；]/).map(line => line.trim()).filter(Boolean).slice(0, 12);
    return [{ id: 'verify-source', label: copyDictionary.c9f50c3e1cc861399, checked: false }, ...lines.map((line, index) => ({ id: 'source-' + index, label: line, checked: false })), { id: 'confirm-submit', label: copyDictionary.c17e5df97542e4c49, checked: false }];
}
export function sanitizeLivingServices(raw: unknown): LivingServicesData {
    const base = initialLivingServices();
    if (!raw || typeof raw !== 'object')
        return base;
    const data = raw as Partial<LivingServicesData>, text = (value: unknown, max = 1000) => typeof value === 'string' ? value.slice(0, max) : '', list = (value: unknown) => Array.isArray(value) ? value.slice(0, 100) : [];
    const checked = (value: unknown): MaterialItem[] => list(value).filter(item => item && typeof item === 'object').map((item, index) => ({ id: text(item.id, 100) || 'item-' + index, label: text(item.label, 300), checked: item.checked === true })).filter(item => item.label);
    const coordinate = (value: unknown, limit: number) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : undefined;
    return { version: 1,
        facilities: list(data.facilities).filter(row => row && typeof row === 'object').map(row => ({ id: text(row.id, 100), name: text(row.name, 100), address: text(row.address, 300), latitude: coordinate(row.latitude, 90), longitude: coordinate(row.longitude, 180), doorCm: typeof row.doorCm === 'number' && Number.isFinite(row.doorCm) && row.doorCm > 0 && row.doorCm <= 1000 ? row.doorCm : undefined, steps: ['none', 'present'].includes(row.steps) ? row.steps : 'unknown', elevator: ['working', 'unavailable'].includes(row.elevator) ? row.elevator : 'unknown', toilet: ['available', 'unavailable'].includes(row.toilet) ? row.toilet : 'unknown', source: text(row.source, 500), checkedAt: text(row.checkedAt, 60), notes: text(row.notes, 1500), feedback: list(row.feedback).map(value => text(value, 500)).filter(Boolean) })),
        cases: list(data.cases).filter(row => row && ['healthcare', 'benefits', 'equipment-service', 'participation'].includes(row.kind)).map(row => ({ id: text(row.id, 100), kind: row.kind, title: text(row.title, 100), region: text(row.region, 200), date: text(row.date, 100), needs: text(row.needs, 1000), notes: text(row.notes, 1500), providerId: text(row.providerId, 100), openedAt: text(row.openedAt, 60), materials: checked(row.materials), ...(row.confirmation?.source && row.confirmation?.reference ? { confirmation: { source: text(row.confirmation.source, 300), reference: text(row.confirmation.reference, 500), confirmedAt: text(row.confirmation.confirmedAt, 60) } } : {}) })),
        digitalTasks: list(data.digitalTasks).filter(row => row && typeof row === 'object').map(row => ({ id: text(row.id, 100), title: text(row.title, 100), sourceText: text(row.sourceText, 6000), deadline: text(row.deadline, 100), steps: checked(row.steps), confirmed: row.confirmed === true, createdAt: text(row.createdAt, 60) })),
        homeConnections: list(data.homeConnections).filter(row => row && typeof row === 'object').map(row => ({ id: text(row.id, 100), name: text(row.name, 100), brandModel: text(row.brandModel, 200), event: text(row.event, 300), channel: ['voice', 'vibration'].includes(row.channel) ? row.channel : 'text', platformId: text(row.platformId, 100), compatibility: ['supported', 'unsupported'].includes(row.compatibility) ? row.compatibility : 'unknown', compatibilitySource: text(row.compatibilitySource, 500), checkedAt: text(row.checkedAt, 60), connected: false }))
    };
}
