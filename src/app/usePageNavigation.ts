import { useEffect, useRef, useState } from 'react';
import { defaultParent, homePage, pageFromHash, pageHash, samePage, type AppPage, type PlainPage } from './navigation';

type PageEntry = { hash: string; hasParent: boolean; productResult: boolean };

function readEntry(): PageEntry | undefined {
    const entry = history.state?.smartAccessiblePage;
    if (entry?.hash === location.hash && typeof entry.hasParent === 'boolean') return entry;
}

function writeEntry(page: AppPage, hasParent: boolean, replace: boolean) {
    const hash = pageHash(page);
    const entry: PageEntry = { hash, hasParent, productResult: page.screen === 'product-result' };
    const state = { ...history.state, smartAccessiblePage: entry };
    if (replace) history.replaceState(state, '', hash);
    else history.pushState(state, '', hash);
}

export function usePageNavigation() {
    const [page, setPage] = useState(() => pageFromHash(location.hash) ?? homePage);
    const current = useRef(page);
    const hasProductResult = useRef(false);
    const backPending = useRef(false);

    useEffect(() => {
        writeEntry(current.current, readEntry()?.hasParent ?? false, true);
        const restore = () => {
            backPending.current = false;
            const entry = readEntry();
            const next = entry?.productResult && hasProductResult.current
                ? { screen: 'product-result' as const }
                : pageFromHash(location.hash);
            if (next && !samePage(current.current, next)) {
                current.current = next;
                setPage(next);
            }
        };
        window.addEventListener('popstate', restore);
        window.addEventListener('hashchange', restore);
        return () => {
            window.removeEventListener('popstate', restore);
            window.removeEventListener('hashchange', restore);
        };
    }, []);

    const open = (next: AppPage) => {
        if (backPending.current || samePage(current.current, next)) return;
        writeEntry(next, true, false);
        if (next.screen === 'product-result') hasProductResult.current = true;
        current.current = next;
        setPage(next);
    };

    const replace = (next: AppPage, hasParent = readEntry()?.hasParent ?? false) => {
        writeEntry(next, hasParent, true);
        current.current = next;
        setPage(next);
    };

    const back = () => {
        if (backPending.current) return;
        if (readEntry()?.hasParent) {
            backPending.current = true;
            history.back();
        } else {
            const parent = defaultParent(current.current);
            if (!samePage(current.current, parent)) replace(parent, false);
        }
    };

    const reset = () => {
        hasProductResult.current = false;
        backPending.current = false;
        replace(homePage, false);
    };

    return { page, open, openPage: (screen: PlainPage) => open({ screen }), replace, back, reset, isCurrent: (source: AppPage) => source === current.current };
}
