import { copyDictionary } from "../app/copyDictionary.ts";
import { RuleReview } from './RuleReview';
import { useEffect, useRef, useState } from 'react';
import { service, prepareService } from '../app/service';
import { PrimaryButton } from '../components/UI';
import type { Feedback } from '../app/types';
export interface CaseRecord {
    id: string;
    subject: string;
    text: string;
    status: string;
    revision: number;
    events: {
        at: string;
        actor: string;
        text: string;
        status: string;
    }[];
}
const labels: Record<string, string> = { submitted: copyDictionary.c55e261e092d9bfbc, reviewing: copyDictionary.cde591721def37421, 'needs-info': copyDictionary.ce76164e009da4b31, resolved: copyDictionary.cfd5ffb11de285d37, closed: copyDictionary.c6744b4c6a9aa0038 };
export function CaseTracking({ items, onRemove }: {
    items: Feedback[];
    onRemove: (id: string) => void;
}) {
    const [records, setRecords] = useState<CaseRecord[]>([]), [message, setMessage] = useState(''), [reply, setReply] = useState<Record<string, string>>({});
    const [confirm, setConfirm] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const refreshButton = useRef<HTMLButtonElement>(null);
    const remove = async (item: Feedback) => {
        setDeleting(true);
        setDeleteError('');
        setMessage('');
        try {
            if (item.serverId) {
                if (!item.accessToken) throw Error(copyDictionary.managementCredentialMissing);
                const result = await service<{ deleted: boolean }>('cases/' + item.serverId, undefined, item.accessToken, undefined, 'DELETE');
                if (result.deleted !== true) throw Error();
            }
            onRemove(item.id);
            setConfirm('');
            setMessage(copyDictionary.correctionDeleted);
            refreshButton.current?.focus();
        } catch (error) {
            setDeleteError([copyDictionary.correctionDeleteFailed, (error as Error).message].filter(Boolean).join(' '));
        } finally {
            setDeleting(false);
        }
    };
    const refresh = async () => { const fetched: CaseRecord[] = []; for (const item of items.filter(item => item.serverId && item.accessToken)) {
        try {
            fetched.push(await service<CaseRecord>('cases/' + item.serverId, undefined, item.accessToken));
        }
        catch (error) {
            setMessage((error as Error).message);
        }
    } setRecords(fetched); };
    useEffect(() => { void refresh(); }, [items]);
    return <section><h3>{copyDictionary.cb1761897488b09cd}</h3><p>{copyDictionary.c442101c71ccdc67e}</p><button ref={refreshButton} onClick={() => void refresh()}>{copyDictionary.cf65ecd7ce1d6f55d}</button>{items.map(item => { const record = records.find(row => row.id === item.serverId); return <article className="record-row" key={item.id}><h3>{item.subject}</h3><p>{item.text}</p><p>{record ? labels[record.status] ?? record.status : item.serverId ? copyDictionary.c4f6a7bdb91e98280 : copyDictionary.ccd5932ad9fac2fb8}</p>{record?.events.map((event, index) => <p key={index}>{new Date(event.at).toLocaleString('zh-CN')} · {event.actor}：{event.text}</p>)}{record && <><label>{copyDictionary.c6e2fce951ddee659}<textarea value={reply[item.id] ?? ''} onChange={e => setReply({ ...reply, [item.id]: e.target.value })}/></label><button disabled={!reply[item.id]?.trim()} onClick={async () => { try {
        await service('cases/' + item.serverId + '/reply', { text: reply[item.id] }, item.accessToken);
        setReply({ ...reply, [item.id]: '' });
        await refresh();
        setMessage(copyDictionary.ce21369bac2a12ae3);
    }
    catch (error) {
        setMessage((error as Error).message);
    } }}>{copyDictionary.cddec9c4045c093fe}</button></>}
    {confirm === item.id ? <div>
        <p>{copyDictionary.confirmCorrectionDeletion}</p>
        <button disabled={deleting} onClick={() => void remove(item)}>{copyDictionary.deleteCorrection}</button>
        <button disabled={deleting} onClick={() => { setConfirm(''); setDeleteError(''); }}>{copyDictionary.c2cd0f3be8738a86c}</button>
        {deleteError && <p role="alert">{deleteError}</p>}
    </div> : <button disabled={deleting} aria-label={copyDictionary.deleteCorrection + '：' + item.subject} onClick={() => { setDeleteError(''); setConfirm(item.id); }}>{copyDictionary.deleteCorrection}</button>}
    </article>; })}<p role="status">{message}</p></section>;
}
export function ReviewDesk() {
    const [records, setRecords] = useState<CaseRecord[]>([]), [message, setMessage] = useState(''), [reviewer, setReviewer] = useState(''), [note, setNote] = useState(''), [reference, setReference] = useState(''), [status, setStatus] = useState('reviewing');
    const refresh = async () => { try {
        await prepareService();
        setRecords((await service<{
            cases: CaseRecord[];
        }>('review/cases')).cases);
        setMessage(copyDictionary.c0f571346d419aaee);
    }
    catch (error) {
        setMessage((error as Error).message);
    } };
    return <section className="task-panel"><h2>{copyDictionary.cda04271e6d11b9bf}</h2><p>{copyDictionary.c42089fc4a58af65d}</p><button onClick={() => void refresh()}>{copyDictionary.c4b98d384c4c7c491}</button><label>{copyDictionary.c26ecd443b4c9b3ea}<input value={reviewer} maxLength={40} onChange={e => setReviewer(e.target.value)}/></label><label>{copyDictionary.c8e22ea7af2ab125e}<textarea value={note} onChange={e => setNote(e.target.value)}/></label><label>{copyDictionary.c38318c6f3420872f}<input value={reference} onChange={e => setReference(e.target.value)}/></label><label>{copyDictionary.cd5e74de3449e7458}<select value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(labels).filter(([id]) => id !== 'submitted').map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>{records.map(item => <article className="record-row" key={item.id}><h3>{item.subject}</h3><p>{item.text}</p><p>{labels[item.status]}{copyDictionary.c33ba2aacc7d33d48}{item.revision}</p>{item.events.map((event, index) => <p key={index}>{event.actor}：{event.text}</p>)}<PrimaryButton disabled={!reviewer.trim() || !note.trim() || (status === 'resolved' && !reference.trim())} onClick={async () => { try {
        await service('review/cases/' + item.id, { revision: item.revision, reviewer, note, reference, status });
        setNote('');
        setReference('');
        await refresh();
    }
    catch (error) {
        setMessage((error as Error).message);
    } }}>{copyDictionary.ce0d6359e86090bf1}</PrimaryButton></article>)}<p role="status">{message}</p><RuleReview /></section>;
}
