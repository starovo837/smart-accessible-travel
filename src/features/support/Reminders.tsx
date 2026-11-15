import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { dueReminders, type DailyReminder } from '../../app/supportCatalog';
import { readText, stopReading } from '../../app/accessibility';
import type { LifeData } from '../../app/types';
export function ReminderNotice({ rows, onOpen }: {
    rows: DailyReminder[];
    onOpen: () => void;
}) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
    const due = dueReminders(rows, now);
    return due.length ? <aside className="reminder-notice"><p role="status">{copyDictionary.c90ce0f66f09488f2}{due.length}{copyDictionary.c40b15e508a6f478d}</p><button onClick={onOpen}>{copyDictionary.cd0f99116be162137}</button></aside> : null;
}
export function Reminders({ life, setLife, saved }: {
    life: LifeData;
    setLife: Dispatch<SetStateAction<LifeData>>;
    saved: boolean;
}) {
    const [now, setNow] = useState(Date.now()), [title, setTitle] = useState(''), [at, setAt] = useState(''), [note, setNote] = useState(''), [message, setMessage] = useState('');
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => { clearInterval(timer); stopReading(); }; }, []);
    const rows = life.assistance?.reminders ?? [], due = dueReminders(rows, now);
    const update = (reminders: DailyReminder[]) => setLife(current => ({ ...current, assistance: { ...current.assistance, tasks: current.assistance?.tasks ?? [], progress: current.assistance?.progress ?? {}, reminders } }));
    return <div className="support-reminders"><p className="support-clock"><time dateTime={new Date(now).toISOString()}>{new Date(now).toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })} · {new Date(now).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></p><p>{copyDictionary.cc8d6c6f13a1f3a8e}</p>{due.length > 0 && <div className="support-due" role="status"><h2>{copyDictionary.c90ce0f66f09488f2}{due.length}{copyDictionary.c536d988e1fa7589c}</h2>{due.map(row => <p key={row.id}>{row.title}</p>)}<button onClick={() => readText(due.map(row => row.title).join('。'))}>{copyDictionary.cc7fc3b871df86092}</button><button onClick={() => { if (navigator.vibrate?.([150, 100, 150]))
        setMessage(copyDictionary.c6b2dffcc15c4e871);
    else
        setMessage(copyDictionary.cbe8be57de7d057bb); }}>{copyDictionary.c674e5a9c9ac35f05}</button></div>}<form onSubmit={e => { e.preventDefault(); if (!title.trim() || !Number.isFinite(Date.parse(at)))
        return setMessage(copyDictionary.c6fd834f54df4d2ad); if (rows.length >= 100)
        return setMessage(copyDictionary.c5afd912d730962bc); update([...rows, { id: 'reminder-' + Date.now(), title: title.trim(), dueAt: new Date(at).toISOString(), done: false, note }]); setTitle(''); setAt(''); setNote(''); setNow(Date.now()); setMessage(copyDictionary.cb228ece4d7a32c37); }}><label>{copyDictionary.c99e9be8e26ba0582}<input required maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder={copyDictionary.c09f2b90af79c1053}/></label><label>{copyDictionary.c917e4afc231cb1b0}<input required type="datetime-local" value={at} onChange={e => setAt(e.target.value)}/></label><label>{copyDictionary.c7ba096dfb6b4d081}<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)}/></label><button type="submit">{copyDictionary.c5e7699102194efa9}</button></form><h2>{copyDictionary.ce71822daa753c254}</h2>{!rows.length && <p>{copyDictionary.cc37942c313a28429}</p>}{rows.map(row => <article className="support-reminder-row" key={row.id}><h3>{row.title}</h3><p>{row.done ? copyDictionary.c856989a3e63f11cb : Date.parse(row.dueAt) <= now ? copyDictionary.c415be61e2fcb6396 : copyDictionary.c33a30f8c2ca76ba2} · {new Date(row.dueAt).toLocaleString('zh-CN')}</p><p>{row.note}</p><div className="daily-actions"><button onClick={() => update(rows.map(item => item.id === row.id ? { ...item, done: !item.done } : item))}>{row.done ? copyDictionary.c345fcbfd74468848 : copyDictionary.c94efe277bf8a7293}</button><button disabled={row.done} onClick={() => { update(rows.map(item => item.id === row.id ? { ...item, dueAt: new Date(Date.now() + 10 * 60000).toISOString() } : item)); setNow(Date.now()); }}>{copyDictionary.c82566d0475547997}</button><button onClick={() => update(rows.filter(item => item.id !== row.id))}>{copyDictionary.cbdf37b2f15672e4e}</button></div></article>)}<p>{saved ? copyDictionary.c48f6734551897aeb : copyDictionary.ce006fd818dd25b93}</p><p role="status">{message}</p></div>;
}
