import { copyDictionary } from "./copyDictionary.ts";
import {readableTravelPlan} from './actionCopy.ts'
import { extraEquipment, getTravelMeta } from './catalog.ts';
import { rulesFor, ruleCurrent } from './ruleCatalog.ts';
import { travelPlanSources, safeOfficialTravelUrl, sourceEvidence, type TravelPlanSource } from './travelPlanSources.ts';
import { canonicalTripKey, normalizeTripContext, normalizeTripSpecs, safeTripText } from './travelTripIdentity.ts';
import { travelEquipmentGaps, travelCapacityInput, travelCompleteness, requiresTravelDimensions, requiresTravelBattery } from './travelCompleteness.ts';
import type { TravelActionEvidence, TravelPlanAction, TravelPlanInput, TravelTaskPlan, TravelStageId } from './travelTaskTypes';
import { applyDisabilityAdvice } from './disabilityTravel.ts';
export { normalizeTripSpecs as taskDeviceSpecs } from './travelTripIdentity.ts';
const largeTypes = new Set(['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator', 'transfer-board']);
const stageTitles: [
    TravelStageId,
    string
][] = [['before', copyDictionary.cda50b8ddaee0b821], ['station', copyDictionary.cb1ac57328b89f5e3], ['onboard', copyDictionary.cde8320a591cea5c5], ['arrival', copyDictionary.c82e9da1265a813d4], ['fallback', copyDictionary.ce4c90ed862e985d5]];
const batteryLabels = { none: copyDictionary.caf0bea91f489b74c, lithium: copyDictionary.c0cad03728e492a1a, other: copyDictionary.c3e713b8913f1775d, unknown: copyDictionary.cc02465e8f949d022 };
const hash = (value: string) => { let n = 2166136261; for (let i = 0; i < value.length; i++)
    n = Math.imul(n ^ value.charCodeAt(i), 16777619); return (n >>> 0).toString(16); };
