import { copyDictionary } from "../app/copyDictionary.ts";
import { useEffect, useState } from 'react';
interface InstallEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: string;
    }>;
}
let pending: InstallEvent | undefined;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pending = event as InstallEvent; window.dispatchEvent(new Event('app-install-ready')); });
export function InstallHelp() {
    const [ready, setReady] = useState(Boolean(pending)), [status, setStatus] = useState(''), [waiting, setWaiting] = useState<ServiceWorker | null>(null);
    useEffect(() => { const ready = () => setReady(Boolean(pending)); window.addEventListener('app-install-ready', ready); let alive = true; if ('serviceWorker' in navigator)
        navigator.serviceWorker.getRegistration().then(registration => { if (!alive || !registration)
            return; const update = () => { if (alive)
            setWaiting(registration.waiting); }; update(); registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', update)); }).catch(() => { }); return () => { alive = false; window.removeEventListener('app-install-ready', ready); }; }, []);
    return <section className="task-panel"><h2>{copyDictionary.ce8d85fff5b1f82a2}</h2><p>{copyDictionary.ca0efd0f06707cf89}</p>{ready && <button onClick={async () => { if (!pending)
        return; await pending.prompt(); setStatus((await pending.userChoice).outcome === 'accepted' ? copyDictionary.c05641e407a8210b4 : copyDictionary.ce41233827b919851); pending = undefined; setReady(false); }}>{copyDictionary.cd9892d26d3ae1d34}</button>}<details><summary>{copyDictionary.c453982f57b5c711c}</summary><p>{copyDictionary.c92dc7b289a6742e7}</p><p>{copyDictionary.cc02956c729cc1023}</p></details>{waiting && <button onClick={() => { navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); waiting.postMessage('SKIP_WAITING'); }}>{copyDictionary.ca929ec7e1b31a71f}</button>}<p role="status">{status}</p></section>;
}
