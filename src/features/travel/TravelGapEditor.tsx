import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useId, useRef, useState } from 'react';
import { travelModes } from '../../app/catalog';
import { requiresTravelBattery, requiresTravelDimensions } from '../../app/travelCompleteness';
import { storedDeviceSpecs } from '../../app/travelTaskStorage';
import type { Device, TravelContext, TravelDeviceSpecs } from '../../app/types';
export interface TravelGapPatch {
    deviceIds: string[];
    specs: Record<string, TravelDeviceSpecs>;
    context: TravelContext;
    mode?: string;
}
interface Props {
    focusGap: string;
    focusRequest?: number;
    availableDevices: Device[];
    devices: Device[];
    specs: Record<string, TravelDeviceSpecs>;
    context: TravelContext;
    mode: string;
    gaps: {
        id: string;
        label: string;
        deviceIds?: string[];
    }[];
    onApply: (patch: TravelGapPatch) => void;
    onCancel: () => void;
}
/** Draft changes stay in this form until the user saves; never inserts example values. */
export function TravelGapEditor(props: Props) {
    const id = useId(), form = useRef<HTMLFormElement>(null), [deviceIds, setDeviceIds] = useState(() => props.devices.map(device => device.id)), [specs, setSpecs] = useState(() => structuredClone(props.specs)), [context, setContext] = useState(() => ({ ...props.context })), [mode, setMode] = useState(props.mode);
    const options = [...props.availableDevices, ...props.devices].filter((device, index, all) => all.findIndex(item => item.id === device.id) === index);
    const selected = options.filter(device => deviceIds.includes(device.id));
    const [message, setMessage] = useState('');
    const gapIds = props.gaps.map(gap => gap.id);
    useEffect(() => {
        const deviceId = props.gaps.find(gap => gap.id === props.focusGap)?.deviceIds?.[0];
        const fields = Array.from(form.current?.querySelectorAll<HTMLElement>(`[data-gap-field="${props.focusGap}"]`) ?? []);
        const matching = fields.filter(field => !deviceId || field.closest('fieldset')?.getAttribute('data-device-id') === deviceId);
        const target = (matching.find(field => field instanceof HTMLInputElement && !field.value) || matching[0])
            ?? form.current?.querySelector<HTMLElement>('[data-gap-field="devices"]')
            ?? form.current?.querySelector<HTMLElement>('input,select');
        target?.focus();
    }, [props.focusGap, props.focusRequest]);
    const update = (deviceId: string, field: keyof TravelDeviceSpecs, value: unknown) => setSpecs(current => ({ ...current, [deviceId]: { ...current[deviceId], [field]: value } }));
    return <form ref={form} className="travel-gap-editor" aria-labelledby={id + '-heading'} onSubmit={event => { event.preventDefault(); props.onApply({ deviceIds, specs, context, mode }); }}>
    <h2 id={id + '-heading'}>{copyDictionary.c0564bf96f77b2515}</h2>
    <p>{copyDictionary.cad267c9d4e7e31b4}</p>
    {gapIds.includes('mode') && <label htmlFor={id + '-mode'}>{copyDictionary.ce9b0e57eec5b8a99}<select id={id + '-mode'} data-gap-field="mode" value={mode} onChange={event => setMode(event.target.value)}><option value="">{copyDictionary.ca04880ee594c6687}</option>{travelModes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
    {(gapIds.includes('from') || gapIds.includes('to')) && <div className="field-grid two">
      <label htmlFor={id + '-from'}>{copyDictionary.c4bffaae6f10862e8}<input id={id + '-from'} data-gap-field="from" value={context.from ?? ''} maxLength={80} onChange={event => setContext(current => ({ ...current, from: event.target.value }))}/></label>
      <label htmlFor={id + '-to'}>{copyDictionary.cc97120cdf6d722d0}<input id={id + '-to'} data-gap-field="to" value={context.to ?? ''} maxLength={80} onChange={event => setContext(current => ({ ...current, to: event.target.value }))}/></label>
    </div>}
    <label htmlFor={id + '-device'}>{copyDictionary.c4b420ddf015b4dbf}<select id={id + '-device'} data-gap-field="devices" value="" onChange={event => { const deviceId = event.target.value, device = options.find(item => item.id === deviceId); if (device) {
        setDeviceIds(current => [...current, deviceId]);
        setSpecs(current => ({ ...current, [deviceId]: current[deviceId] ?? storedDeviceSpecs(device) }));
        setMessage(copyDictionary.c5426666d9c08c66e);
    } }}><option value="">{copyDictionary.c57def7f4644de73b}</option>{options.filter(device => !deviceIds.includes(device.id)).map(device => <option key={device.id} value={device.id}>{device.name}</option>)}</select></label>
    {selected.length === 0 && <p>{copyDictionary.cc7099a8500b4b005}</p>}
    {selected.map(device => <fieldset key={device.id} data-device-id={device.id}><legend>{device.name}</legend>
      <button type="button" aria-label={copyDictionary.c7c0e0496dfeaa0c5 + device.name} onClick={() => setDeviceIds(current => current.filter(value => value !== device.id))}>{copyDictionary.cebfef41c4e784a59}</button>
      {requiresTravelDimensions(device.type) ? <div className="field-grid two">{([['lengthCm', copyDictionary.c597ae23d84d4eac2], ['widthCm', copyDictionary.c8dd966ad496e83c7], ['heightCm', copyDictionary.cb1c27820fec23edb]] as const).map(([field, label]) => <label key={field} htmlFor={id + '-' + device.id + '-' + field}>{device.name}{label}（cm）<input id={id + '-' + device.id + '-' + field} data-gap-field="dimensions" type="number" min="0.01" step="any" inputMode="decimal" value={specs[device.id]?.[field] ?? ''} onChange={event => update(device.id, field, event.target.value === '' ? undefined : Number(event.target.value))}/></label>)}</div> : <p>{device.type === 'guide-dog' ? copyDictionary.c415c867841549afd : copyDictionary.c136a6aed9f4ed6c0}</p>}
      {requiresTravelBattery(device.type) ? <label htmlFor={id + '-' + device.id + '-battery'}>{device.name}{copyDictionary.ccc64d927855b9fde}<select id={id + '-' + device.id + '-battery'} data-gap-field="batteryType" value={specs[device.id]?.batteryType ?? ''} onChange={event => update(device.id, 'batteryType', event.target.value || undefined)}><option value="">{copyDictionary.c2320b479db733c07}</option><option value="none">{copyDictionary.cd0b98b6b5127b3fd}</option><option value="lithium">{copyDictionary.c0cad03728e492a1a}</option><option value="other">{copyDictionary.c417bdbecdc24f0d5}</option></select></label> : <p>{copyDictionary.cefb44ca848ba622a}</p>}
    </fieldset>)}
    <p role="status">{message}</p>
    <div className="travel-task-toolbar"><button type="submit" className="button-primary">{copyDictionary.c376a60ddcf09d5bb}</button><button type="button" onClick={props.onCancel}>{copyDictionary.c5273f07529d1482d}</button></div>
  </form>;
}
