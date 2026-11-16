import { copyDictionary } from "../app/copyDictionary.ts";
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, PageHeader, PrimaryButton, SectionTitle } from '../components/UI';
import { ManagementBackup } from './ManagementBackup';
import { CaseTracking } from './CaseTracking';
import { moduleMeta } from '../app/mock';
import { downloadText } from '../app/accessibility';
import type { AppSettings, ConsentState, Device, Feedback, JourneyData, ModuleId, PrivacyPreferences } from '../app/types';
export const initialPrivacy = (): PrivacyPreferences => ({ profile: false, devices: false, life: false, retainDays: 30 });
export function PrivacyOptions({ value, onChange, disabled = false }: {
    value: PrivacyPreferences;
    onChange: (value: PrivacyPreferences) => void;
    disabled?: boolean;
}) {
    return <div className="privacy-options" aria-busy={disabled}>
    {([['profile', copyDictionary.ccb2c401d1ed2a50e], ['devices', copyDictionary.c3a47da3d1057d0e2], ['life', copyDictionary.cc77f461e03a0f571]] as const).map(([id, label]) => <label key={id} className="switch-line"><input type="checkbox" disabled={disabled} checked={value[id]} onChange={event => onChange({ ...value, [id]: event.target.checked })}/>{label}</label>)}
    <p>{copyDictionary.cd21c4984b6747caa}</p>
    <label>{copyDictionary.cece74c6f431da077}<select disabled={disabled} value={value.retainDays} onChange={event => onChange({ ...value, retainDays: Number(event.target.value) as PrivacyPreferences['retainDays'] })}><option value="7">{copyDictionary.c38eefacbb326e37f}</option><option value="30">{copyDictionary.c84ad2952a3089ce7}</option><option value="0">{copyDictionary.ce97f3d63f2404a7c}</option></select></label>
  </div>;
}
export function NeedsDialog({ settings, setSettings, onClose }: {
    settings: AppSettings;
    setSettings: (value: AppSettings) => void;
    onClose: () => void;
}) {
    return <Modal title={copyDictionary.cb5ed7202bc71b525} onClose={onClose}>
    <p>{copyDictionary.c7e110f68a1a1e375}</p>
    {([['elderMode', copyDictionary.cba68f91b99c55763], ['largeText', copyDictionary.c3909003a534c30b5], ['textOnly', copyDictionary.c32f9e39133a6d698], ['stepMode', copyDictionary.c3e052819bd664312], ['travelSingleStep', copyDictionary.c8419b2f270e3c8d8], ['reducedMotion', copyDictionary.c5cd28dd82f52e6e7], ['readAloud', copyDictionary.c3529f509b4b7c5ef], ['encouragement', copyDictionary.c88d8bc9ed6abca73]] as const).map(([key, label]) => <label className="switch-line" key={key}><input type="checkbox" checked={key === 'encouragement' ? settings.encouragement !== false : key === 'travelSingleStep' ? settings.travelSingleStep !== false : Boolean(settings[key])} onChange={event => setSettings({ ...settings, [key]: event.target.checked, ...(key === 'stepMode' && event.target.checked ? { travelSingleStep: true } : {}), ...(key === 'elderMode' ? { largeText: event.target.checked, stepMode: event.target.checked, travelSingleStep: event.target.checked, reducedMotion: event.target.checked } : {}) })}/>{label}</label>)}
    <p className="prototype-note">{copyDictionary.c969d7345808434da}</p>
    <PrimaryButton onClick={onClose}>{copyDictionary.cc0b3fbff51ccc40b}</PrimaryButton>
  </Modal>;
}
interface Props {
    disabilityEditor: ReactNode;
    modules: ModuleId[];
    devices: Device[];
    journey: JourneyData;
    consent: ConsentState;
    privacy: PrivacyPreferences;
    settings: AppSettings;
    feedback: Feedback[];
    storageError: string;
    savedAt: number | null;
    onBack: () => void;
    onModules: () => void;
    onDevices: () => void;
    onCards: () => void;
    onLife: () => void;
    onOffline: () => void;
    onImportManagement: (cases: Feedback[], shares: import('../app/types').LocalShare[]) => void;
    onNeeds: () => void;
    onAbout: () => void;
    onPrivacy: (value: PrivacyPreferences) => void | Promise<void>;
    onDelete: (scope: 'profile' | 'devices' | 'life' | 'all') => Promise<void>;
}
export function ProfilePage(props: Props) {
    const [view, setView] = useState<'privacy' | 'feedback' | 'disability' | null>(null);
    const [confirm, setConfirm] = useState<'profile' | 'devices' | 'life' | 'all' | null>(null);
    const [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState('');
    const [savingPrivacy, setSavingPrivacy] = useState(false);
    return <section className="screen profile-screen"><PageHeader title={copyDictionary.c7f1d9dd04cd1c7b8} subtitle={copyDictionary.c1e454c9f90f3df54} onBack={props.onBack}/>
    <PrimaryButton variant="secondary" onClick={props.onAbout}>{copyDictionary.c0ed77920b1cd8737}</PrimaryButton>
    <p className="prototype-note">{props.consent === 'granted' ? copyDictionary.c623973acda759aa6 : copyDictionary.ca839550b11812ea2}{copyDictionary.c1fc3a60272047405}</p>
    <PrimaryButton variant="secondary" onClick={props.onNeeds}>{copyDictionary.ca61502d462ac452e}</PrimaryButton>
    <section className="profile-section"><SectionTitle title={copyDictionary.cb7489d5fe4608bbb}/><p>{props.modules.map(id => moduleMeta[id].label).join('、') || copyDictionary.cbe87d51c09448414}</p><button className="text-action" onClick={() => setView('disability')}>{copyDictionary.ccbdcf9e5aea1edda}</button></section>
    {view === 'disability' && <Modal title={copyDictionary.c73e604f285c89e61} onClose={() => setView(null)}>{props.disabilityEditor}<PrimaryButton onClick={() => setView(null)}>{copyDictionary.cc0b3fbff51ccc40b}</PrimaryButton></Modal>}
    <div className="profile-menu"><button onClick={props.onDevices}>{copyDictionary.c9c6516d13fa3ea78}<span>{props.devices.length}{copyDictionary.cdb5ed74bd688fafe}</span></button><button onClick={props.onLife}>{copyDictionary.cdb44e73ea492e0c9}</button><button onClick={props.onOffline}>{copyDictionary.c93f004ab9ea94276}</button><button onClick={() => setView('feedback')}>{copyDictionary.cb1761897488b09cd}<span>{props.feedback.length}{copyDictionary.c6fb2840d568a340f}</span></button><button onClick={() => setView('privacy')}>{copyDictionary.cd51db0e607273cd9}</button></div>
    {props.storageError && <p role="alert" className="form-error">{props.storageError}</p>}
    {view === 'privacy' && <Modal title={copyDictionary.cd51db0e607273cd9} onClose={() => { if (!savingPrivacy)
            setView(null); }}>
      <p>{copyDictionary.cddeed41cd01caba9}</p>
      <p>{copyDictionary.c8ac901510424b169}</p>
      <PrivacyOptions value={props.privacy} disabled={savingPrivacy} onChange={async (value) => { setSavingPrivacy(true); try {
            await props.onPrivacy(value);
        }
        finally {
            setSavingPrivacy(false);
        } }}/>
      {savingPrivacy && <p role="status">{copyDictionary.cd0679f51369d8a93}</p>}
      {props.storageError && <p role="alert">{props.storageError}</p>}
      <p>{copyDictionary.cb2e3a8332c3f909a}{props.savedAt ? new Date(props.savedAt).toLocaleString('zh-CN') : copyDictionary.c6a1be012c99c34e8}</p>
      <p>{copyDictionary.c1cd866cc723f30c5}</p>
      <p>{copyDictionary.cb60a3553835f0a44}</p><div className="profile-menu"><button onClick={() => { setView(null); setConfirm('profile'); }}>{copyDictionary.c3ff99ac16884bc24}</button><button onClick={() => { setView(null); setConfirm('devices'); }}>{copyDictionary.ceaba318f9a0d2ed3}</button><button onClick={() => { setView(null); setConfirm('life'); }}>{copyDictionary.c1db351fafd39c77a}</button><button className="danger-link" onClick={() => { setView(null); setConfirm('all'); }}>{copyDictionary.cee272e716df1413e}</button></div>
      <p className="prototype-note">{copyDictionary.c58932335742bedc5}</p>
    </Modal>}
    {view === 'feedback' && <Modal title={copyDictionary.cb1761897488b09cd} onClose={() => setView(null)}><CaseTracking items={props.feedback}/><ManagementBackup cases={props.feedback} shares={props.journey.shares} onImport={props.onImportManagement}/><p>{copyDictionary.cb6ce16e21ed52343}</p><PrimaryButton disabled={!props.feedback.length} onClick={() => downloadText(JSON.stringify(props.feedback, null, 2), copyDictionary.ca4e313001241fef7, 'application/json')}>{copyDictionary.c77d8fadb89b738b9}</PrimaryButton></Modal>}
    {confirm && <Modal title={copyDictionary.caf9907d3b1338e4f} onClose={() => { if (!deleting)
        setConfirm(null); }}><p>{copyDictionary.c7dd59a9afe3d9f9d}{confirm === 'all' ? copyDictionary.caac421f5c51d969b : copyDictionary.c71b08673fb7e60d3}{copyDictionary.ced62c8901072d185}</p><div className="action-row"><PrimaryButton variant="ghost" onClick={() => setConfirm(null)}>{copyDictionary.c0c707fed9d24e011}</PrimaryButton><PrimaryButton variant="danger" disabled={deleting} onClick={async () => { setDeleting(true); setDeleteError(''); try {
        await props.onDelete(confirm);
        setConfirm(null);
        setView(null);
    }
    catch (error) {
        setDeleteError((error as Error).message);
    }
    finally {
        setDeleting(false);
    } }}>{deleting ? copyDictionary.cbd67560b9e5d99b8 : copyDictionary.ca3ea3c17b401bd2f}</PrimaryButton></div>{deleteError && <p role="alert">{deleteError}</p>}</Modal>}
    <details className="campus-credit"><summary>{copyDictionary.c7c5933429b5d040e}</summary><p>{copyDictionary.cd82755be8f937c4a}<a href="https://commons.wikimedia.org/wiki/File:Auditorium_and_Fountain_in_Southeast_University_2012-09.JPG" target="_blank" rel="noopener noreferrer">{copyDictionary.c9d1cf922797167b4}</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>{copyDictionary.c7197f05cb6cf02c2}</p></details>
  </section>;
}