/** Pure trip compiler. Unknown endpoints produce preparation, never invented station details. */
function compileTravelTaskPlan(input: TravelPlanInput): Omit<TravelTaskPlan, 'completion'> {
    const context = normalizeTripContext(input.context), mode = safeTripText(input.mode), label = safeTripText(getTravelMeta(mode).label, copyDictionary.c927fd4fbfce64728);
    const hasClock = typeof input.now === 'number' && Number.isFinite(input.now);
    const generatedAt = hasClock ? new Date(input.now!).toISOString() : copyDictionary.cba9c4bee89d87437;
    // Without a caller clock, evidence uses a stable reference; departure is not a generation timestamp.
    const reference = hasClock ? input.now! : Date.parse(context.journeyDate || '2026-11-07T00:00:00Z');
    const now = Number.isFinite(reference) ? reference : Date.parse('2026-11-07T00:00:00Z');
    const devices = (input.devices ?? []).map(device => ({ id: device.id, name: safeTripText(device.name, copyDictionary.c0f0fca7f8a5cdd2d), type: safeTripText(device.type, 'other'), specs: normalizeTripSpecs(device, input.specs?.[device.id]) })).sort((a, b) => JSON.stringify([a.name, a.type, a.specs]).localeCompare(JSON.stringify([b.name, b.type, b.specs]), 'zh-CN'));
    const route = { from: context.from, to: context.to, date: context.journeyDate }, from = route.from, to = route.to;
    const completeRoute = Boolean(mode && from && to);
    const equipmentGaps = travelEquipmentGaps(devices);
    const readiness: TravelTaskPlan['readiness'] = !completeRoute ? 'preparation' : !equipmentGaps.length ? 'complete' : 'station-only';
    const missingFields = [...(!mode ? ['mode'] : []), ...(!from ? ['from'] : []), ...(!to ? ['to'] : []), ...equipmentGaps.map(gap => gap.id)];
    const rail = mode === 'rail' || mode === 'train', plane = mode === 'plane', metro = mode === 'metro', bus = mode === 'bus', road = ['taxi', 'ride-hailing', 'accessible-car', 'private-car'].includes(mode);
    const names = devices.map(device => device.name).join('、'), large = devices.some(device => largeTypes.has(device.type)), dog = devices.some(device => device.type === 'guide-dog');
    const powered = devices.some(device => device.type !== 'guide-dog' && (device.specs.batteryType !== 'none') && (device.specs.batteryType || ['wheelchair', 'mobility-scooter', 'oxygen', 'pump', 'cpap', 'hearing-aid', 'aac-device', 'electronic-cane', 'magnifier', 'cochlear-processor'].includes(device.type)));
    const manualUnfolded = devices.some(device => device.type === 'manual-wheelchair' && device.specs.folded === 'no');
    const contact = rail ? { name: copyDictionary.c02862e9686fb0b73, phone: '12306', source: travelPlanSources.railAssistance }
        : plane && context.carrier === 'airchina' ? { name: copyDictionary.c55f58d8a985747bc, phone: '95583', source: travelPlanSources.airchina }
            : plane && context.carrier === 'ceair' ? { name: copyDictionary.c1367a3b18f72da8a, phone: '95530', source: travelPlanSources.ceair }
                : plane && context.carrier === 'csair' ? { name: copyDictionary.c55de4d1f40ae0249, phone: '95539', source: travelPlanSources.csair }
                    : plane ? { name: copyDictionary.ce59b9e5eccc3b029, phone: '12326', source: travelPlanSources.civilAviation }
                        : metro && /上海|虹桥/.test([context.city, from, to].join(' ')) ? { name: copyDictionary.c174302bdcfe6a1aa, phone: '021-64370000', source: travelPlanSources.shanghaiMetro }
                            : metro && /杭州/.test([context.city, from, to].join(' ')) ? { name: copyDictionary.c670be196481a3dfb, phone: '0571-96600', source: travelPlanSources.hangzhouMetro }
                                : { name: copyDictionary.c61b939d5b3168c86, phone: '12328', source: travelPlanSources.transport };
    const complaint = rail ? { name: copyDictionary.c7b78d63a9cd23e35, phone: '12306', source: travelPlanSources.railComplaint } : plane ? { name: copyDictionary.c34eb9a1bcb039c69, phone: '12326', source: travelPlanSources.civilAviation } : { name: copyDictionary.cec4979d8242eeaf1, phone: '12328', source: travelPlanSources.transportScope };
    const time = route.date ? copyDictionary.ce3b0c44298fc1c14 + route.date + copyDictionary.cefdc22fca1c6310f : copyDictionary.c8097d0183789fa03;
    const party = context.companionCount ? copyDictionary.c5f97d1a9a547ce11 + context.companionCount + copyDictionary.cb5a7588e0747ccf9 : copyDictionary.ccda5d88bbeb31556;
    const airline = plane ? ({ airchina: copyDictionary.c2addf82e80a9f862, ceair: copyDictionary.c1527eaf6bb0579fd, csair: copyDictionary.cf3adc2135b1c2c94, other: copyDictionary.cc99324e923cf575a, unspecified: '' } as const)[context.carrier] : '';
    const trip = completeRoute ? `${label} ${from}→${to}${context.city ? copyDictionary.cdf124d7d6db30b0d + context.city : ''}${context.line ? copyDictionary.ce6b3072c33d94865 + context.line : ''}${airline ? '，' + airline : ''}，${time}，${party}` : `${label}${context.city ? ' · ' + context.city : ''}`;
    const equipmentPacket = devices.map(device => {
        if (device.type === 'guide-dog')
            return copyDictionary.ce3b0c44298fc1c14 + device.name + copyDictionary.cb31362f1f5202552;
        const s = device.specs, providedDimensions = ([['lengthCm', copyDictionary.c597ae23d84d4eac2], ['widthCm', copyDictionary.c8dd966ad496e83c7], ['heightCm', copyDictionary.cb1c27820fec23edb]] as const).flatMap(([key, label]) => s[key] ? [`${label}${s[key]} cm`] : []).join('、'), dimensions = requiresTravelDimensions(device.type) ? [s.lengthCm ? copyDictionary.c597ae23d84d4eac2 + s.lengthCm : copyDictionary.ccbf42c6eb44ea289, s.widthCm ? copyDictionary.c8dd966ad496e83c7 + s.widthCm : copyDictionary.ce1ced8d86222e4b6, s.heightCm ? copyDictionary.cb1c27820fec23edb + s.heightCm : copyDictionary.c78475474e4d6b5aa].join('/') + ' cm' : copyDictionary.ce08bed2ce1278d1c + (providedDimensions ? copyDictionary.c5bc3a8a3aa4054a3 + providedDimensions : '');
        const category = extraEquipment.find(item => item.id === device.type)?.label ?? ({ wheelchair: copyDictionary.c4157eed714966bbc, cane: copyDictionary.cbc4a33ffc596d34c, 'hearing-aid': copyDictionary.cdc2ed4c62c4097ac, oxygen: copyDictionary.c5e88c40945c85c49, pump: copyDictionary.caaede5bfae21dca3 } as Record<string, string>)[device.type] ?? safeTripText(device.type.replace(/^custom:/u, ''), copyDictionary.c83177550801d0153);
        return copyDictionary.ce3b0c44298fc1c14 + device.name + copyDictionary.c6190c0419d743c80 + category + copyDictionary.c98c5b19799da10d8 + dimensions + (s.weightKg ? `，${s.weightKg} kg` : '') + copyDictionary.cad9464da161a8d5a + (requiresTravelBattery(device.type) ? batteryLabels[s.batteryType ?? 'unknown'] : copyDictionary.c395ec3b58c87ade8) + (s.batteryWh ? ` ${s.batteryWh} Wh` : '') + (s.batteryCount ? copyDictionary.c36a9e7f1c95b82ff + s.batteryCount + copyDictionary.c36d89c8f512d8cce : '') + (s.removable ? copyDictionary.c872bbc9a90caf09f + (s.removable === 'yes' ? copyDictionary.c6282a8f43eeff610 : s.removable === 'no' ? copyDictionary.ca8bb2cda5b53e887 : copyDictionary.c62f426751a393be0) : '') + (s.folded ? `，${s.folded === 'yes' ? copyDictionary.cf8132c7ca733c805 : s.folded === 'no' ? copyDictionary.c4bce42b2736591ce : copyDictionary.ceffd4bda52d2f96d}` : '');
    }).join('；');
    const available = [...(['availableLengthCm', 'availableWidthCm', 'availableHeightCm', 'doorWidthCm', 'availableWeightKg'] as const).flatMap((key) => context[key] ? [`${({ availableLengthCm: copyDictionary.c3366e05ac79ecccc, availableWidthCm: copyDictionary.c4a1b543f1bbc0d45, availableHeightCm: copyDictionary.cb0272889448cd675, doorWidthCm: copyDictionary.c6fb0c936d9c605e4, availableWeightKg: copyDictionary.c00cad7108dd642f7 } as const)[key]}${context[key]}${key === 'availableWeightKg' ? ' kg' : ' cm'}`] : [])].join('、');
    const conflicts = devices.flatMap(device => ([['lengthCm', 'availableLengthCm', copyDictionary.cfcd53935fd79027b], ['widthCm', 'availableWidthCm', copyDictionary.c3b730da0ad1ab52f], ['heightCm', 'availableHeightCm', copyDictionary.c968dd036cbb1eb2b], ['widthCm', 'doorWidthCm', copyDictionary.cbc6659e2e05b98e7], ['weightKg', 'availableWeightKg', copyDictionary.c6fd9e54a00163278]] as const).flatMap(([field, limit, description]) => device.specs[field] && context[limit] && device.specs[field]! > Number(context[limit]) ? [copyDictionary.ce3b0c44298fc1c14 + device.name + description + copyDictionary.cc4c1577a9111e43e] : [])).join('；');
    const packet = [equipmentPacket, available, conflicts].filter(Boolean).join('；');
    const inferred = (): TravelActionEvidence => ({ level: 'inference', status: 'unverified', updatedAt: generatedAt, officialUrl: contact.source.url, officialLabel: contact.source.title, sourceTitle: copyDictionary.c19cb2be697ccc655 });
    const official = (source: TravelPlanSource = contact.source) => sourceEvidence(source, now);
    const stages = stageTitles.map(([id, title]) => ({ id, title, actions: [] as TravelPlanAction[], emptyReason: '' })), generalActions: TravelPlanAction[] = [];
    const add = (stage: TravelStageId | 'general', id: string, title: string, detail: string, question: string, evidence: TravelActionEvidence = inferred(), anchors: TravelPlanAction['anchors'] = []) => {
        if (readiness === 'station-only' && devices.length && ['request', 'timing', 'entrance'].includes(id)) {
            detail += copyDictionary.cc48d15561c0581a7 + packet + copyDictionary.ceb0d5884569b398e;
            question += copyDictionary.cbd3133b5963e34f0 + packet + copyDictionary.c5b85060549de070e;
        }
        const visible = title + ' ' + detail + ' ' + question;
        const inferredAnchors: TravelPlanAction['anchors'] = [...(from && visible.includes(from) ? [{ kind: 'from' as const, value: from }] : []), ...(to && visible.includes(to) ? [{ kind: 'to' as const, value: to }] : []), ...devices.filter(device => visible.includes(device.name)).map(device => ({ kind: 'device' as const, value: device.name })), ...(route.date && visible.includes(route.date) ? [{ kind: 'date' as const, value: route.date }] : [])];
        const action: TravelPlanAction = { id: `${mode || 'prepare'}-${id}`, title, detail, evidence, verification: { contact: contact.name, phone: contact.phone, question }, anchors: [...anchors, ...inferredAnchors] };
        // A transport label or inferred city alone is not station-specific evidence.
        if (stage === 'general' || !action.anchors.length)
            generalActions.push(action);
        else
            stages.find(row => row.id === stage)!.actions.push(action);
        return action;
    };
    const dateSentence = route.date ? copyDictionary.c262904438c46421f + route.date + copyDictionary.ceb0d5884569b398e : copyDictionary.c283d5dd6f0e936ed;
    if (readiness === 'preparation') {
        const known = [from ? copyDictionary.cdcdf45b36ecbbe12 + from : '', to ? copyDictionary.c135bdd7537811810 + to : '', route.date ? copyDictionary.c12872b9721b77e49 + route.date : '', context.city ? copyDictionary.ced84a1665f79b6ca + context.city : '', context.line ? copyDictionary.c223b24b821cc4fbf + context.line : '', airline, party].filter(Boolean).join('，');
        add('general', 'prepare-route', copyDictionary.cdb4b29f13d461324, copyDictionary.c93491745a968f5af + (context.city ? copyDictionary.cc1571caa3a94a164 + context.city + copyDictionary.c3a5d9706f0172c42 : ''), copyDictionary.c4ab6a7fa94441ae0);
        add('general', 'prepare-contact', rail ? copyDictionary.c788813e619f8fdda : plane ? copyDictionary.c3ae431d1454f6ad1 : metro ? copyDictionary.cda5d8e6c76f516a1 : bus ? copyDictionary.c16c37e981126eb52 : road ? copyDictionary.c2abde4b53dbc71ef : copyDictionary.c5f7892488ac0f1bf, plane ? copyDictionary.c503976733d115f3d : metro ? copyDictionary.ce076f4b9afbdd6f9 + contact.name + copyDictionary.cda047c04c9b5e27e + contact.phone + copyDictionary.cf02cf264398d89b3 : rail ? copyDictionary.c15359cbb30646d36 : copyDictionary.c0526b4cbc6df0b4a + contact.phone + copyDictionary.c5d097baddc63ec72, copyDictionary.c8e6876ff67e7fd60, official());
        if (devices.length)
            add('general', 'prepare-equipment', dog ? copyDictionary.cc118e44b2efb3c17 : copyDictionary.c17160436d6a29e13, `${packet}。${dog ? copyDictionary.c4c77598c7090c70d : copyDictionary.cbad5837ea51be392}`, copyDictionary.cff9ec5ba460d64d2 + names + copyDictionary.cf2226d0fc8e1362b);
        if (plane && manualUnfolded)
            add('general', 'prepare-hold', copyDictionary.cf6971444bee65d22, copyDictionary.c27da70caca83e01c + names + copyDictionary.c26f18f8401a01484, copyDictionary.c24238c54b71f5235);
        if (metro && dog)
            add('general', 'prepare-dog', copyDictionary.c5a165c2ed65dadbd, copyDictionary.ca2f77db0e9b9ab53 + contact.name + copyDictionary.c42b58be327639733, copyDictionary.c2cbf5a0d2464e639);
        // Partial facts still change the preparation task and the actual inquiry.
        const routeTask = generalActions[0], contactTask = generalActions[1];
        routeTask.detail = copyDictionary.c5ebeeb543bc60d3c + known + copyDictionary.ceb0d5884569b398e + routeTask.detail;
        contactTask.detail = copyDictionary.cbba4d3d76e013783 + known + (names ? copyDictionary.c22f58c5d76efb404 + names : '') + copyDictionary.ceb0d5884569b398e + contactTask.detail;
        if (contactTask.verification)
            contactTask.verification.question = copyDictionary.c6878a48f3b8acdef + known + (packet ? copyDictionary.cb7c9aab49e988b69 + packet : '') + copyDictionary.ceb0d5884569b398e + contactTask.verification.question;
        // The safety contact is usable before any itinerary fields are supplied.
        generalActions.splice(1, 1);
        contactTask.title = copyDictionary.cc13a45a545f4d8d1;
        contactTask.detail += copyDictionary.c82aea66b36120716;
        stages.find(stage => stage.id === 'fallback')!.actions.push(contactTask);
        if (to)
            add('arrival', 'prepare-arrival', copyDictionary.c36d8af352954c938, copyDictionary.cd0cace2a3f74cbdf + to + copyDictionary.ce3d1429a83be9b96, copyDictionary.ce3b0c44298fc1c14 + to + copyDictionary.c8ae1a790322b23ec);
    }
    else {
        const deviceAsk = devices.length ? copyDictionary.cff9ec5ba460d64d2 + names + copyDictionary.ceb0d5884569b398e : copyDictionary.c300ce0231a1be1f0;
        add('before', 'request', rail ? copyDictionary.c52aa57720b9d9440 : plane ? copyDictionary.caa6eefb5d114e347 : metro ? copyDictionary.c68aea9a9abe66610 : bus ? copyDictionary.c118d38bd4d401e2d : road ? copyDictionary.ca9255441e56ea745 : copyDictionary.ce87db1a97ee454b4, `${trip}。${deviceAsk}${rail ? copyDictionary.c764af7ad5db6c168 + from + copyDictionary.c0b3fd707e5959bb4 + to + copyDictionary.c06275c94db054915 : plane ? copyDictionary.c344ca6801166c84e + from + copyDictionary.c676d86bf23b62b95 + to + copyDictionary.c3b22d168b8181adb : metro ? copyDictionary.c1079dc1f05bade5b + from + copyDictionary.cb56f36b529dbcd62 + to + copyDictionary.c0eff0162af8dd160 : bus ? copyDictionary.c202bcf6bce73d164 + from + copyDictionary.cb56f36b529dbcd62 + to + copyDictionary.c75b0a894b08d3591 : copyDictionary.cc2650ae70d01c963 + from + copyDictionary.cb56f36b529dbcd62 + to + copyDictionary.cb386566249609963}`, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.cad9464da161a8d5a + deviceAsk + copyDictionary.c2fb8b8f58aa8e332, official());
        add('before', 'timing', rail ? copyDictionary.c8b81c9418221f09a : plane ? copyDictionary.c479b52b00ea8717a : metro ? copyDictionary.c5ea29016780a7c55 : bus ? copyDictionary.cbf6bae87798b1785 : copyDictionary.c8f88f4acdba68f90, copyDictionary.ce3b0c44298fc1c14 + time + copyDictionary.c2719a8ea304b8cbf + from + copyDictionary.c7158490d323b58a8 + party + copyDictionary.ceb0d5884569b398e + (rail ? copyDictionary.c8517153980727dc2 : plane ? copyDictionary.c8731a5611335899f : metro ? copyDictionary.c871810841c4041f3 : copyDictionary.c2631f5e2d3e490ab), copyDictionary.c52d25a9e30ba94f1 + from + copyDictionary.c55cd0d86dc216359 + party + copyDictionary.ce8c982185635d61f);
        add('station', 'entrance', plane ? copyDictionary.cd8f4e2fb776d54be : bus ? copyDictionary.cbdc49c05ffd255f5 : copyDictionary.c59f5bf3580e934b2, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.cb8abdb77efaede10 + from + copyDictionary.cfadd569f71435e4e + (plane ? copyDictionary.c0fb388b8435aa916 : copyDictionary.c5a93d9e15a391409) + copyDictionary.cccb86de0518a972d, copyDictionary.ce3b0c44298fc1c14 + from + copyDictionary.c75f46f309dabd8af);
        add('station', 'facilities', copyDictionary.c8ea0c129cdf8078a, copyDictionary.cb56f36b529dbcd62 + from + copyDictionary.c236d23d7422a674f + dateSentence + copyDictionary.c9777f8214193904d, copyDictionary.ce3b0c44298fc1c14 + from + copyDictionary.c12a844f784c9c0fc);
        if (context.companionCount)
            add('station', 'companion', copyDictionary.c783e8dde3ce05d37, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.ceb0d5884569b398e + from + copyDictionary.c7c6a5ba73b82e962 + context.companionCount + copyDictionary.cf259490408852344, copyDictionary.ce3b0c44298fc1c14 + from + copyDictionary.c90ce0f66f09488f2 + context.companionCount + copyDictionary.c2dbfda2cd0fe4106);
        else
            add('station', 'solo', copyDictionary.cc999b90cf5b2604d, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c73240b51ebdf9759 + from + copyDictionary.cd8a715b7a5183cb9 + to + copyDictionary.c711230701fdd8218, copyDictionary.ce3b0c44298fc1c14 + from + copyDictionary.c14a3e5104c212561 + to + copyDictionary.c419f99a2f3673429);
        if (readiness === 'complete') {
            add('before', 'device-record', copyDictionary.c46a2dfc27c5ffc47, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c39bc60c255e06182 + packet + copyDictionary.c7521fc4fc7bb2661, copyDictionary.ce3b0c44298fc1c14 + packet + copyDictionary.c3c9dd0fd6467876a, { ...inferred(), level: 'user', sourceTitle: copyDictionary.c562eafdffff46f8f, originalText: packet });
            add('before', 'carry', plane ? copyDictionary.c4bd57662dd254cc4 : metro ? copyDictionary.c1d330f20789fcd7b : copyDictionary.c0d2ad194bd3b5375, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.ceb0d5884569b398e + packet + copyDictionary.ceb0d5884569b398e + (plane && large ? copyDictionary.cdb3405ca969b2228 : rail && large ? copyDictionary.cac35dae2c2f792b5 : copyDictionary.c163bdc5ae8e1f6b2) + copyDictionary.cd4d34ce3b42e9b6f, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.ceb0d5884569b398e + packet + copyDictionary.c030b748b8f3dee81);
            if (devices.some(device => device.type !== 'guide-dog'))
                add('before', 'pack', manualUnfolded ? copyDictionary.ce93d1742a64553a3 : copyDictionary.c1667f45060177432, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c71a1875721ec77f0 + packet + copyDictionary.ceb0d5884569b398e + (manualUnfolded ? copyDictionary.c010ada80f214c9e1 : copyDictionary.c64ae999e834bc2b5) + copyDictionary.cc56cd863b0d57d3f, copyDictionary.ce3b0c44298fc1c14 + packet + copyDictionary.c5b4676febb5f4db9 + from + copyDictionary.ca05241cc718e5f1e);
            add('before', 'documents', dog ? copyDictionary.c591be8b54e5c88ab : copyDictionary.ce6059f38f741f11f, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.cdcddd5af316b4b4a + names + copyDictionary.c1df6e01cd62d5fe2 + (dog ? copyDictionary.c510f273f347658d7 : copyDictionary.cbcbcb0ce64fc685b), copyDictionary.ce3b0c44298fc1c14 + from + copyDictionary.cd2cf128b13900192 + names + copyDictionary.ceb579005a11151e8, rail ? official(travelPlanSources.railAssistance) : inferred());
            add('station', 'screening', plane ? copyDictionary.c0333a50b6ad4c00f : metro ? copyDictionary.c89bd7977ffd13bdb : copyDictionary.cfe83e20dacd9a470, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.ce81bdf160b46b2d4 + from + copyDictionary.c1b4855d5f749d44d + packet + copyDictionary.ceb0d5884569b398e + (dog ? copyDictionary.cfa67fc2aeca0283d : copyDictionary.c620feafd3ad65002) + copyDictionary.c57dcfe881124ad41, copyDictionary.ce3b0c44298fc1c14 + packet + copyDictionary.c5dda5124502a5079 + from + copyDictionary.cad248219530147cd);
            add('onboard', 'position', plane ? copyDictionary.c683dd1f22abf3fdd : metro ? copyDictionary.c3de7e295b9470bc8 : bus ? copyDictionary.c767f97ba67f6a79b : copyDictionary.cb4b048bb06f9d3bb, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c71a1875721ec77f0 + packet + copyDictionary.ceb0d5884569b398e + (plane ? copyDictionary.c114ed7a0494ed74a : dog ? copyDictionary.ccddaec1366f2c6e0 : copyDictionary.cb8c76a0b2d1cf94c) + copyDictionary.cd4d34ce3b42e9b6f, copyDictionary.ce3b0c44298fc1c14 + packet + copyDictionary.c3f28a3e9547a5bc0 + to + copyDictionary.c5d9e09d1c7705703);
            if (powered)
                add('onboard', 'battery', copyDictionary.cff2b02ee1e6fd4d2, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.ceb0d5884569b398e + packet + copyDictionary.c816655357c532a06, copyDictionary.ce3b0c44298fc1c14 + packet + copyDictionary.c8acdd4681b656f40);
            else if (plane)
                add('onboard', 'nonpowered', copyDictionary.c4541cf9b646a19c7, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.ceb0d5884569b398e + packet + copyDictionary.c7bf840cc9b6a5296, copyDictionary.ce3b0c44298fc1c14 + packet + copyDictionary.c092bd256b19e251f + to + copyDictionary.cd0ba4bb5669ccaea);
            if (metro && dog)
                add('onboard', 'dog', copyDictionary.cebd8f52d5434208f, copyDictionary.c12404a0b63817240 + from + copyDictionary.ca602bb3235efd058 + to + copyDictionary.c632205054c5384eb, copyDictionary.ce3b0c44298fc1c14 + from + copyDictionary.cb56f36b529dbcd62 + to + copyDictionary.cefa8fc6378b672ac);
            add('onboard', 'assistance', copyDictionary.ca033cef07395d1ae, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c698aaa07cbdd0970 + names + copyDictionary.cc4d61149ee943fbc + to + copyDictionary.c284ff93777d69466, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.cb6e96afe453b2d13 + to + copyDictionary.ceb265f3c9e3c7592, rail ? official(travelPlanSources.railAssistance) : inferred());
        }
        add('arrival', 'exit', plane ? copyDictionary.ccc7c71f1b98e91bb : copyDictionary.c0383843f8963153e, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c092bd256b19e251f + to + copyDictionary.c66ca43cfb1189bf6 + party + copyDictionary.c2e157a595485ddab, copyDictionary.ce3b0c44298fc1c14 + to + copyDictionary.cf09795bd2f6ff35d);
        add('arrival', 'transfer', metro ? copyDictionary.c7836758d89ca4277 : copyDictionary.cc4e2f87397253f03, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c3048d90b0b08eb2c + to + copyDictionary.cb32afa411f45bc61 + (devices.length ? copyDictionary.cc5c77a2d3579c079 + packet + '。' : copyDictionary.c383fc36f7e2b4dcf) + (rail ? copyDictionary.cb721febf93c21dd9 : plane ? copyDictionary.c421cc5dd340ed062 : copyDictionary.ce61b1a466976456d), copyDictionary.ce3b0c44298fc1c14 + to + copyDictionary.cc7974f7151a5b31e + (devices.length ? packet + '。' : '') + copyDictionary.c9dd1ab951c00a716);
        const local = /杭州/.test(to) ? { name: copyDictionary.c670be196481a3dfb, phone: '0571-96600', source: travelPlanSources.hangzhouMetro } : /上海|虹桥/.test(to) ? { name: copyDictionary.c174302bdcfe6a1aa, phone: '021-64370000', source: travelPlanSources.shanghaiMetro } : null;
        if (local && !metro) {
            const row = add('arrival', 'local', copyDictionary.cfd5fd3c4567938c7 + local.name + copyDictionary.c98ce3edc3b7a1832, copyDictionary.ce3b0c44298fc1c14 + time + copyDictionary.c893354ab12729710 + to + copyDictionary.c86c7cbd68d5cb932 + local.phone + copyDictionary.ccf5efbc50ec3a647, copyDictionary.ce3b0c44298fc1c14 + to + copyDictionary.cab77ae1e5e31e957, official(local.source));
            row.verification = { contact: local.name, phone: local.phone, question: row.verification!.question };
        }
        add('fallback', 'refusal', copyDictionary.c17455af1966e03c3, copyDictionary.c88fb2c6ac6ce1343 + from + copyDictionary.cb56f36b529dbcd62 + to + copyDictionary.cad9464da161a8d5a + time + copyDictionary.cad9464da161a8d5a + (devices.length ? copyDictionary.c27da70caca83e01c + names : copyDictionary.c9fa648c65cfe7b2a) + copyDictionary.c415301a8a3db3165, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c6acafe7b9ff302a3);
        const escalation = add('fallback', 'contact', copyDictionary.cc1ca81ccf9dd3a96 + complaint.phone, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c7d67721b2f4cf451 + complaint.name + copyDictionary.ceb0d5884569b398e + (rail ? copyDictionary.c8ce2ed4aba170805 : plane ? copyDictionary.c3d1146e823665f22 : copyDictionary.ca4c62cfd9f16f631) + copyDictionary.cd46d6cc0cf784ee1, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.c9499b137aa62236d, official(complaint.source));
        escalation.verification = { contact: complaint.name, phone: complaint.phone, question: escalation.verification!.question };
        if (rail || plane || mode === 'coach' || mode === 'ferry')
            add('fallback', 'ticket', copyDictionary.cb64d3371052d58f0, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.cebb397a37390a766 + from + copyDictionary.cc7a92e7fbccee4c0, copyDictionary.ce3b0c44298fc1c14 + from + copyDictionary.c12344a2827e10e36, rail ? official(travelPlanSources.railEntry) : inferred());
        else
            add('fallback', 'backup', copyDictionary.c2dc38615dd33915c, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.ca39d27b15fbc86b7 + from + copyDictionary.c78d73393c5f79276 + to + copyDictionary.cf85fb926a623981d + (devices.length ? copyDictionary.c4262c45dc797bb0c + packet + copyDictionary.c2f0d1c262cc4a9fb : '') + copyDictionary.c53f4a9a594b09190, copyDictionary.ce3b0c44298fc1c14 + from + copyDictionary.cb56f36b529dbcd62 + to + copyDictionary.cad0451b6bb941d3b);
        for (const rule of rulesFor(mode, context, input.documents ?? [])) {
            const url = safeOfficialTravelUrl(rule.url);
            if (!url)
                continue;
            const current = ruleCurrent(rule, Math.max(now, Date.parse(route.date) || 0)), historical = !current && (rule.status === 'verified' || Boolean(rule.checkedAt));
            const topic = /battery|电池/.test(rule.id + ' ' + rule.title) ? copyDictionary.c5f68a6a875010349 : /assistance|辅助/.test(rule.id + ' ' + rule.title) ? copyDictionary.c509848d9e0825bfd : safeTripText(rule.title, copyDictionary.c94da4835fb55b4ae);
            add('before', 'source-' + rule.id, (historical ? copyDictionary.c5f02312a3914da6e : '') + topic, copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.ce456595767617bd0 + safeTripText(rule.title, copyDictionary.cac6dd0771f134ab5) + copyDictionary.cf0c7a918d402ec72 + (current ? copyDictionary.cf66f853442db21c8 : copyDictionary.c2fcd33fe677179aa), copyDictionary.ce3b0c44298fc1c14 + trip + copyDictionary.cdc69a76a77672557, { level: 'official-rule', status: current ? 'current' : historical ? 'historical' : 'unverified', updatedAt: rule.publishedAt ? copyDictionary.cb6e578f2e12b52c7 + rule.publishedAt : rule.checkedAt ? copyDictionary.ce8d40c7e0c11ed73 + rule.checkedAt : copyDictionary.c36c534764ba63866, officialUrl: url, officialLabel: safeTripText(rule.title, copyDictionary.c37381cb8b250d3f3), sourceTitle: safeTripText(rule.title, copyDictionary.c37381cb8b250d3f3), effectiveDate: rule.effectiveAt, expiresAt: rule.expiresAt, originalText: rule.excerpts.map(excerpt => safeTripText(excerpt.label) + '：' + safeTripText(excerpt.text)).join('\n') });
        }
    }
    for (const stage of stages)
        if (!stage.actions.length)
            stage.emptyReason = readiness === 'preparation' ? copyDictionary.c9675a503446cc3bf : readiness === 'station-only' ? copyDictionary.cfb65445fc92deeb8 : copyDictionary.c21e8bc333bc3f4a6;
    const count = stages.reduce((sum, stage) => sum + stage.actions.length, 0);
    const summary = copyDictionary.c6bb6eb6e2692b3b8 + [label, completeRoute ? `${from} → ${to}` : context.city, route.date, names].filter(Boolean).join(' · ') + copyDictionary.caf3c9e14fb5be1d8 + count + copyDictionary.c2f4d2346735c1984 + generalActions.length + copyDictionary.c411cde9108e1ef4f + (readiness === 'preparation' ? copyDictionary.c052e6068d6b3363d : readiness === 'station-only' ? (!devices.length ? copyDictionary.c53b7adf8843487a7 : copyDictionary.c7bf0d81acddf9599) : '');
    const contacts = [{ name: contact.name, phone: contact.phone, url: contact.source.url }, { name: complaint.name, phone: complaint.phone, url: complaint.source.url }];
    for (const action of [...stages.flatMap(stage => stage.actions), ...generalActions])
        if (action.verification && !contacts.some(row => row.phone === action.verification!.phone))
            contacts.push({ name: action.verification.contact, phone: action.verification.phone, url: action.evidence.officialUrl });
    return { version: 1, id: 'travel-task-' + hash(canonicalTripKey(input)), generatedAt, mode, summary, readiness, route, devices, companionCount: context.companionCount, missingFields, stages, generalActions, contacts: contacts.filter((row, index) => contacts.findIndex(other => other.phone === row.phone && other.name === row.name) === index) };
}
/** Adds an explicit coverage model without exposing the capacity probe as real data. */
export function buildTravelTaskPlan(input: TravelPlanInput): TravelTaskPlan {
    const plan = compileTravelTaskPlan(input), capacity = compileTravelTaskPlan(travelCapacityInput(input));
    const completion = travelCompleteness(plan, capacity);
    const itinerary = [getTravelMeta(plan.mode).label, [plan.route.from, plan.route.to].filter(Boolean).join(' → '), plan.route.date, plan.devices.map(device => device.name).join('、')].filter(Boolean).join(' · ');
    const progress = completion.gaps.length ? copyDictionary.c3699605daefb6bd2 + completion.generated + copyDictionary.cf71d1f44d0cad6b5 + completion.total + copyDictionary.ce17d7c5df59d5452 + completion.gaps.length + copyDictionary.c22acc0f8c1e2dcba + completion.gaps.map(gap => gap.label).join('、') + copyDictionary.ceb7045746ade1315 + completion.locked + copyDictionary.c5e756648ed8ff8d0 : copyDictionary.ce3b0c44298fc1c14 + completion.generated + copyDictionary.c8a5edab282632443 + completion.total + copyDictionary.cdfbcbb733b293e5e;
    const summary = `${itinerary ? itinerary + '。' : ''}${progress}${plan.readiness === 'preparation' ? copyDictionary.cc1c11b01a26517f3 : ''}`;
    return readableTravelPlan(applyDisabilityAdvice({ ...plan, completion, summary }, input));
}
