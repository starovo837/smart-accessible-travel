import { copyDictionary } from "../app/copyDictionary.ts";
import { useState, type Dispatch, type SetStateAction } from 'react';
import { Modal, PrimaryButton } from '../components/UI';
import { copyText, downloadText, phoneLink, readText, stopReading } from '../app/accessibility';
import type { Device, LifeData } from '../app/types';
const phrases = [copyDictionary.c8c369db3d5102f01, copyDictionary.c027599a07d4635a9, copyDictionary.c2dc24328ed25b142, copyDictionary.ca72a5f498cc25b28, copyDictionary.cb7578e689d3c923c, copyDictionary.ca1f4c835ea8c6e27];
export function HelpCard({ life, setLife, devices, onClose }: {
    life: LifeData;
    setLife: Dispatch<SetStateAction<LifeData>>;
    devices: Device[];
    onClose: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [status, setStatus] = useState('');
    const profile = life.emergency;
    const update = (fields: Partial<LifeData['emergency']>) => setLife(current => ({ ...current, emergency: { ...current.emergency, ...fields } }));
    const medical = devices.filter(device => (profile.medicalIds ?? []).includes(device.id));
    const content = [profile.helpText, profile.location ? copyDictionary.cc9ec00f66aad056d + profile.location : '', profile.caregiver ? copyDictionary.c48cd63a7e4cae030 + profile.caregiver : '', profile.phone ? copyDictionary.ccfd95f0ea62821b0 + profile.phone : '', profile.showMedical && medical.length ? copyDictionary.c8c0f64094ea6397f + medical.map(device => `${device.name}；${device.dimensions || copyDictionary.c47babeed7cfbedbb}；${device.battery || copyDictionary.c3a7bee11c98fcccd}`).join('\n') : '', profile.staffReply ? copyDictionary.ce25f5ce25ac91185 + profile.staffReply : ''].filter(Boolean).join('\n');
    const dial = phoneLink(profile.phone);
    return <Modal title={editing ? copyDictionary.c13c9e39372d9b358 : copyDictionary.cadc1dde18d3205d7} onClose={() => { stopReading(); onClose(); }} fullScreen>
    {editing ? <>
      <p>{copyDictionary.cda4fe4f8d743c528}</p>
      <label>{copyDictionary.ce7ca0730ea108ee0}<textarea value={profile.helpText} onChange={event => update({ helpText: event.target.value })}/></label>
      <label>{copyDictionary.cbd9f3a83a8c8ce65}<input value={profile.caregiver} onChange={event => update({ caregiver: event.target.value })}/></label>
      <label>{copyDictionary.cd6981829142aa3dc}<input inputMode="tel" value={profile.phone} onChange={event => update({ phone: event.target.value })} placeholder={copyDictionary.c3ceb963a800172c8}/></label>
      <label>{copyDictionary.c7dd69a07985d3196}<input value={profile.location ?? ''} onChange={event => update({ location: event.target.value })} placeholder={copyDictionary.c2263fad706ff7b81}/></label>
      <label className="switch-line"><input type="checkbox" checked={profile.showMedical} onChange={event => update({ showMedical: event.target.checked })}/>{copyDictionary.c5e392d06066607da}</label>
      {profile.showMedical && (devices.length ? devices.map(device => <label className="switch-line" key={device.id}><input type="checkbox" checked={(profile.medicalIds ?? []).includes(device.id)} onChange={event => update({ medicalIds: event.target.checked ? [...(profile.medicalIds ?? []), device.id] : (profile.medicalIds ?? []).filter(id => id !== device.id) })}/>{device.name}</label>) : <p>{copyDictionary.ccd6843c783929bc7}</p>)}
      <PrimaryButton onClick={() => setEditing(false)}>{copyDictionary.c57ce23be33c2a43f}</PrimaryButton>
    </> : <>
      <div className="help-display" role="region" aria-label={copyDictionary.c7ab2fd3de0ff4011}><p>{profile.helpText || copyDictionary.c5a454a54022cd6ba}</p>{profile.location && <p>{profile.location}</p>}{profile.caregiver && <p>{copyDictionary.c48cd63a7e4cae030}{profile.caregiver}</p>}{profile.phone && <p>{profile.phone}</p>}{profile.showMedical && medical.map(device => <p key={device.id}>{device.name} · {device.dimensions || copyDictionary.c7924cee95748ca72}</p>)}</div>
      <div className="phrase-list" aria-label={copyDictionary.cce9fa7224966ebf4}>{phrases.map(phrase => <button key={phrase} aria-pressed={profile.helpText === phrase} onClick={() => update({ helpText: phrase })}>{phrase}</button>)}</div>
      <label>{copyDictionary.cf217c35fa1419879}<textarea value={profile.staffReply ?? ''} onChange={event => update({ staffReply: event.target.value })} placeholder={copyDictionary.cbfa574a1fa4ac56f}/></label>
      <div className="action-row"><PrimaryButton icon="volume" onClick={async () => { if (await readText(content)) setStatus(copyDictionary.speechCompleted); }}>{copyDictionary.c9b742dd399d91366}</PrimaryButton><PrimaryButton variant="ghost" onClick={() => { stopReading(); setStatus(copyDictionary.c6a7c1a94d4b82021); }}>{copyDictionary.c6113d2b22a57df3a}</PrimaryButton></div>
      {dial ? <a className="button button-primary" href={dial}>{copyDictionary.c5aecd0fe5bfe970e}</a> : <p>{copyDictionary.c9b97bb78929949a7}</p>}
      <PrimaryButton variant="secondary" icon="copy" onClick={async () => setStatus(await copyText(content) ? copyDictionary.cb95b86070a37dd83 : copyDictionary.c9671d3230cff2db7)}>{copyDictionary.cc3720a7f651ac618}</PrimaryButton>
      <PrimaryButton variant="ghost" onClick={() => { downloadText(content, copyDictionary.c57fabf6273329e6b); setStatus(copyDictionary.cec8a93de340f9724); }}>{copyDictionary.c4140c80a051c511d}</PrimaryButton>
      <button className="text-action" onClick={() => setEditing(true)}>{copyDictionary.cce47aa80a3e028e1}</button>
    </>}
    <p className="operation-status" role="status">{status}</p>
    <p className="prototype-note">{copyDictionary.cabd9d09d2d9faabf}</p>
  </Modal>;
}
