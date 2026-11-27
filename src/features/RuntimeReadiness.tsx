import { copyDictionary } from "../app/copyDictionary.ts";
import { useState } from 'react';
import { service } from '../app/service';
import { isPages, isStudio } from '../app/deployment';
import { downloadText } from '../app/accessibility';
interface Check {
    at: string;
    secure: boolean;
    file: boolean;
    gpu: string;
    server: string;
    localAI: string;
}
export function RuntimeReadiness() {
    const [check, setCheck] = useState<Check | null>(null), [busy, setBusy] = useState(false);
    const inspect = async () => {
        setBusy(true);
        const result: Check = { at: new Date().toISOString(), secure: window.isSecureContext, file: location.protocol === 'file:', gpu: copyDictionary.c3acaa83343cf235b, server: copyDictionary.c3d52574ce1500561, localAI: copyDictionary.c53508a701fba1944 };
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const gpu = (navigator as Navigator & {
                gpu?: {
                    requestAdapter: () => Promise<unknown>;
                };
            }).gpu;
            result.gpu = !gpu ? copyDictionary.c7c5378606570020b : await Promise.race([gpu.requestAdapter().then(adapter => adapter ? copyDictionary.c2ecc884b287bbef9 : copyDictionary.c4bf612038c6515ba), new Promise<string>(resolve => { timer = setTimeout(() => resolve(copyDictionary.cc2556965dbd7ebd7), 5000); })]);
        }
        catch {
            result.gpu = copyDictionary.c78fc411a3ba90f9b;
        }
        finally {
            clearTimeout(timer);
        }
        if (isPages) {
            result.server = copyDictionary.pagesHeader;
            result.localAI = copyDictionary.pagesProcessingNotice;
        } else if (!result.file)
            try {
                const data = await service<{
                    configured: boolean;
                    authorized: boolean;
                }>('status', undefined, undefined, AbortSignal.timeout(7000));
                result.server = copyDictionary.ca8ce870c5a55f43b;
                result.localAI = data.configured ? (data.authorized ? copyDictionary.c424650678189e66b : isStudio ? copyDictionary.c20cb601519b9f7a6 : copyDictionary.cf11b5b3fe4b6987a) : copyDictionary.c2f989d48b876d29b;
            }
            catch {
                result.server = copyDictionary.c48f889e0f8fbcdfd;
            }
        setCheck(result);
        setBusy(false);
    };
    return <section className="task-panel"><h2>{copyDictionary.c50cdac496dd279ed}</h2><p>{copyDictionary.cb949d9149a97cd8f}</p><button disabled={busy} onClick={() => void inspect()}>{busy ? copyDictionary.c0232e8ddd5565c4f : copyDictionary.c7acc3362a506a918}</button>{check && <div role="status"><p>{copyDictionary.c7f6b4af200672996}{check.secure ? copyDictionary.cb5141d3d19e9a048 : copyDictionary.c0c70665b6eb65f1a}{copyDictionary.c86be8d7394faa60b}{check.file ? copyDictionary.cb5141d3d19e9a048 : copyDictionary.c0c70665b6eb65f1a}</p><p>{copyDictionary.c5e4acd8fead1c1a1}{check.gpu}；{check.file || !check.secure ? copyDictionary.cab1c58024a3acc53 : copyDictionary.cfe19e7bfa9092d67}</p><p>{check.server}；{check.localAI}。</p><button onClick={() => downloadText(JSON.stringify({ kind: 'technical-readiness', ...check, humanAcceptance: copyDictionary.cac991bcb53e3c261 }, null, 2), copyDictionary.c11945dd39b6141da, 'application/json')}>{copyDictionary.c9bf1cdc897840cf4}</button></div>}<p>{isPages ? copyDictionary.pagesRuntime : (isStudio ? copyDictionary.c58bc0c24bf26b322 : copyDictionary.c0719971a8f3d32d7) + copyDictionary.cc0ff95dd61ca7d9b}</p><p>{copyDictionary.ca88f0e55003aafd5}</p></section>;
}
