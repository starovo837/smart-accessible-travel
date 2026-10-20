export function readText(text: string, rate = 1): boolean {
  if (!('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = rate
  window.speechSynthesis.speak(utterance)
  return true
}
export function stopReading() { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true }
    const previous = document.activeElement as HTMLElement | null
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('aria-hidden', 'true')
    textarea.style.cssText = 'position:fixed;left:0;top:0;opacity:0;width:1px;height:1px'
    // Keep the fallback within an active modal, where the application root is inert.
    ;(document.querySelector('[role="dialog"]') ?? document.body).append(textarea)
    textarea.focus(); textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove(); previous?.focus()
    return copied
  } catch { return false }
}
export function downloadText(text: string, filename: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
export const localTime = () => new Date().toLocaleString('zh-CN')
export const phoneLink = (phone: string) => /^\+?[\d\s-]{3,20}$/.test(phone.trim()) ? 'tel:' + phone.replace(/[\s-]/g, '') : undefined
