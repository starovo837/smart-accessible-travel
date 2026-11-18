import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { readingFallbackEvent } from '../app/accessibility'
import { copyDictionary } from '../app/copyDictionary'

export function ReadingFallback() {
  const [card, setCard] = useState<{ text: string; host: HTMLElement | null; focus: HTMLElement | null } | null>(null)
  useEffect(() => {
    const update = (event: Event) => {
      const text = (event as CustomEvent<string>).detail
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]')
      const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setCard(text ? { text, host: dialogs.item(dialogs.length - 1), focus } : null)
    }
    const clear = () => setCard(null)
    window.addEventListener(readingFallbackEvent, update)
    window.addEventListener('hashchange', clear)
    return () => {
      window.removeEventListener(readingFallbackEvent, update)
      window.removeEventListener('hashchange', clear)
    }
  }, [])
  if (!card) return null
  const content = <section className="reading-fallback" aria-label={copyDictionary.speechLargeTextFallback}>
    <p role="status">{copyDictionary.speechLargeTextFallback}</p>
    <button type="button" onClick={() => {
      setCard(null)
      if (card.focus?.isConnected) card.focus.focus()
    }}>{copyDictionary.speechCloseLargeText}</button>
    <p className="reading-fallback-text">{card.text}</p>
  </section>
  return card.host ? createPortal(content, card.host) : content
}
