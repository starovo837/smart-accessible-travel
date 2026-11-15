import { copyDictionary } from "../app/copyDictionary.ts";
import { CampusEmblem } from '../components/CampusEmblem';
import { useState } from 'react';
import { Icon } from '../components/Icons';
import { AppMark, PageHeader, PrimaryButton, ProgressDots } from '../components/UI';
import { moduleMeta } from '../app/mock';
import { shoppingPlatforms, shoppingUrl } from '../app/catalog';
import { PrivacyOptions } from './Profile';
import type { SupportToolId } from '../app/supportCatalog';
import { Workbench } from './Workbench';
import type { WorkbenchTarget } from '../app/workbench';
import type { AppSettings, ModuleId, PrivacyPreferences } from '../app/types';
const allModules: ModuleId[] = ['vision', 'hearing', 'mobility', 'speech', 'cognitive', 'chronic'];
export function Welcome({ onSelect }: {
    onSelect: () => void;
}) {
    return <section className="screen welcome-screen"><div className="welcome-top"><AppMark /><span className="brand-name">{copyDictionary.c4ec7c5b9618b5554}</span><CampusEmblem /></div><div className="welcome-hero"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-illustration"><Icon name="wheelchair" size={74}/><Icon name="train" size={42}/></div><h1>{copyDictionary.cd38ce61c2ad725f8}<br /><strong>{copyDictionary.c26cf9cfec6c7a23d}</strong></h1><p>{copyDictionary.cdbbee19c94b2d11a}</p></div><div className="welcome-actions"><PrimaryButton icon="list" onClick={onSelect}>{copyDictionary.c0fa856a2456fea85}<Icon name="chevron" size={20}/></PrimaryButton></div><p className="support-note"><Icon name="lock" size={16}/>{copyDictionary.c70f1bd93b08a2f7f}</p></section>;
}
export function SelectSituation({ modules, toggleModule, onNext, onBack, title = copyDictionary.c0fa856a2456fea85, subtitle = copyDictionary.c430fb993580139b2 }: {
    modules: ModuleId[];
    toggleModule: (id: ModuleId) => void;
    onNext: () => void;
    onBack: () => void;
    title?: string;
    subtitle?: string;
}) {
    return <section className="screen"><PageHeader title={title} subtitle={subtitle} onBack={onBack}/><ProgressDots step={1}/><div className="module-grid">{allModules.map((id) => { const meta = moduleMeta[id]; const active = modules.includes(id); return <button key={id} className={`module-card ${active ? 'selected' : ''}`} aria-pressed={active} onClick={() => toggleModule(id)}><div className="module-icon"><Icon name={meta.icon as any} size={30}/></div><div><strong>{meta.label}</strong><span>{meta.detail}</span></div><span className="selection-mark">{active ? <Icon name="check" size={18}/> : ''}</span></button>; })}</div><div className="bottom-sticky"><p>{modules.length ? copyDictionary.c3b2ee82dd97c5c96 + modules.length + copyDictionary.c9b17e3fd06c21c26 : copyDictionary.c66e746011c3407b3}</p><PrimaryButton onClick={onNext}>{copyDictionary.cacfc4e74a650e7df}<Icon name="arrow" size={19}/></PrimaryButton></div></section>;
}
export function Consent({ modules, onConsent, onSkip, onBack, privacy, setPrivacy }: {
    modules: ModuleId[];
    onConsent: () => void;
    onSkip: () => void;
    onBack: () => void;
    privacy: PrivacyPreferences;
    setPrivacy: (value: PrivacyPreferences) => void;
}) {
    return <section className="screen"><PageHeader title={copyDictionary.c1a5644fda8a75a43} subtitle={copyDictionary.c00fef93e89f57472} onBack={onBack}/><ProgressDots step={2}/><div className="consent-hero"><div className="privacy-symbol"><Icon name="lock" size={44}/></div><h2>{copyDictionary.c863640b9298bd56a}</h2><p>{copyDictionary.c0c61dc897994a9db}</p></div><div className="consent-summary"><span>{copyDictionary.c19b9a0d14d49ccfc}</span><div>{modules.map((id) => <span className="soft-chip" key={id}>{moduleMeta[id].label}</span>)}</div></div><PrivacyOptions value={privacy} onChange={setPrivacy}/><div className="consent-actions"><PrimaryButton icon="lock" onClick={onConsent}>{copyDictionary.ceedb104981a0ffb9}</PrimaryButton><PrimaryButton variant="ghost" onClick={onSkip}>{copyDictionary.c5933b79d59e1515a}</PrimaryButton></div></section>;
}
interface HomeProps {
    modules: ModuleId[];
    settings: AppSettings;
    encouragement?: import('react').ReactNode;
    onFitting: () => void;
    onProduct: () => void;
    onTravel: () => void;
    onAssistant: () => void;
    onProfile: () => void;
    onDevices: () => void;
    onOffline: () => void;
    onChoose: () => void;
    onAbout: () => void;
    onTool: (id: SupportToolId) => void;
}
export function Home({ modules, settings, encouragement, onFitting, onProduct, onTravel, onAssistant, onProfile, onDevices, onOffline, onChoose, onAbout, onTool }: HomeProps) {
    const onAction = (target: WorkbenchTarget) => {
        switch (target) {
            case 'fitting':
                onFitting();
                break;
            case 'shop':
                onProduct();
                break;
            case 'travel':
                onTravel();
                break;
            case 'assistant':
                onAssistant();
                break;
            case 'profile':
                onProfile();
                break;
            case 'devices':
                onDevices();
                break;
            case 'offline':
                onOffline();
                break;
            case 'about':
                onAbout();
                break;
            case 'choose-needs':
                onChoose();
                break;
            default: onTool(target);
        }
    };
    return <Workbench modules={modules} settings={settings} encouragement={encouragement} onAction={onAction}/>;
}
export function ProductInput({ input, setInput, value, setValue, error, loading, onStart, onBack, initialQuery }: {
    input: 'link' | 'image';
    setInput: (type: 'link' | 'image') => void;
    value: string;
    setValue: (value: string) => void;
    error?: string;
    loading: boolean;
    onStart: () => void;
    onBack: () => void;
    initialQuery?: string;
}) {
    const [shoppingQuery, setShoppingQuery] = useState(initialQuery ?? copyDictionary.c4157eed714966bbc);
    const [platform, setPlatform] = useState<typeof shoppingPlatforms[number]['id']>('jd');
    return <section className="screen"><PageHeader title={copyDictionary.c4a98f083f7fe73b2} subtitle={copyDictionary.c49c1359484a0cf78} onBack={onBack}/><div className="shopping-entry"><div className="shopping-entry-head"><div className="preview-icon"><Icon name="cart" size={22}/></div><div><strong>{copyDictionary.cd4bebfd2f8d860fb}</strong><p>{copyDictionary.c50ca51565b39cc6a}</p></div></div><label className="big-input">{copyDictionary.cc0eff9ccf638f320}<input value={shoppingQuery} onChange={(e) => setShoppingQuery(e.target.value)} placeholder={copyDictionary.c066dfb6a4b7b008f}/></label><div className="shopping-presets" aria-label={copyDictionary.cd1a6eddb4ed59c28}>{[copyDictionary.c4157eed714966bbc, copyDictionary.c53d3e902cac8f783, copyDictionary.cbc4a33ffc596d34c, copyDictionary.cdc2ed4c62c4097ac, copyDictionary.c9195ed0c54ce5cac, copyDictionary.c5e88c40945c85c49].map((name) => <button key={name} aria-pressed={shoppingQuery === name} onClick={() => setShoppingQuery(name)}>{name}</button>)}</div><div className="platform-grid">{shoppingPlatforms.map((item) => <button className={`platform-card ${platform === item.id ? 'active' : ''}`} key={item.id} onClick={() => setPlatform(item.id)} aria-pressed={platform === item.id}>{item.label}<small>{item.domain}</small></button>)}</div><a className="button button-primary button-link" href={shoppingUrl(shoppingPlatforms.find((item) => item.id === platform) ?? shoppingPlatforms[0], shoppingQuery || copyDictionary.cc0ef02c12f8eb71e)} target="_blank" rel="noopener noreferrer"><Icon name="arrow" size={19}/>{copyDictionary.cc771248e511fbf93}{shoppingPlatforms.find((item) => item.id === platform)?.label}{copyDictionary.ca394a30f42306fcf}</a><p className="catalog-hint">{copyDictionary.cc5465b862d9e6ae6}</p></div><button className="text-action" onClick={() => { setInput('link'); setValue('demo'); }}>{copyDictionary.ca4f761c36820dbe4}</button><div className="shopping-divider"><span>{copyDictionary.c5c23102055bf6bec}</span></div><div className="input-tabs" role="tablist"><button className={input === 'link' ? 'active' : ''} onClick={() => setInput('link')} aria-selected={input === 'link'} role="tab">{copyDictionary.cbc8ea4f68ba74214}</button><button className={input === 'image' ? 'active' : ''} onClick={() => setInput('image')} aria-selected={input === 'image'} role="tab">{copyDictionary.ceb7c5511904bc0ed}</button></div>{input === 'link' ? <label className="big-input">{copyDictionary.c282bbc888126f1b0}<input aria-invalid={Boolean(error)} value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://…"/><span className="input-hint"><Icon name="info" size={16}/>{copyDictionary.c14ae7073a272325a}</span></label> : <label className="upload-box"><Icon name="upload" size={35}/><strong>{value || copyDictionary.ca7226c73469f71d8}</strong><span>{copyDictionary.c1ac677df4ca70871}</span><input type="file" accept="image/*" onChange={(e) => setValue(e.target.files?.[0]?.name || '')}/></label>}{error && <p role="alert" className="form-error">{error}</p>}<div className="analysis-preview"><div className="preview-icon"><Icon name="spark" size={24}/></div><div><strong>{copyDictionary.c0cbdde8d75294600}</strong><p>{copyDictionary.c7ec2207b97d44ea2}</p></div></div><div className="bottom-sticky"><PrimaryButton onClick={onStart} disabled={loading || !value}>{loading ? copyDictionary.c9f1dc48146795aa9 : copyDictionary.ca35bf3d0941627aa}<Icon name="arrow" size={19}/></PrimaryButton></div></section>;
}
