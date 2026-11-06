import { useEffect, useId, useRef, useState } from 'react'
import { carryCardFileName, createTravelCarryCard, travelCarryCardContent, type TravelCarryImage } from '../../app/travelCarryCard'
import type { TravelTaskPlan } from '../../app/travelTaskTypes'
import '../../travel-carry-card.css'

interface Preview { planKey: string; images: (TravelCarryImage & { url: string })[] }

export function TravelCarryCard({ plan }: { plan: TravelTaskPlan }) {
  const headingId = useId(), [preview, setPreview] = useState<Preview | null>(null), [busy, setBusy] = useState(false), [sharing, setSharing] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const active = useRef(0), urls = useRef<string[]>([])
  const content = travelCarryCardContent(plan), planKey = JSON.stringify(plan)
  const current = preview?.planKey === planKey ? preview.images : []
  useEffect(() => { active.current++; setBusy(false); setSharing(false); setPreview(null); setMessage(''); setError(''); for (const url of urls.current) URL.revokeObjectURL(url); urls.current = [] }, [planKey])
  useEffect(() => () => { active.current++; for (const url of urls.current) URL.revokeObjectURL(url) }, [])
  const generate = async () => {
    const request = ++active.current
    setBusy(true); setError(''); setMessage('正在本机生成图片…')
    try {
      const images = await createTravelCarryCard(plan)
      if (request !== active.current) return
      for (const url of urls.current) URL.revokeObjectURL(url)
      const ready = images.map(image => ({ ...image, url: URL.createObjectURL(image.blob) })); urls.current = ready.map(image => image.url)
      setPreview({ planKey, images: ready }); setMessage(ready.length === 1 ? '携带卡图片已生成，可以保存或分享。' : `已生成${ready.length}张携带卡，请逐张保存或一起分享。`)
    } catch (cause) { if (request === active.current) { setError((cause as Error).message || '图片生成未完成，请重试。'); setMessage('') } }
    finally { if (request === active.current) setBusy(false) }
  }
  const share = async () => {
    const request = active.current
    setError(''); setSharing(true)
    try {
      if (typeof File === 'undefined') { setMessage('此浏览器不支持分享图片文件，请保存PNG图片后再发送。'); return }
      const files = current.map(image => new File([image.blob], carryCardFileName(plan, image.page, image.pages), { type: 'image/png' }))
      if (!navigator.canShare?.({ files }) || !navigator.share) { setMessage('此浏览器不支持分享图片文件，请点击“保存PNG图片”，再从相册或文件中发送。'); return }
      await navigator.share({ files, title: '智能无碍行 · 随身携带卡' }); if (request === active.current) setMessage('图片已交给系统分享面板。')
    } catch (cause) { if (request === active.current) { if ((cause as Error).name === 'AbortError') setMessage('已取消分享，图片仍可保存。'); else setError('分享未完成，请保存PNG图片后再发送。') } }
    finally { if (request === active.current) setSharing(false) }
  }
  return <section className="travel-carry-card" aria-labelledby={headingId}>
    <h2 id={headingId}>生成随身携带卡</h2>
    <p>把当前阶段的行程、设备和协助需要保存成图片。资料不全时生成预备卡，图片在本机生成。</p>
    <div className="travel-carry-text" aria-label="随身携带卡文字内容">
      <h3>{content.itinerary}</h3><p>{[content.date,content.mode].filter(Boolean).join(' · ')}</p>
      {content.devices.length ? content.devices.map((device, index) => <dl key={plan.devices[index].id + ':' + index}><dt>设备</dt><dd>{device.name}</dd><dt>运输尺寸</dt><dd>{device.dimensions}</dd><dt>重量</dt><dd>{device.weight}</dd><dt>电池类型</dt><dd>{device.battery}</dd></dl>) : <p>如携带辅具，请向工作人员说明设备与所需协助。</p>}
      <h3>结论摘要</h3><p>{content.summary}</p>
      <h3>承运方与官方联系渠道</h3><ul className="travel-carry-contacts">{content.contacts.map(contact => <li key={contact.name + contact.phone}><span>{contact.name}</span><a className="travel-carry-phone" href={'tel:' + contact.phone.replace(/-/g, '')}>{contact.phone}</a></li>)}</ul>
      <p>{content.notice}</p>
    </div>
    <button type="button" className="travel-carry-generate" onClick={generate} disabled={busy || sharing}>{busy ? '正在生成图片…' : current.length ? '重新生成携带卡' : '生成随身携带卡（PNG）'}</button>
    {current.length > 0 && <><div className="travel-carry-previews">{current.map(image => <figure key={image.url}><img src={image.url} width={image.width} height={image.height} alt={`随身携带卡，第${image.page}张，共${image.pages}张。图片文字内容见上方设备卡。`}/><figcaption>第{image.page}张，共{image.pages}张</figcaption><a className="travel-carry-save" href={image.url} download={carryCardFileName(plan, image.page, image.pages)} onClick={() => setMessage('已交给浏览器保存图片；若未弹出下载，请检查浏览器的下载列表。')}>{image.pages === 1 ? '保存PNG图片' : `保存第${image.page}张PNG图片`}</a></figure>)}</div><button type="button" onClick={share} disabled={sharing || busy}>{sharing ? '正在打开分享…' : '分享携带卡图片'}</button></>}
    <p role="status" aria-live="polite">{message}</p>{error && <p className="travel-carry-error" role="alert">{error}</p>}
  </section>
}
