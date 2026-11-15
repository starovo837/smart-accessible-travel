import { copyDictionary } from "../app/copyDictionary.ts";
import { useState } from 'react';
import { Modal, PrimaryButton } from '../components/UI';
import { localTime } from '../app/accessibility';
import type { Feedback } from '../app/types';
import { prepareService, service } from '../app/service';
export function FeedbackDialog({ subject, onSave, onClose }: {
    subject: string;
    onSave: (item: Feedback) => void;
    onClose: () => void;
}) {
    const [text, setText] = useState(''), [saved, setSaved] = useState(false);
    const [submit, setSubmit] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
    return <Modal title={copyDictionary.c0f7d68ecdcf65b2d} onClose={onClose}>{saved ? <><p role="status">{notice}</p><PrimaryButton onClick={onClose}>{copyDictionary.cde32e20193ad1042}</PrimaryButton></> : <form onSubmit={async (event) => { event.preventDefault(); if (!text.trim() || busy)
        return; setBusy(true); try {
        let remote: Partial<Feedback> = {};
        if (submit) {
            await prepareService();
            const record = await service<{
                id: string;
                accessToken: string;
            }>('cases', { subject, text: text.trim(), consent: true });
            remote = { serverId: record.id, accessToken: record.accessToken, status: 'submitted' };
        }
        onSave({ id: 'feedback-' + Date.now(), subject, text: text.trim(), createdAt: localTime(), status: 'local-pending', ...remote });
        setNotice(submit ? copyDictionary.cf0cd63abf569c775 : copyDictionary.c3532879b8013c5cd);
        setSaved(true);
    }
    catch (error) {
        setNotice((error as Error).message);
    }
    finally {
        setBusy(false);
    } }}><p>{subject}</p><label>{copyDictionary.c691ab6885ab0c1e9}<textarea required maxLength={2000} value={text} onChange={event => setText(event.target.value)}/></label><label className="switch-line"><input type="checkbox" checked={submit} onChange={e => setSubmit(e.target.checked)}/>{copyDictionary.c7deef6b4b1b43fb6}</label><p>{copyDictionary.c657ebf8f0676a052}</p><p role="status">{notice}</p><PrimaryButton type="submit" disabled={!text.trim() || busy}>{busy ? copyDictionary.ca958ffdd6f9716bd : submit ? copyDictionary.c7dd00c8b864c8b73 : copyDictionary.cda2bce23238f7a3a}</PrimaryButton></form>}</Modal>;
}
