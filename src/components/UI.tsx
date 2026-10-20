import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icons'

export function AppMark() { return <div className="app-mark" aria-hidden="true"><Icon name="wheelchair" size={22} /></div> }

export function PageHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => { heading.current?.focus() }, [title])
  return <header className="page-header">{onBack ? <button className="icon-button" onClick={onBack} aria-label="返回"><Icon name="back" /></button> : <AppMark />}<div className="page-heading"><h1 tabIndex={-1} ref={heading}>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{right || <span className="header-spacer" />}</header>
}

export function PrimaryButton({ children, onClick, icon, variant = 'primary', disabled = false, type = 'button' }: { children: ReactNode; onClick?: () => void; icon?: Parameters<typeof Icon>[0]['name']; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; type?: 'button' | 'submit' }) {
  return <button type={type} className={`button button-${variant}`} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} size={21} />}<span>{children}</span></button>
}

export function BackLink({ onClick, children = '返回' }: { onClick: () => void; children?: ReactNode }) { return <button className="back-link" onClick={onClick}><Icon name="back" size={18} />{children}</button> }

export function Toggle({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: () => void; icon?: Parameters<typeof Icon>[0]['name'] }) {
  return <button className={`toggle-control ${checked ? 'is-on' : ''}`} aria-pressed={checked} onClick={onChange}>{icon && <Icon name={icon} size={18} />}<span>{label}</span><span className="toggle-track"><span className="toggle-thumb" /></span></button>
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) { return <div className="section-title"><h2>{title}</h2>{action}</div> }

export function Modal({ title, children, onClose, fullScreen = false }: { title: string; children: ReactNode; onClose: () => void; fullScreen?: boolean }) {
  const titleId = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const root = document.getElementById('root')
    const previousInert = root?.inert ?? false
    const overflow = document.body.style.overflow
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    const tabbable = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0)
    ;(dialog.current?.querySelector<HTMLElement>('[data-autofocus]') ?? tabbable()[0] ?? dialog.current)?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab') return
      const targets = tabbable()
      if (!targets.length) { event.preventDefault(); dialog.current?.focus(); return }
      const index = targets.indexOf(document.activeElement as HTMLElement)
      if (index < 0 || (!event.shiftKey && index === targets.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault(); (event.shiftKey ? targets[targets.length - 1] : targets[0]).focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (root) root.inert = previousInert
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return createPortal(<div className="modal-backdrop" role="presentation" onClick={event => event.target === event.currentTarget && onClose()}><div ref={dialog} tabIndex={-1} className={`modal ${fullScreen ? 'modal-fullscreen' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="modal-header"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="关闭"><Icon name="close" /></button></div>{children}</div></div>, document.body)
}

export function ResultDisclaimer() {
  const footer=useRef<HTMLDivElement>(null)
  useLayoutEffect(()=>{const update=()=>document.documentElement.style.setProperty('--result-footer-height',(footer.current?.getBoundingClientRect().height??100)+'px');update();const observer=new ResizeObserver(update);if(footer.current)observer.observe(footer.current);return()=>{observer.disconnect();document.documentElement.style.removeProperty('--result-footer-height')}},[])
  return <div className="result-disclaimer" ref={footer}><Icon name="info" size={17} />仅供参考，以承运方书面确认为准</div>
}

export function ProgressDots({ step }: { step: number }) { return <div className="progress-dots" aria-label={`第 ${step} 步，共 3 步`}>{[1, 2, 3].map((n) => <span key={n} className={n <= step ? 'active' : ''} />)}</div> }
