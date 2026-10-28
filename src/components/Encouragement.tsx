import { useId, useState } from 'react'
import { nextEncouragement, type EncouragementContext } from '../app/encouragement'
import '../encouragement.css'

export type { EncouragementContext } from '../app/encouragement'

export interface EncouragementProps {
  context: EncouragementContext
  enabled?: boolean
  /** The parent owns the saved preference and should set enabled to false. */
  onDismiss?: () => void
}

export function Encouragement(props: EncouragementProps) {
  return props.enabled === false ? null : <EncouragementNote key={props.context} {...props} />
}

function EncouragementNote({ context, onDismiss }: EncouragementProps) {
  const [message, setMessage] = useState(() => nextEncouragement(context))
  const [collapsed, setCollapsed] = useState(false)
  const messageId = useId()

  if (!message) return null

  return (
    <aside aria-label="温和的鼓励" className={`encouragement${collapsed ? ' encouragement-collapsed' : ''}`}>
      <svg className="encouragement-leaf" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M19.5 4.5c-7-1-13 2-13 7.5 0 3 2 5 4.5 5 5.5 0 8.5-5.5 8.5-12.5Z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m4.5 20 10-10M9 15.5v-4M9 15.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="encouragement-content">
        <p id={messageId} hidden={collapsed}>{message}</p>
        <div className="encouragement-actions">
          {!collapsed && <button type="button" onClick={() => setMessage(nextEncouragement(context))}>换一句</button>}
          <button type="button" aria-expanded={!collapsed} aria-controls={messageId} onClick={() => setCollapsed(value => !value)}>
            {collapsed ? '显示鼓励语' : '收起'}
          </button>
          {onDismiss ? <button type="button" onClick={onDismiss}>不再显示</button> : null}
        </div>
      </div>
    </aside>
  )
}
