import { copyDictionary } from "./copyDictionary.ts";
import { useCallback, useEffect, useRef, useState } from 'react';
import { FITTING_KEY, initialFitting, readFitting, serializedFitting, type FittingDraft } from './fitting';
export function useFittingDraft() {
    const [draft, setDraft] = useState<FittingDraft>(() => { try {
        return readFitting(localStorage.getItem(FITTING_KEY)) ?? initialFitting();
    }
    catch {
        return initialFitting();
    } });
    const [saveStatus, setSaveStatus] = useState(''), latest = useRef(draft);
    latest.current = draft;
    const flush = useCallback(() => {
        const current = latest.current;
        if (!current.allowSave)
            return;
        try {
            const now = Date.now();
            localStorage.setItem(FITTING_KEY, serializedFitting(current, now));
            setSaveStatus(copyDictionary.c55dd846bf7d3362b + new Date(now).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
        catch {
            setSaveStatus(copyDictionary.c14c65fbdda7f4e08);
        }
    }, []);
    useEffect(() => { if (!draft.allowSave) {
        try {
            localStorage.removeItem(FITTING_KEY);
            setSaveStatus(copyDictionary.c3cafd54538a79131);
        }
        catch {
            setSaveStatus(copyDictionary.c5c9bce67c9bff077);
        }
        return;
    } setSaveStatus(copyDictionary.ca958ffdd6f9716bd); const timer = setTimeout(flush, 600); return () => clearTimeout(timer); }, [draft, flush]);
    useEffect(() => { const visibility = () => { if (document.visibilityState === 'hidden')
        flush(); }; window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', visibility); return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility); }; }, [flush]);
    const clear = useCallback(() => { latest.current = initialFitting(); setDraft(latest.current); localStorage.removeItem(FITTING_KEY); setSaveStatus(copyDictionary.c9658b267a81eced6); }, []);
    return { draft, setDraft, saveStatus, flush, clear };
}
