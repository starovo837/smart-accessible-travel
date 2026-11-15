import { copyDictionary } from "../app/copyDictionary.ts";
import { useState } from 'react';
import { downloadText } from '../app/accessibility';
import type { Feedback, LocalShare } from '../app/types';
export function ManagementBackup({ cases, shares, onImport }: {
    cases: Feedback[];
    shares: LocalShare[];
    onImport: (cases: Feedback[], shares: LocalShare[]) => void;
}) {
    const [status, setStatus] = useState('');
    return <section className="task-panel"><h3>{copyDictionary.c3798298a372aaebd}</h3><p>{copyDictionary.c982eb72ad388e9f0}</p><button disabled={!cases.some(item => item.serverId) && !shares.some(item => item.serverId)} onClick={() => downloadText(JSON.stringify({ kind: 'accessible-management', origin: location.origin, cases: cases.filter(item => item.serverId), shares: shares.filter(item => item.serverId) }, null, 2), copyDictionary.ce6d3ad8e9ebe175c, 'application/json')}>{copyDictionary.c141e1d152f62b214}</button><label>{copyDictionary.c1113d316bd02e013}<input type="file" accept="application/json,.json" onChange={async (event) => { const file = event.target.files?.[0]; if (!file)
        return; try {
        if (file.size > 1024 * 1024)
            throw Error(copyDictionary.cb2157d64ba62673c);
        const data = JSON.parse(await file.text());
        if (data.kind !== 'accessible-management' || data.origin !== location.origin || !Array.isArray(data.cases) || !Array.isArray(data.shares))
            throw Error(copyDictionary.cc2c11df13757c242);
        const valid = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{10,100}$/.test(value);
        if (!data.cases.every((item: Feedback) => valid(item.serverId) && valid(item.accessToken)) || !data.shares.every((item: LocalShare) => valid(item.serverId) && valid(item.ownerToken)))
            throw Error(copyDictionary.ceddaccb5ce12f8b0);
        onImport(data.cases.slice(0, 500), data.shares.slice(0, 100));
        setStatus(copyDictionary.c252e4cbb1c489dca);
    }
    catch (error) {
        setStatus((error as Error).message);
    }
    finally {
        event.target.value = '';
    } }}/></label><p role="status">{status}</p></section>;
}
