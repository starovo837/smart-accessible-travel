import { copyDictionary } from "../../app/copyDictionary.ts";
import { useEffect, useId, useRef, useState } from 'react';
import { carryCardFileName, createTravelCarryCard, travelCarryCardContent, type TravelCarryImage } from '../../app/travelCarryCard';
import type { TravelTaskPlan } from '../../app/travelTaskTypes';
import '../../travel-carry-card.css';
interface Preview {
    planKey: string;
    images: (TravelCarryImage & {
        url: string;
    })[];
}
export function TravelCarryCard({ plan }: {
    plan: TravelTaskPlan;
}) {
    const headingId = useId(), [preview, setPreview] = useState<Preview | null>(null), [busy, setBusy] = useState(false), [sharing, setSharing] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
    const active = useRef(0), urls = useRef<string[]>([]);
    const content = travelCarryCardContent(plan), planKey = JSON.stringify(plan);
    const current = preview?.planKey === planKey ? preview.images : [];
    useEffect(() => { active.current++; setBusy(false); setSharing(false); setPreview(null); setMessage(''); setError(''); for (const url of urls.current)
        URL.revokeObjectURL(url); urls.current = []; }, [planKey]);
    useEffect(() => () => { active.current++; for (const url of urls.current)
        URL.revokeObjectURL(url); }, []);
    const generate = async () => {
        const request = ++active.current;
        setBusy(true);
        setError('');
        setMessage(copyDictionary.ce8dcb0a44133df08);
        try {
            const images = await createTravelCarryCard(plan);
            if (request !== active.current)
                return;
            for (const url of urls.current)
                URL.revokeObjectURL(url);
            const ready = images.map(image => ({ ...image, url: URL.createObjectURL(image.blob) }));
            urls.current = ready.map(image => image.url);
            setPreview({ planKey, images: ready });
            setMessage(ready.length === 1 ? copyDictionary.caa1100d66b027ee0 : copyDictionary.c11448fff91a477dc + ready.length + copyDictionary.c50411e20a8064f1b);
        }
        catch (cause) {
            if (request === active.current) {
                setError((cause as Error).message || copyDictionary.c0fda43dcb8d085e9);
                setMessage('');
            }
        }
        finally {
            if (request === active.current)
                setBusy(false);
        }
    };
    const share = async () => {
        const request = active.current;
        setError('');
        setSharing(true);
        try {
            if (typeof File === 'undefined') {
                setMessage(copyDictionary.cbb558a59182e945e);
                return;
            }
            const files = current.map(image => new File([image.blob], carryCardFileName(plan, image.page, image.pages), { type: 'image/png' }));
            if (!navigator.canShare?.({ files }) || !navigator.share) {
                setMessage(copyDictionary.cd82b86f6560e5259);
                return;
            }
            await navigator.share({ files, title: copyDictionary.cff23570b2103ff25 });
            if (request === active.current)
                setMessage(copyDictionary.c38b7659a7ef00f7a);
        }
        catch (cause) {
            if (request === active.current) {
                if ((cause as Error).name === 'AbortError')
                    setMessage(copyDictionary.c728c20857901e56c);
                else
                    setError(copyDictionary.c9c22a595033e7931);
            }
        }
        finally {
            if (request === active.current)
                setSharing(false);
        }
    };
    return <section className="travel-carry-card" aria-labelledby={headingId}>
    <h2 id={headingId}>{copyDictionary.c1d9d48a61cac7726}</h2>
    <p>{copyDictionary.c461f79e313149c13}</p>
    <div className="travel-carry-text" aria-label={copyDictionary.cc974bfe62dcf7e4f}>
      <p className="travel-card-completion"><strong>{content.completionStatement}</strong></p>
      <h3>{content.itinerary}</h3><p>{[content.date, content.mode].filter(Boolean).join(' · ')}</p>
      {content.devices.length ? content.devices.map((device, index) => <dl key={plan.devices[index].id + ':' + index}><dt>{copyDictionary.ce1506406a5bd8f02}</dt><dd>{device.name}</dd><dt>{copyDictionary.c80de0439730f05e2}</dt><dd>{device.dimensions}</dd><dt>{copyDictionary.c5081ead9bbce7393}</dt><dd>{device.weight}</dd><dt>{copyDictionary.ccc64d927855b9fde}</dt><dd>{device.battery}</dd></dl>) : <p>{copyDictionary.cfa1c89b74cd625a6}</p>}
      <h3>{copyDictionary.cc241649edf9b50b6}</h3><p>{content.summary}</p>
      <h3>{copyDictionary.cbab649031dae5f43}</h3><ul className="travel-carry-contacts">{content.contacts.map(contact => <li key={contact.name + contact.phone}><span>{contact.name}</span><a className="travel-carry-phone" href={'tel:' + contact.phone.replace(/-/g, '')}>{contact.phone}</a></li>)}</ul>
      <p>{content.notice}</p>
    </div>
    <button type="button" className="travel-carry-generate" onClick={generate} disabled={busy || sharing}>{busy ? copyDictionary.cb84e53ab76ff50f6 : current.length ? copyDictionary.c5cc170d2aabe06d4 : copyDictionary.c5876634099ca3b96}</button>
    {current.length > 0 && <><div className="travel-carry-previews">{current.map(image => <figure key={image.url}><img src={image.url} width={image.width} height={image.height} alt={copyDictionary.c3f147532d27b5c98 + image.page + copyDictionary.cf5b208244987b825 + image.pages + copyDictionary.c1873b78e8af930b1}/><figcaption>{copyDictionary.caf50a0fe2a50a3d1}{image.page}{copyDictionary.cf5b208244987b825}{image.pages}{copyDictionary.cf56a049fcc23f1eb}</figcaption><a className="travel-carry-save" href={image.url} download={carryCardFileName(plan, image.page, image.pages)} onClick={() => setMessage(copyDictionary.c9def871085da7672)}>{image.pages === 1 ? copyDictionary.c0dff97637c6bcf99 : copyDictionary.c90fc21381a476daf + image.page + copyDictionary.c29499a96c7e359f9}</a></figure>)}</div><button type="button" onClick={share} disabled={sharing || busy}>{sharing ? copyDictionary.cc7ac7e8379c67fc0 : copyDictionary.cf5bf1b8f60198a63}</button></>}
    <p role="status" aria-live="polite">{message}</p>{error && <p className="travel-carry-error" role="alert">{error}</p>}
  </section>;
}
