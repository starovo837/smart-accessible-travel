import { copyDictionary } from "../app/copyDictionary.ts";
import { useState } from 'react';
import { service, prepareService } from '../app/service';
import { RuleSources } from './RuleSources';
import type { RuleDocument } from '../app/ruleCatalog';
export function RuleReview() {
    const [documents, setDocuments] = useState<RuleDocument[]>([]), [note, setNote] = useState(''), [checked, setChecked] = useState(false), [status, setStatus] = useState('');
    return <section className="task-panel"><h3>{copyDictionary.c4583cf7e73916c05}</h3><button onClick={async () => { try {
        await prepareService();
        setDocuments((await service<{
            documents: RuleDocument[];
        }>('rules')).documents);
    }
    catch (error) {
        setStatus((error as Error).message);
    } }}>{copyDictionary.c5c527530bef129ad}</button><RuleSources documents={documents}/><label>{copyDictionary.cb378713c8bc7b42c}<textarea value={note} onChange={e => setNote(e.target.value)}/></label><label className="switch-line"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}/>{copyDictionary.c6d2ed6dcfd373db7}</label>{documents.filter(rule => rule.status === 'changed').map(rule => <div className="record-row" key={rule.id}><p>{rule.title} · {rule.anchorsMatch ? copyDictionary.c6d4b6d738c998cd2 : copyDictionary.c361bc61f8905b02f}</p><button disabled={!checked || !note.trim() || !rule.anchorsMatch} onClick={async () => { try {
        setDocuments((await service<{
            documents: RuleDocument[];
        }>('review/rules/' + rule.id, { hash: rule.pendingHash, note })).documents);
        setStatus(copyDictionary.c9264618987343d05);
        setChecked(false);
    }
    catch (error) {
        setStatus((error as Error).message);
    } }}>{copyDictionary.cdc9943ee2c123cbd}</button></div>)}<p role="status">{status}</p></section>;
}
