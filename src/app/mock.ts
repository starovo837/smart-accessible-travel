import { copyDictionary } from "./copyDictionary.ts";
import type { IconName } from '../components/Icons';
import type { AppointmentScript, AssistantTurn, ChecklistItem, Device, DeviceType, ModuleId, ProductAnalysis, TravelCheckResult, TravelContext, TravelDeviceSpecs, TravelMode } from './types';
import { buildTravelResults as buildRuleResults } from './travelRules';
export const moduleMeta: Record<ModuleId, {
    label: string;
    icon: IconName;
    detail: string;
    support: string;
}> = {
    vision: { label: copyDictionary.c18ce674a8a2acbfd, icon: 'eye', detail: copyDictionary.c44b0a14196e78a73, support: copyDictionary.c1539287123e26e65 },
    hearing: { label: copyDictionary.ce2caddc4e2387523, icon: 'ear', detail: copyDictionary.c8c21b70531ce2970, support: copyDictionary.ce79305c6b4a2f313 },
    mobility: { label: copyDictionary.ce458569077be0f97, icon: 'wheelchair', detail: copyDictionary.c93ded9c136925ad8, support: copyDictionary.c78c374b01745be55 },
    speech: { label: copyDictionary.c7424aa2db068ed28, icon: 'message', detail: copyDictionary.c7c9b6fc1012ec2ca, support: copyDictionary.c0dcb37f7c85dad8b },
    cognitive: { label: copyDictionary.cd1d8941d780723df, icon: 'steps', detail: copyDictionary.c5b4616e215bbab9b, support: copyDictionary.c47e870f01f0ef91f },
    chronic: { label: copyDictionary.c2e573f7afaaa1555, icon: 'heart', detail: copyDictionary.c18ea50056450f6d5, support: copyDictionary.c9a5ab100a67dc92c },
};
export const moduleIds = Object.keys(moduleMeta) as ModuleId[];
export const deviceMeta: Record<DeviceType, {
    label: string;
    icon: IconName;
    defaults: Pick<Device, 'battery' | 'dimensions' | 'weight'>;
}> = {
    wheelchair: { label: copyDictionary.c4157eed714966bbc, icon: 'wheelchair', defaults: { battery: '24V · 20Ah', dimensions: '105 × 68 × 98 cm', weight: '32 kg' } },
    cane: { label: copyDictionary.cbc4a33ffc596d34c, icon: 'cane', defaults: { battery: copyDictionary.c484d55613910eb8c, dimensions: copyDictionary.cf5cac541c15543ca, weight: '0.3 kg' } },
    'hearing-aid': { label: copyDictionary.cdc2ed4c62c4097ac, icon: 'ear', defaults: { battery: '160mAh', dimensions: '4 × 2 × 1 cm', weight: '0.02 kg' } },
    oxygen: { label: copyDictionary.c5e88c40945c85c49, icon: 'oxygen', defaults: { battery: '12V · 6Ah', dimensions: '19 × 10 × 24 cm', weight: '2.2 kg' } },
    pump: { label: copyDictionary.caaede5bfae21dca3, icon: 'heart', defaults: { battery: '1.5V · AAA', dimensions: '5 × 3 × 1.5 cm', weight: '0.1 kg' } },
};
export const deviceTypes = Object.keys(deviceMeta) as DeviceType[];
export const sampleDevices: Device[] = deviceTypes.map((type) => ({ id: 'sample-' + type, type, name: copyDictionary.c0d53f08678d8101b + deviceMeta[type].label, ...deviceMeta[type].defaults, source: 'plate' }));
export const emptyDevice = (type: DeviceType = 'wheelchair'): Device => ({ id: '', type, name: '', battery: '', dimensions: '', weight: '', source: 'manual' });
const delay = <T,>(value: T, ms = 450) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
export const recognizeDevicePlate = (type: DeviceType) => delay({ ...sampleDevices.find((device) => device.type === type)!, name: deviceMeta[type].label });
export function makeProduct(sourceLabel: string): ProductAnalysis {
    const hash = Array.from(sourceLabel).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
    const compact = hash % 2 === 0;
    const width = compact ? 62 : 68;
    return {
        id: 'product-' + hash, sourceLabel, title: compact ? copyDictionary.c3cc171e3ef61f955 : copyDictionary.c1d8906f17ca40fb1, width, length: compact ? 98 : 105, weight: compact ? 26 : 32,
        merchantClaims: [copyDictionary.c85cffd6d8eeba2c0 + width + copyDictionary.c63ab4418c9ad1dec, copyDictionary.c2df54f9cec97f34f, copyDictionary.c4099c1bd21da8d86],
        userFeedback: [copyDictionary.ce0f2731ee82b06ad, copyDictionary.ce23879ea0fb520af, copyDictionary.ced28aef8580f32b9],
        conclusion: copyDictionary.c89b4619d0f6719f4,
        evidence: [copyDictionary.c38da130ac78361ab + width + copyDictionary.c2aa7d7121e683493, copyDictionary.cfa6b3d61f4f42b40, copyDictionary.c494d0f0899fdf782],
        nextSteps: [copyDictionary.c5e6649240f512913, copyDictionary.c741d77f734e4436e, copyDictionary.ca9969ab32fed0032],
        homeFit: { label: copyDictionary.cd55c0be97376836f, detail: copyDictionary.cedad8d1b22df9b7f, tone: 'warn' },
    };
}
export const fixtureDevice: Device = { id: 'demo-wheelchair', type: 'wheelchair', name: copyDictionary.c3d44decd866a3a07, ...deviceMeta.wheelchair.defaults, source: 'plate' };
export const productAnalysis: ProductAnalysis = makeProduct('https://example.com/wheelchair');
export const analyzeProduct = (input: string): Promise<ProductAnalysis> => delay(makeProduct(input), 650);
export function buildTravelResults(mode: TravelMode, devices: Device[], specs: Record<string, TravelDeviceSpecs> = {}, context: TravelContext = { carrier: 'unspecified' }) { return buildRuleResults(mode, devices, specs, context); }
export const checkTravelEligibility = (mode: TravelMode, devices: Device[] = [fixtureDevice, sampleDevices.find((device) => device.type === 'cane')!], specs: Record<string, TravelDeviceSpecs> = {}, context: TravelContext = { carrier: 'unspecified' }) => delay(buildRuleResults(mode, devices, specs, context), 600);
export function makeChecklist(mode: TravelMode, medical = false): ChecklistItem[] {
    const steps = [
        { id: 'materials', label: copyDictionary.c3cf195556387fb6d, detail: copyDictionary.c3a17491c0c9fe053 },
        { id: 'contact', label: copyDictionary.c61133aefdf3f5e82, detail: mode === 'rail' ? copyDictionary.c5809ad6b0ed2c914 : mode === 'plane' ? copyDictionary.c8a78d60fe4a2ffab : copyDictionary.c01c8550d878d1bae },
        { id: 'timing', label: copyDictionary.c7632c100a9efe487, detail: copyDictionary.c8e2eaa04f5cef17f },
        { id: 'arrival', label: copyDictionary.cc727fe258d39b6f3, detail: copyDictionary.c40b8106429fd74c6 },
    ];
    if (medical)
        steps.splice(1, 0, { id: 'medical', label: copyDictionary.cb91edcbe3666e492, detail: copyDictionary.c2fb40823cac7f096 });
    return steps.map((step) => ({ ...step, checked: false }));
}
export function makeAppointment(mode: TravelMode, results: TravelCheckResult[]): AppointmentScript {
    const label = mode === 'rail' ? copyDictionary.c2db31e428de89535 : mode === 'plane' ? copyDictionary.cc05f7cd6ed3587a2 : (travelModeLabel(mode) || copyDictionary.c401f1488f65c87de);
    return { subject: label + copyDictionary.c4f77e8c38f5ad463, body: copyDictionary.ca4851886ef561e98 + label + copyDictionary.cb3d06ff94ed8f4d3 + results.map((result) => result.deviceName).join('、') + copyDictionary.c24831cc01c875d39 };
}
function travelModeLabel(mode: TravelMode) { return ({ bus: copyDictionary.c0711877f34a0dae0, metro: copyDictionary.cb8466cd555e68992, train: copyDictionary.cb0e71283b715601f, taxi: copyDictionary.ca009d2a251780ef1, 'ride-hailing': copyDictionary.c4039dc8b6d42a85e, 'accessible-car': copyDictionary.cf816877f0e3b4c6a, coach: copyDictionary.c126889b8d3296b28, ferry: copyDictionary.c59c8f9c7509b5762, 'private-car': copyDictionary.cccaed1ae5a74e03a } as Record<string, string>)[mode] ?? (mode.startsWith('custom:') ? mode.slice(7) : ''); }
export function runAssistantTurn(step: number, text: string): AssistantTurn {
    const questions = [copyDictionary.ca439e6eb866fe972, copyDictionary.cc9ca64c982c7f6cd, copyDictionary.cbad01e291b067a6f];
    return { speaker: 'assistant', text: text.trim() ? questions[step] ?? copyDictionary.cf5767bc44aca5df4 : copyDictionary.ca4ba0380ba9c9497, confidence: 'high' };
}
