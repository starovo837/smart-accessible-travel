import { copyDictionary } from "./app/copyDictionary.ts";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PrimaryButton } from './components/UI';
import { isStudio } from './app/deployment';
import { Welcome, SelectSituation, Consent, Home } from './features/Basics';
import { TravelQuery, travelOptions } from './features/TravelQuery';
import { TravelTaskResult } from './features/travel/TravelTaskResult';
import type { TravelGapPatch } from './features/travel/TravelGapEditor';
import { buildTravelTaskPlan } from './app/travelPlan';
import { readTravelTask, writeTravelTask, clearTravelTask, storedDeviceSpecs, travelActionSignature, exportTravelTask, type TravelTaskSnapshot } from './app/travelTaskStorage';
import { canonicalTripKey } from './app/travelTripIdentity';
import { allTravelActions, type TravelTaskPlan } from './app/travelTaskTypes';
import { diffTravelPlans, noTravelChanges } from './app/travelPlanDiff';
import { AssistantPage } from './features/Assistant';
import { HelpCard } from './features/HelpCard';
import { FittingWorkspace } from './features/FittingWorkspace';
import { FitShopping } from './features/fitting/FitShopping';
import { FeatureNav } from './components/FeatureNav';
import { BottomNav } from './components/BottomNav';
import { useFittingDraft } from './app/useFittingDraft';
import { Equipment } from './features/Equipment';
import { FeedbackDialog } from './features/Feedback';
import { LifeTools } from './features/LifeWorkspace';
import { NeedsPicker, SupportHub } from './features/SupportHub';
import { SupportToolPage } from './features/SupportToolPage';
import { supportTools, type SupportToolId } from './app/supportCatalog';
import { ReminderNotice } from './features/support/Reminders';
import { LivingHub, ScenePage } from './features/living/LivingHub';
import { LivingServicesPage } from './features/living/LivingServicesPage';
import { FacilityMap } from './features/living/FacilityMap';
import { LiveHelp } from './features/living/LiveHelp';
import { livingEntries, livingScenes, type SceneId, type ServiceToolId } from './app/livingCatalog';
import { initialLivingServices, type LivingServicesData } from './app/livingServices';
import { PageHeader } from './components/UI';
import { Encouragement, type EncouragementContext } from './components/Encouragement';
import { OfflineWorkspace } from './features/Sharing';
import { initialPrivacy, NeedsDialog, ProfilePage } from './features/Profile';
import { AboutPage } from './features/About';
import { DisabilitySelector } from './features/DisabilitySelector';
import { normalizeDisabilityProfile, type DisabilityProfile } from './app/disabilityProfile';
import { analyzeInBrowser } from './app/browserAI';
import { assistantEvidence, packEvidence } from './app/assistantEvidence';
import { ruleCatalog, ruleDocumentsFromResponse, type RuleDocument } from './app/ruleCatalog';
import { prepareService, service } from './app/service';
import { productAnalysis } from './app/mock';
import { buildTravelResults } from './app/travelRules';
import { deviceCard, initialJourney, rememberTravelSpecs } from './app/journey';
import { readSnapshot, scopeSnapshot, STORAGE_KEY } from './app/storage';
import { QuickProductIntake as ProductIntake } from './features/QuickProductIntake';
import type { IntakeDraft } from './app/intake';
import { TravelCoverage } from './features/TravelCoverage';
import { ProductInsightView } from './features/ProductInsight';
import { analyzeSources } from './app/product-api';
import { initialNeeds, localAnalysis, preserveConfirmations, type ProductSource } from './app/product';
import { readText, stopReading, downloadText } from './app/accessibility';
import type { AppSettings, ChecklistItem, ConsentState, CustomTravelDevice, CustomTravelMode, Device, DeviceCard, Feedback, JourneyData, LifeData, ModuleId, PrivacyPreferences, ProductAnalysis, Screen, TravelCheckResult, TravelContext, TravelDeviceSpecs } from './app/types';
const defaultSettings = (): AppSettings => ({ elderMode: false, stepMode: false, readAloud: false, largeText: false, textOnly: false, reducedMotion: false, encouragement: true, travelSingleStep: false, travelDisplayVersion: 2 });
const hashScreens: Record<string, Screen> = { '#fitting': 'fitting-workspace', '#home': 'home', '#welcome': 'welcome', '#shop': 'product-input', '#compare': 'fit-shopping', '#travel': 'travel-input', '#travel-plan': 'travel-result', '#daily': 'life-tools', '#assistant': 'assistant', '#profile': 'profile', '#about': 'about', '#devices': 'devices', '#device-cards': 'device-cards', '#offline': 'offline-pack', '#support': 'support', '#aid-voice': 'support', '#aid-captions': 'support', ...Object.fromEntries(supportTools.filter(tool => !['help', 'needs', 'life'].includes(tool.id)).map(tool => ['#aid-' + tool.id, 'support-tool'])), '#services': 'living-hub', ...Object.fromEntries(livingEntries.map(item => ['#aid-' + item.id, 'living-service'])), ...Object.fromEntries(livingScenes.map(scene => ['#scene-' + scene.id, 'living-scene'])) };
function load() { try {
    const portable = document.getElementById('portable-data');
    if (portable) {
        const data = readSnapshot(portable.textContent);
        return data ? { ...data, consent: 'skipped' as const } : null;
    }
    return readSnapshot(localStorage.getItem(STORAGE_KEY));
}
catch {
    return null;
} }
export default function App() {
    const [disabilityProfile, setDisabilityProfile] = useState<DisabilityProfile>(() => { try {
        return normalizeDisabilityProfile(JSON.parse(localStorage.getItem('smart-accessible-disability-v1') ?? 'null'));
    }
    catch {
        return { selections: [] };
    } });
    const moduleForCategory = { vision: 'vision', hearing: 'hearing', speech: 'speech', physical: 'mobility', intellectual: 'cognitive', mental: 'chronic' } as const;
    const changeDisabilityProfile = (value: DisabilityProfile) => { setDisabilityProfile(value); setModules(value.selections.map(item => moduleForCategory[item.category])); try {
        localStorage.setItem('smart-accessible-disability-v1', JSON.stringify(value));
    }
    catch {
        setStorageError(copyDictionary.cdd6c78eb915c2ea9);
    } };
    const fitting = useFittingDraft();
    const [travelSaved, setTravelSaved] = useState(readTravelTask);
    const [travelChecked, setTravelChecked] = useState<Record<string, string>>(travelSaved?.checked ?? {});
    const [travelPersistence, setTravelPersistence] = useState(true), [travelSaveMessage, setTravelSaveMessage] = useState(''), [travelOnline, setTravelOnline] = useState(navigator.onLine);
    useEffect(() => { const update = () => setTravelOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
    const [serviceTool, setServiceTool] = useState<ServiceToolId>(() => livingEntries.find(item => '#aid-' + item.id === location.hash)?.id ?? 'places'), [livingScene, setLivingScene] = useState<SceneId>(() => livingScenes.find(scene => '#scene-' + scene.id === location.hash)?.id ?? 'hospital');
    const [chooseNeeds, setChooseNeeds] = useState(false), [supportTool, setSupportTool] = useState<SupportToolId>(() => supportTools.find(tool => '#aid-' + tool.id === location.hash)?.id ?? 'vision');
    const [ruleDocuments, setRuleDocuments] = useState<RuleDocument[]>(ruleCatalog), [ruleMessage, setRuleMessage] = useState(''), [ruleLoading, setRuleLoading] = useState(false), [assistantContext, setAssistantContext] = useState<'product' | 'travel' | 'none'>('none'), [aiProgress, setAiProgress] = useState('');
    useEffect(() => { service<{
        documents: RuleDocument[];
    }>('rules').then(value => setRuleDocuments(ruleDocumentsFromResponse(value))).catch(() => setRuleMessage(copyDictionary.cf3b18ec47d1ceca2)); }, []);
    const requestVersion = useRef(0);
    const productRequest = useRef<AbortController | null>(null);
    const [saved, setSaved] = useState(load);
    const [screen, setScreen] = useState<Screen>(() => hashScreens[location.hash] ?? 'home'), [modules, setModules] = useState<ModuleId[]>(disabilityProfile.selections.map(item => moduleForCategory[item.category]));
    useEffect(() => { const navigate = () => { const next = hashScreens[location.hash]; if (next) {
        if (next === 'living-service') {
            const item = livingEntries.find(item => '#aid-' + item.id === location.hash);
            if (item)
                setServiceTool(item.id);
        }
        if (next === 'living-scene') {
            const scene = livingScenes.find(item => '#scene-' + item.id === location.hash);
            if (scene)
                setLivingScene(scene.id);
        }
        if (next === 'support-tool') {
            const tool = supportTools.find(tool => '#aid-' + tool.id === location.hash);
            if (tool)
                setSupportTool(tool.id);
        }
        setScreen(next);
    } }; window.addEventListener('hashchange', navigate); return () => window.removeEventListener('hashchange', navigate); }, []);
    const [consent, setConsent] = useState<ConsentState>(saved?.consent ?? 'undecided'), [privacy, setPrivacy] = useState<PrivacyPreferences>(saved?.privacy ?? initialPrivacy);
    const [devices, setDevices] = useState<Device[]>(saved?.devices ?? []), [journey, setJourney] = useState<JourneyData>(saved?.journey ?? initialJourney);
    const [settings, setSettings] = useState<AppSettings>(() => { const stored = saved?.settings, migrated = stored?.travelDisplayVersion === 2 || travelSaved?.displayVersion === 2; return { ...defaultSettings(), ...(stored ?? {}), travelSingleStep: migrated ? (travelSaved?.onlyNext ?? stored?.travelSingleStep ?? false) : false, travelDisplayVersion: 2 }; }), [customModes, setCustomModes] = useState<CustomTravelMode[]>(travelSaved?.customModes ?? saved?.customModes ?? []), [customDevices, setCustomDevices] = useState<CustomTravelDevice[]>(travelSaved?.customDevices ?? saved?.customDevices ?? []);
    const [feedback, setFeedback] = useState<Feedback[]>(saved?.feedback ?? []), [storageError, setStorageError] = useState(''), [savedAt, setSavedAt] = useState<number | null>(saved?.savedAt ?? null);
    const [help, setHelp] = useState(false), [needs, setNeeds] = useState(false), [report, setReport] = useState<string | null>(null);
    const [intakeDraft, setIntakeDraft] = useState<IntakeDraft | null>(null), [assistantDevice, setAssistantDevice] = useState('*');
    const [shoppingQuery, setShoppingQuery] = useState(copyDictionary.c4157eed714966bbc);
    const [product, setProduct] = useState<ProductAnalysis>(productAnalysis), [productInput, setProductInput] = useState<'link' | 'image'>('link'), [productValue, setProductValue] = useState(''), [productLoading, setProductLoading] = useState(false), [productError, setProductError] = useState('');
    const [travelEntryStep, setTravelEntryStep] = useState<1 | 2 | 3>(1);
    const [travelMode, setTravelMode] = useState(travelSaved?.mode ?? 'rail'), [selected, setSelected] = useState<string[]>(travelSaved?.selected ?? []), [specs, setSpecs] = useState<Record<string, TravelDeviceSpecs>>(travelSaved?.specs ?? {}), [context, setContext] = useState<TravelContext>(travelSaved?.context ?? { carrier: 'unspecified' }), [results, setResults] = useState<TravelCheckResult[]>([]), [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const allDevices = useMemo(() => [...devices.map(device => journey.cards.find(card => card.id === device.id) ?? device), ...journey.cards.filter(card => !devices.some(device => device.id === card.id))], [devices, journey.cards]);
    const travelDevices = useMemo(() => [...allDevices, ...(travelSaved?.devices ?? []).filter(device => !allDevices.some(item => item.id === device.id))], [allDevices, travelSaved]);
    const chosenTravelDevices = useMemo(() => travelOptions(travelDevices, customDevices).filter(device => selected.includes(device.id)), [travelDevices, customDevices, selected]);
    const travelInputKey = canonicalTripKey({ mode: travelMode, devices: chosenTravelDevices, specs, context, disabilityProfile });
    const travelGenerationTimes = useRef(new Map<string, number>());
    const taskPlan = useMemo(() => {
        if (travelSaved && travelSaved.inputKey === travelInputKey && !navigator.onLine)
            return travelSaved.plan;
        let now = travelGenerationTimes.current.get(travelInputKey);
        if (now === undefined) {
            const restored = travelSaved && travelSaved.inputKey === travelInputKey ? Date.parse(travelSaved.plan.generatedAt) : NaN;
            now = Number.isFinite(restored) ? restored : Date.now();
            travelGenerationTimes.current.set(travelInputKey, now);
        }
        return buildTravelTaskPlan({ mode: travelMode, devices: chosenTravelDevices, specs, context, documents: ruleDocuments, now, disabilityProfile });
    }, [travelInputKey, ruleDocuments, travelSaved, chosenTravelDevices, disabilityProfile]);
    const previousTaskPlan = useRef<TravelTaskPlan | null>(travelSaved?.lastViewedPlan ?? null);
    const [lastViewedPlan, setLastViewedPlan] = useState<TravelTaskPlan | null>(travelSaved?.lastViewedPlan ?? null);
    const [travelChanges, setTravelChanges] = useState(noTravelChanges), [travelHasBaseline, setTravelHasBaseline] = useState(false), [travelCompletionUpdate, setTravelCompletionUpdate] = useState(false);
    useEffect(() => {
        if (screen !== 'travel-result')
            return;
        const previous = previousTaskPlan.current;
        if (previous && previous.id !== taskPlan.id) {
            setTravelChanges(diffTravelPlans(previous, taskPlan));
            setTravelHasBaseline(true);
        }
        else if (!previous) {
            setTravelChanges(noTravelChanges());
            setTravelHasBaseline(false);
        }
        previousTaskPlan.current = taskPlan;
        setLastViewedPlan(taskPlan);
    }, [screen, taskPlan]);
    const completeTravelGaps = (patch: TravelGapPatch) => {
        setTravelPersistence(true);
        setTravelCompletionUpdate(true);
        setSelected(patch.deviceIds);
        setSpecs(current => ({ ...current, ...patch.specs }));
        setContext(patch.context);
        if (patch.mode)
            setTravelMode(patch.mode);
    };
    const travelSnapshot: TravelTaskSnapshot = { version: 1, mode: travelMode, selected, specs, context, devices: chosenTravelDevices.map(({ id, name, type, battery, dimensions, weight, source }) => ({ id, name, type, battery, dimensions, weight, source })), customModes, customDevices, plan: taskPlan, checked: travelChecked, savedAt: taskPlan.generatedAt, inputKey: travelInputKey, onlyNext: settings.travelSingleStep === true, displayVersion: 2, lastViewedPlan: lastViewedPlan ?? undefined };
    useEffect(() => {
        if (!travelPersistence || (!['travel-input', 'travel-result'].includes(screen) && !travelSaved))
            return;
        try {
            writeTravelTask(travelSnapshot);
            setTravelSaveMessage(copyDictionary.c8f2e5dfdea439d70);
        }
        catch {
            setTravelSaveMessage(copyDictionary.ca70f56ef9cf83fe3);
        }
    }, [screen, taskPlan, travelChecked, travelPersistence, customModes, customDevices, settings.travelSingleStep, lastViewedPlan]);
    const clearTravel = () => { try {
        clearTravelTask();
        previousTaskPlan.current = null;
        setLastViewedPlan(null);
        setTravelHasBaseline(false);
        setTravelChanges(noTravelChanges());
        setTravelCompletionUpdate(false);
        setTravelPersistence(false);
        setTravelSaved(null);
        setTravelChecked({});
        setSelected([]);
        setSpecs({});
        setContext({ carrier: 'unspecified' });
        setCustomModes([]);
        setCustomDevices([]);
        setResults([]);
        setChecklist([]);
        setTravelSaveMessage(copyDictionary.cbc96bd7a42f9133a);
        setTravelEntryStep(1);
        setScreen('travel-input');
    }
    catch {
        setTravelSaveMessage(copyDictionary.ca40bdbc1d09b2ca1);
    } };
    const evidencePack = useMemo(() => packEvidence(assistantEvidence(assistantContext === 'product' ? product : undefined, assistantContext === 'travel' ? results.filter(item => assistantDevice === '*' || item.deviceId === assistantDevice) : [])), [assistantContext, product, results, assistantDevice]);
    const assistantKey = assistantContext === 'product' ? 'product:' + product.id + ':' + product.insight?.selectedModel : assistantContext === 'travel' ? 'travel:' + assistantDevice + ':' + results.map(item => item.deviceId + item.summary + item.updatedAt).join('|') : 'none';
    const contextLabel = assistantContext === 'product' ? product.title : assistantContext === 'travel' ? assistantDevice === '*' ? copyDictionary.c901a3d0c696f685a : results.find(item => item.deviceId === assistantDevice)?.deviceName ?? copyDictionary.cc68978537cf3b65c : copyDictionary.c8c4fea9d86ac1aef;
    useEffect(() => {
        try {
            if (consent !== 'granted') {
                localStorage.removeItem(STORAGE_KEY);
                setSavedAt(null);
                return;
            }
            const snapshot = scopeSnapshot({ modules, devices, consent, settings, customModes, customDevices, journey, privacy, feedback });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            setSavedAt(snapshot.savedAt);
            setStorageError('');
        }
        catch {
            setStorageError(copyDictionary.c33da85f4a6352535);
        }
    }, [consent, modules, devices, settings, customModes, customDevices, journey, privacy, feedback]);
    useEffect(() => {
        document.body.classList.toggle('large-text', Boolean(settings.largeText));
        document.body.classList.toggle('reduce-motion', Boolean(settings.reducedMotion));
        if (!settings.readAloud)
            stopReading();
    }, [settings]);
    useEffect(() => {
        const route: Partial<Record<Screen, string>> = { home: 'home', profile: 'profile', about: 'about', devices: 'devices', 'device-cards': 'device-cards', 'offline-pack': 'offline', 'fitting-workspace': 'fitting', 'fit-shopping': 'compare', 'product-input': 'shop', 'product-result': 'shop', 'travel-input': 'travel', 'travel-result': 'travel-plan', 'life-tools': 'daily', assistant: 'assistant', welcome: 'welcome', support: 'support', 'support-tool': 'aid-' + supportTool, 'living-hub': 'services', 'living-service': 'aid-' + serviceTool, 'living-scene': 'scene-' + livingScene };
        if (route[screen])
            history.replaceState(null, '', '#' + route[screen]);
        window.scrollTo({ top: 0, behavior: 'instant' });
        const pageHeading = document.querySelector<HTMLElement>('h1');
        if (pageHeading) {
            pageHeading.tabIndex = -1;
            pageHeading.focus();
        }
        if (settings.readAloud) {
            const heading = document.querySelector('h1');
            if (heading)
                readText(heading.textContent ?? '', settings.elderMode ? .8 : 1);
        }
        return stopReading;
    }, [screen, supportTool, serviceTool, livingScene, settings.readAloud, settings.textOnly, settings.elderMode]);
    const updateLife = (updater: LifeData | ((current: LifeData) => LifeData)) => setJourney(current => { const life = typeof updater === 'function' ? updater(current.life) : updater; return { ...current, life, living: { ...current.living, doorCm: life.home.doorCm, elevatorDoorCm: life.home.elevatorDoorCm } }; });
    const saveCard = (input: DeviceCard) => {
        const v = input.values;
        const card: DeviceCard = { ...input, dimensions: [v.lengthCm ?? '?', v.widthCm ?? '?', v.heightCm ?? '?'].join(' × ') + ' cm', weight: v.weightKg ? v.weightKg + ' kg' : '', battery: v.batteryType === 'none' ? copyDictionary.c484d55613910eb8c : v.batteryWh ? v.batteryWh + ' Wh' : '' };
        setJourney(current => ({ ...current, cards: [...current.cards.filter(item => item.id !== card.id), card] }));
        setSpecs(current => ({ ...current, [card.id]: storedDeviceSpecs(card) }));
        if (!card.prospective)
            setDevices(current => [...current.filter(item => item.id !== card.id), card]);
        setResults([]);
        setChecklist([]);
    };
    const travelWithCard = (card: DeviceCard) => { setTravelPersistence(true); setSelected([card.id]); setSpecs(current => ({ ...current, [card.id]: storedDeviceSpecs(card) })); setTravelEntryStep(1); setScreen('travel-input'); };
    const selectDevices = (ids: string[]) => { setTravelPersistence(true); setSelected(ids); setSpecs(current => ({ ...current, ...Object.fromEntries(ids.map(id => { const device = travelDevices.find(item => item.id === id); return [id, current[id] ?? (device ? storedDeviceSpecs(device) : {})]; })) })); };
    const removeDevice = async (id: string) => {
        try {
            for (const item of journey.shares.filter(item => item.serverId && item.ownerToken))
                await service('shares/' + item.serverId + '/owner', undefined, item.ownerToken, undefined, 'DELETE');
        }
        catch (error) {
            setStorageError(copyDictionary.c61eb80f6e8764b50 + (error as Error).message);
            throw error;
        }
        setTravelSaved(current => current ? { ...current, devices: current.devices.filter(device => device.id !== id) } : null);
        setDevices(current => current.filter(item => item.id !== id));
        setSelected(current => current.filter(item => item !== id));
        setSpecs(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)));
        setResults([]);
        setChecklist([]);
        setJourney(current => ({ ...current, cards: current.cards.filter(item => item.id !== id), life: { ...current.life, care: current.life.care.filter(item => item.deviceId !== id), emergency: { ...current.life.emergency, medicalIds: current.life.emergency.medicalIds?.filter(key => key !== id) } }, packet: null, records: [], shares: [] }));
    };
    const deleteScope = async (scope: 'profile' | 'devices' | 'life' | 'all') => {
        if (scope === 'profile' || scope === 'all') {
            localStorage.removeItem('smart-accessible-disability-v1');
            setDisabilityProfile({ selections: [] });
        }
        if (scope === 'profile' || scope === 'all')
            fitting.clear();
        if (scope === 'life' || scope === 'all')
            for (const item of journey.life.helpSessions ?? []) {
                if (item.lastStatus !== 'revoked')
                    await service('help/' + item.id + '/owner', undefined, item.ownerToken, undefined, 'DELETE');
            }
        if (scope !== 'profile') {
            for (const share of journey.shares.filter(item => item.serverId && item.ownerToken)) {
                await service('shares/' + share.serverId + '/owner', undefined, share.ownerToken, undefined, 'DELETE');
            }
            if (scope === 'life' || scope === 'all')
                for (const item of feedback.filter(item => item.serverId && item.accessToken)) {
                    await service('cases/' + item.serverId, undefined, item.accessToken, undefined, 'DELETE');
                }
        }
        if (scope === 'devices' || scope === 'life' || scope === 'all') {
            clearTravelTask();
            previousTaskPlan.current = null;
            setLastViewedPlan(null);
            setTravelHasBaseline(false);
            setTravelChanges(noTravelChanges());
            setTravelCompletionUpdate(false);
            setTravelPersistence(false);
            setTravelSaved(null);
            setTravelChecked({});
            setContext({ carrier: 'unspecified' });
            setSelected([]);
            setSpecs({});
        }
        requestVersion.current++;
        productRequest.current?.abort();
        setProductLoading(false);
        setSaved(null);
        if (scope === 'profile' || scope === 'all') {
            setModules([]);
            setPrivacy(current => ({ ...current, profile: false }));
        }
        if (scope === 'devices' || scope === 'all') {
            setDevices([]);
            setCustomDevices([]);
            setSelected([]);
            setSpecs({});
            setResults([]);
            setChecklist([]);
            setProduct(productAnalysis);
            setIntakeDraft(null);
            setAssistantContext('none');
            setAssistantDevice('*');
            setProductValue('');
            setJourney(current => ({ ...current, cards: [], comparisons: [], records: [], packet: null, shares: [], life: { ...current.life, care: [], emergency: { ...current.life.emergency, medicalIds: [] } } }));
            setPrivacy(current => ({ ...current, devices: false }));
        }
        if (scope === 'life' || scope === 'all') {
            setAssistantContext(product.insight ? 'product' : 'none');
            setAssistantDevice('*');
            setProduct(current => ({ ...current, insight: current.insight ? { ...current.insight, needs: initialNeeds() } : undefined }));
            const base = initialJourney();
            setJourney(current => ({ ...base, cards: current.cards, comparisons: current.comparisons.map(item => ({ ...item, insight: item.insight ? { ...item.insight, needs: initialNeeds() } : undefined })) }));
            setFeedback([]);
            setCustomModes([]);
            setChecklist([]);
            setResults([]);
            setContext({ carrier: 'unspecified' });
            setPrivacy(current => ({ ...current, life: false }));
        }
        if (scope === 'all') {
            stopReading();
            setJourney(initialJourney());
            setSettings(defaultSettings());
            setConsent('undecided');
            setPrivacy(initialPrivacy());
            setScreen('home');
            setHelp(false);
            setNeeds(false);
            setReport(null);
            setProductInput('link');
            setProductError('');
            setShoppingQuery(copyDictionary.c4157eed714966bbc);
            setTravelMode('rail');
            try {
                localStorage.removeItem(STORAGE_KEY);
            }
            catch {
                setStorageError(copyDictionary.c06996404c40c26d0);
            }
        }
    };
    const cancelProduct = () => { requestVersion.current++; productRequest.current?.abort(); setProductLoading(false); setAiProgress(''); };
    const runProduct = async (sources: ProductSource[], mode: 'ai' | 'browser' | 'local' | 'sample') => {
        productRequest.current?.abort();
        const controller = new AbortController();
        productRequest.current = controller;
        const version = ++requestVersion.current;
        setProductError('');
        setAiProgress('');
        setProductLoading(true);
        const revisingProduct = screen === 'product-result';
        const needs = revisingProduct && product.insight ? product.insight.needs : { ...initialNeeds(), doorCm: journey.life.home.doorCm, elevatorDoorCm: journey.life.home.elevatorDoorCm, liftKg: journey.living.liftKg, canFold: journey.living.canFold };
        try {
            const progress = (message: string) => { if (version === requestVersion.current)
                setAiProgress(message); };
            const result = mode === 'ai' ? await analyzeSources(sources, controller.signal, progress) : mode === 'browser' ? await analyzeInBrowser(sources, progress, controller.signal) : localAnalysis(sources, mode, needs);
            if (version === requestVersion.current) {
                const next = { ...result, id: revisingProduct ? product.id : result.id, insight: result.insight ? { ...result.insight, needs: revisingProduct || ['wheelchair', 'manual-wheelchair', 'mobility-scooter', 'walker', 'rollator'].includes(result.deviceType ?? '') ? needs : initialNeeds() } : undefined };
                setProduct(revisingProduct ? preserveConfirmations(product, next) : next);
                setAssistantContext('product');
                setAssistantDevice('*');
                setScreen('product-result');
                return true;
            }
        }
        catch (error) {
            if (version === requestVersion.current && (error as Error).name !== 'AbortError')
                setProductError((error as Error).message);
        }
        finally {
            if (version === requestVersion.current) {
                setProductLoading(false);
                setAiProgress('');
            }
        }
        return false;
    };
    const runTravel = () => { setTravelCompletionUpdate(false); setTravelPersistence(true); setResults(buildTravelResults(travelMode, chosenTravelDevices, specs, context, ruleDocuments)); setAssistantContext('travel'); setAssistantDevice('*'); setScreen('travel-result'); };
    const openService = (id: ServiceToolId) => { setServiceTool(id); setScreen('living-service'); };
    const openScene = (id: SceneId) => { setLivingScene(id); setScreen('living-scene'); };
    const updateServices = (update: LivingServicesData | ((current: LivingServicesData) => LivingServicesData)) => updateLife(current => ({ ...current, services: typeof update === 'function' ? update(current.services ?? initialLivingServices()) : update }));
    const openSupportTool = (id: SupportToolId) => { if (livingEntries.some(item => item.id === id)) {
        openService(id as ServiceToolId);
        return;
    } if (id === 'help') {
        setHelp(true);
        return;
    } if (id === 'needs') {
        setNeeds(true);
        return;
    } if (id === 'life') {
        setScreen('life-tools');
        return;
    } setSupportTool(id); setScreen('support-tool'); };
    const serviceAction = (id: SupportToolId | 'fitting' | 'shop' | 'travel') => { if (id === 'fitting')
        setScreen('fitting-workspace');
    else if (id === 'shop')
        setScreen('product-input');
    else if (id === 'travel') {
        setTravelEntryStep(1);
        setScreen('travel-input');
    }
    else
        openSupportTool(id); };
    const encouragementContext: EncouragementContext | null = screen === 'home' ? 'home' : screen === 'support' ? 'support' : screen === 'living-hub' ? 'services' : screen === 'living-scene' ? 'scene' : screen === 'living-service' ? (serviceTool === 'healthcare' ? 'hospital' : 'services') : screen === 'fitting-workspace' ? 'fitting' : screen.startsWith('product') || screen === 'fit-shopping' ? 'shopping' : screen.startsWith('travel') ? 'travel' : screen === 'life-tools' || screen === 'support-tool' ? 'daily' : screen === 'assistant' ? 'assistant' : ['profile', 'devices', 'device-cards', 'offline-pack'].includes(screen) ? 'profile' : null;
    const changePrivacy = async (value: PrivacyPreferences) => { try {
        if (!value.life) {
            for (const item of journey.life.helpSessions ?? []) {
                if (item.lastStatus !== 'revoked')
                    await service('help/' + item.id + '/owner', undefined, item.ownerToken, undefined, 'DELETE');
            }
            for (const item of journey.shares.filter(item => item.serverId && item.ownerToken))
                await service('shares/' + item.serverId + '/owner', undefined, item.ownerToken, undefined, 'DELETE');
            for (const item of feedback.filter(item => item.serverId && item.accessToken))
                await service('cases/' + item.serverId, undefined, item.accessToken, undefined, 'DELETE');
            setJourney(current => ({ ...current, shares: [], life: { ...current.life, helpSessions: (current.life.helpSessions ?? []).map(item => ({ ...item, lastStatus: 'revoked' as const })) } }));
            setFeedback(current => current.filter(item => !item.serverId));
        }
        setPrivacy(value);
        setConsent('granted');
    }
    catch (error) {
        setStorageError(copyDictionary.c3518f978b2155a72 + (error as Error).message);
    } };
    return <main className={`app-shell ${settings.elderMode ? 'elder-mode' : ''} ${screen === 'fitting-workspace' ? 'fit-wide-shell' : ''}`}><a className="skip-content" href="#main-content">{copyDictionary.c006bef4da739a57b}</a><div className="app-frame" id="main-content">
    {['fitting-workspace', 'fit-shopping', 'product-input', 'product-result', 'travel-input', 'travel-result'].includes(screen) && <FeatureNav active={screen === 'home' ? 'home' : screen === 'fitting-workspace' ? 'fitting' : screen.startsWith('travel') ? 'travel' : 'shop'} onHome={() => setScreen('home')} onFitting={() => setScreen('fitting-workspace')} onShop={() => setScreen('product-input')} onTravel={() => { setTravelEntryStep(1); setScreen('travel-input'); }}/>}
    {isStudio && screen !== 'home' && <aside className="prototype-note" aria-label={copyDictionary.cc4d85f9c3ddebc0f}><strong>{copyDictionary.ce2bdd89ad4a0a9c8}</strong><p>{copyDictionary.c39df7b0795734442}</p></aside>}
    <ReminderNotice rows={journey.life.assistance?.reminders ?? []} onOpen={() => openSupportTool('reminders')}/>
    {['home', 'travel-input', 'travel-result', 'profile', 'support', 'select', 'switch-modules'].includes(screen) && <DisabilitySelector value={disabilityProfile} onChange={changeDisabilityProfile} devices={allDevices}/>}
    {document.getElementById('portable-data') && <p className="prototype-note">{copyDictionary.ca397d2dca2905ce7}</p>}
    {screen === 'welcome' && <Welcome onSelect={() => setScreen('select')}/>}
    {(screen === 'select' || screen === 'switch-modules') && <PrimaryButton onClick={() => setScreen(screen === 'switch-modules' ? 'profile' : 'consent')}>{copyDictionary.c7c9691192f1b7340}</PrimaryButton>}
    {screen === 'consent' && <Consent modules={modules} privacy={privacy} setPrivacy={setPrivacy} onConsent={() => { setConsent('granted'); setScreen('devices'); }} onSkip={() => { setConsent('skipped'); setPrivacy(initialPrivacy()); setScreen('devices'); }} onBack={() => setScreen('select')}/>}
    {(screen === 'devices' || screen === 'device-cards') && <Equipment devices={allDevices} cards={journey.cards} onSave={saveCard} onRemove={removeDevice} onTravel={travelWithCard} onBack={() => setScreen('home')}/>}
    {screen === 'home' && <Home modules={modules} settings={settings} encouragement={<Encouragement context='home' enabled={settings.encouragement !== false} onDismiss={() => setSettings(current => ({ ...current, encouragement: false }))}/>} onFitting={() => setScreen('fitting-workspace')} onProduct={() => setScreen('product-input')} onTravel={() => { setTravelEntryStep(1); setScreen('travel-input'); }} onAssistant={() => setScreen('assistant')} onProfile={() => setScreen('profile')} onDevices={() => setScreen('devices')} onOffline={() => setScreen('offline-pack')} onChoose={() => setChooseNeeds(true)} onAbout={() => setScreen('about')} onTool={openSupportTool}/>}
    {screen === 'living-hub' && <LivingHub onBack={() => setScreen('home')} onScene={openScene} onTool={openService}/>}
    {screen === 'living-scene' && <ScenePage scene={livingScene} checked={journey.life.sceneProgress?.[livingScene] ?? []} onChecked={checked => updateLife(current => ({ ...current, sceneProgress: { ...current.sceneProgress, [livingScene]: checked } }))} onAction={serviceAction} onBack={() => setScreen('home')} saved={consent === 'granted' && privacy.life}/>}
    {screen === 'living-service' && (serviceTool === 'live-help' ? <section className="screen living-services-page support-tool-page"><PageHeader title={copyDictionary.cc1ec5e0e6d50e455} subtitle={copyDictionary.c2f6b821c4e957e12} onBack={() => setScreen('home')}/><LiveHelp records={journey.life.helpSessions ?? []} onRecordsChange={helpSessions => updateLife(current => ({ ...current, helpSessions }))}/></section> : <LivingServicesPage key={serviceTool} tool={serviceTool} data={journey.life.services ?? initialLivingServices()} onChange={updateServices} onTool={serviceAction} onBack={() => setScreen('home')} saved={consent === 'granted' && privacy.life} mapSlot={<FacilityMap facilities={journey.life.services?.facilities ?? []} onSave={record => updateServices(current => ({ ...current, facilities: current.facilities.some(item => item.id === record.id) ? current.facilities.map(item => item.id === record.id ? { ...item, source: record.source, notes: (item.notes + copyDictionary.c576321743e7376fc).slice(0, 1500) } : item) : [...current.facilities, record] }))}/>}/>)}
    {screen === 'support' && <SupportHub modules={modules} onToggle={id => setModules(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])} onChoose={() => setChooseNeeds(true)} onTool={openSupportTool} onBack={() => setScreen('home')} saved={consent === 'granted' && privacy.profile}/>}
    {screen === 'support-tool' && <SupportToolPage key={supportTool} tool={supportTool} life={journey.life} setLife={updateLife} saved={consent === 'granted' && privacy.life} onBack={() => setScreen('home')} onPrivacy={() => setScreen('profile')} onHelp={() => setHelp(true)}/>}
    {screen === 'fitting-workspace' && <FittingWorkspace draft={fitting.draft} setDraft={fitting.setDraft} saveStatus={fitting.saveStatus} onClear={fitting.clear} onBack={() => setScreen('home')} onAssistant={() => setScreen('assistant')} onProfile={() => setScreen('profile')} onShop={() => setScreen('fit-shopping')} onTravel={() => { setTravelEntryStep(1); setScreen('travel-input'); }}/>}
    {screen === 'fit-shopping' && <section className="screen fitting-workspace fit-shopping-page"><h1 tabIndex={-1}>{copyDictionary.cb1806088cde1f043}</h1><FitShopping draft={fitting.draft} setDraft={fitting.setDraft} products={[...journey.comparisons, ...(product.insight ? [product] : [])]} onFitting={() => setScreen('fitting-workspace')} onAnalyze={() => setScreen('product-input')}/><button onClick={() => setScreen('product-input')}>{copyDictionary.cf21ff1926176baf5}</button></section>}
    {screen === 'product-input' && <div className="shopping-page"><div className="shopping-compare-entry"><button onClick={() => setScreen('fit-shopping')}>{copyDictionary.cc324a08328a55110}</button><p>{copyDictionary.c8a523f61083ed3a0}</p></div><ProductIntake progress={aiProgress} draft={intakeDraft} onDraftChange={setIntakeDraft} initialQuery={shoppingQuery} initialSources={product.insight?.sources} loading={productLoading} error={productError} onAnalyze={runProduct} onCancel={cancelProduct} onBack={() => setScreen('home')}/></div>}
    {screen === 'product-result' && <ProductInsightView key={product.id} product={product} setProduct={setProduct} journey={journey} devices={allDevices} setJourney={setJourney} onSaveCard={saveCard} onAssistant={() => { setAssistantContext('product'); setScreen('assistant'); }} onReport={() => setReport(copyDictionary.c5bda2ea1877f8690 + product.title)} onBack={() => setScreen('product-input')} onCards={() => setScreen('device-cards')} onTravel={card => { saveCard(card); travelWithCard(card); }} onReanalyze={runProduct} onCancel={cancelProduct} loading={productLoading} error={productError} stepMode={settings.stepMode}/>}
    {screen === 'travel-input' && <TravelQuery key={travelEntryStep} initialStep={travelEntryStep} livePreview={<section className="travel-live-preview" aria-label={copyDictionary.c9eb4aaf4d02c32f6}><h2>{taskPlan.readiness === 'preparation' ? copyDictionary.c604dad45b34f0c19 : copyDictionary.c5b076bb5b0f3c469}</h2><p role="status">{taskPlan.summary}</p>{lastViewedPlan && lastViewedPlan.id !== taskPlan.id ? <p>{copyDictionary.c99f168789c4ad007}{diffTravelPlans(lastViewedPlan, taskPlan).added.length}{copyDictionary.c9e0ed19b1e6e61f4}{diffTravelPlans(lastViewedPlan, taskPlan).removed.length}{copyDictionary.ccc9c006f62bfa8e5}{diffTravelPlans(lastViewedPlan, taskPlan).updated.length}{copyDictionary.cc8bf29372979066b}</p> : taskPlan.completion.locked > 0 ? <p>{copyDictionary.ccf0b94941acc04d4}{taskPlan.completion.estimatedAdditional}{copyDictionary.cfe73003825b5d6ed}</p> : null}<PrimaryButton onClick={runTravel}>{copyDictionary.cfe7da57aba8f3686}</PrimaryButton><p>{travelSaveMessage}</p></section>} coverage={<TravelCoverage mode={travelMode} context={context} documents={ruleDocuments} loading={ruleLoading} message={ruleMessage} onRefresh={async () => { setRuleLoading(true); try {
        await prepareService();
        const data = await service<{
            documents: RuleDocument[];
        }>('rules/refresh', {});
        setRuleDocuments(ruleDocumentsFromResponse(data));
        setRuleMessage(copyDictionary.c516483c16a3e3710);
    }
    catch {
        setRuleMessage(copyDictionary.c9d8fde0cddb0324d);
    }
    finally {
        setRuleLoading(false);
    } }}/>} mode={travelMode} setMode={setTravelMode} devices={travelDevices} customModes={customModes} setCustomModes={setCustomModes} customDevices={customDevices} setCustomDevices={setCustomDevices} selected={selected} setSelected={selectDevices} specs={specs} setSpecs={setSpecs} context={context} setContext={setContext} stepMode={settings.stepMode} loading={false} onRemember={(device, value) => saveCard(rememberTravelSpecs(journey.cards.find(card => card.id === device.id) ?? deviceCard(device), value))} onStart={runTravel} onBack={() => setScreen('home')}/>}
    {screen === 'travel-result' && <TravelTaskResult plan={taskPlan} checked={travelChecked} onToggle={action => setTravelChecked(current => ({ ...current, [action.id]: current[action.id] === travelActionSignature(action, taskPlan) ? '' : travelActionSignature(action, taskPlan) }))} devices={chosenTravelDevices} specs={specs} onSpecChange={(id, field, value) => { setTravelCompletionUpdate(true); setTravelPersistence(true); setSpecs(current => ({ ...current, [id]: { ...current[id], [field]: value } })); }} storageMessage={travelSaveMessage} online={travelOnline} onBack={() => setScreen('home')} onEdit={() => { setTravelEntryStep(1); setScreen('travel-input'); }} onChooseDevice={() => { setTravelEntryStep(2); setScreen('travel-input'); }} changes={travelChanges} hasBaseline={travelHasBaseline} completionUpdate={travelCompletionUpdate} availableDevices={travelOptions(travelDevices, customDevices)} context={context} onCompleteGaps={completeTravelGaps} onlyNext={settings.travelSingleStep === true} onOnlyNextChange={value => setSettings(current => ({ ...current, travelSingleStep: value, travelDisplayVersion: 2 }))} onExport={() => downloadText(JSON.stringify(exportTravelTask(travelSnapshot), null, 2), copyDictionary.c04cc49dca6e24d76, 'application/json')} onClear={clearTravel} onHelp={() => setHelp(true)} onReport={() => setReport(copyDictionary.cfd277b9fe1ae7043 + taskPlan.route.from + '→' + taskPlan.route.to)} onAssistant={() => { setResults(buildTravelResults(travelMode, chosenTravelDevices, specs, context, ruleDocuments).map(result => ({ ...result, summary: taskPlan.summary, nextSteps: allTravelActions(taskPlan).map(action => action.title + '：' + action.detail) }))); setAssistantContext('travel'); setScreen('assistant'); }}/>}
    {screen === 'assistant' && <AssistantPage onProduct={query => { setShoppingQuery(query); setScreen('product-input'); }} readAloud={settings.readAloud} preferBrowser={product.insight?.engine === 'webllm'} evidence={evidencePack.items} contextKey={assistantKey} contextLabel={contextLabel} omitted={evidencePack.omitted} evidenceTotal={evidencePack.total} requiresNarrowing={evidencePack.requiresNarrowing} contextControls={<section className="task-panel"><label>{copyDictionary.cfd6fb66978a90c0e}<select value={assistantContext} onChange={e => { setAssistantContext(e.target.value as typeof assistantContext); setAssistantDevice('*'); }}><option value="none">{copyDictionary.c7e2b699176c3f30a}</option>{product.insight && <option value="product">{copyDictionary.cd76bd260f588f7be}{product.title}</option>}{results.length > 0 && <option value="travel">{copyDictionary.ce00dda94f63f0330}</option>}</select></label>{assistantContext === 'travel' && results.length > 1 && <label>{copyDictionary.c0ab94185e5877cbb}<select value={assistantDevice} onChange={e => setAssistantDevice(e.target.value)}><option value="*">{copyDictionary.c0e8a6e4a4fd1d650}</option>{results.map(item => <option key={item.deviceId} value={item.deviceId}>{item.deviceName}</option>)}</select></label>}</section>} onBack={() => setScreen('home')} onTravel={slots => { if (slots.mode)
        setTravelMode(slots.mode); const option = travelOptions(allDevices, customDevices).find(item => slots.device && item.name.includes(slots.device)); selectDevices(option ? [option.id] : []); setTravelEntryStep(1); setScreen('travel-input'); }}/>}
    {screen === 'profile' && <ProfilePage onImportManagement={(cases, shares) => { setFeedback(current => [...current, ...cases.filter(item => !current.some(row => row.serverId === item.serverId))]); setJourney(current => ({ ...current, shares: [...current.shares, ...shares.filter(item => !current.shares.some(row => row.serverId === item.serverId))] })); }} modules={modules} devices={allDevices} journey={journey} consent={consent} privacy={privacy} settings={settings} feedback={feedback} storageError={storageError} savedAt={savedAt} onBack={() => setScreen('home')} onModules={() => setScreen('switch-modules')} onDevices={() => setScreen('device-cards')} onCards={() => setScreen('device-cards')} onLife={() => setScreen('life-tools')} onOffline={() => setScreen('offline-pack')} onNeeds={() => setNeeds(true)} onAbout={() => setScreen('about')} onPrivacy={changePrivacy} onDelete={deleteScope}/>}
    {screen === 'about' && <AboutPage onBack={() => setScreen('home')}/>}
    {screen === 'life-tools' && <LifeTools saved={consent === 'granted' && privacy.life} onPrivacy={() => setScreen('profile')} life={journey.life} setLife={updateLife} journey={journey} setJourney={setJourney} devices={allDevices} onBack={() => setScreen('home')} onHelp={() => setHelp(true)} onOffline={() => setScreen('offline-pack')}/>}
    {screen === 'offline-pack' && <OfflineWorkspace journey={journey} devices={allDevices} onBack={() => setScreen('home')}/>}
    {encouragementContext && screen !== 'home' && <div className="page-encouragement"><Encouragement key={screen + ':' + supportTool + ':' + serviceTool} context={encouragementContext} enabled={settings.encouragement !== false} onDismiss={() => setSettings(current => ({ ...current, encouragement: false }))}/></div>}
    {productLoading && aiProgress && screen === 'product-result' && <p className="operation-status" role="status">{aiProgress}</p>}
    {(screen === 'home' || screen === 'living-hub' || screen === 'support' || screen === 'profile') && <BottomNav active={screen} onNavigate={setScreen}/>}
    {storageError && screen !== 'profile' && <p className="storage-error" role="alert">{storageError}</p>}
  </div>
    {chooseNeeds && <Modal title={copyDictionary.c73e604f285c89e61} onClose={() => setChooseNeeds(false)}><DisabilitySelector value={disabilityProfile} onChange={changeDisabilityProfile} devices={allDevices}/><PrimaryButton onClick={() => setChooseNeeds(false)}>{copyDictionary.cc0b3fbff51ccc40b}</PrimaryButton></Modal>}
    {help && <HelpCard life={journey.life} setLife={updateLife} devices={allDevices} onClose={() => setHelp(false)}/>}
    {needs && <NeedsDialog settings={settings} setSettings={setSettings} onClose={() => setNeeds(false)}/>}
    {report && <FeedbackDialog subject={report} onSave={item => setFeedback(current => [...current, item])} onClose={() => setReport(null)}/>}
  </main>;
}
