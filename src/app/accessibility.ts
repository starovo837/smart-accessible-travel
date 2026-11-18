export const readingFallbackEvent = 'sai-reading-fallback'
let activeReading: AbortController | undefined
const showReadingFallback = (text: string) => window.dispatchEvent(new CustomEvent(readingFallbackEvent, { detail: text }))

export function stopReading() {
  activeReading?.abort()
  activeReading = undefined
  try { window.speechSynthesis?.cancel() } catch { /* The browser may have disabled speech. */ }
  showReadingFallback('')
}

function chineseVoice(speech: SpeechSynthesis, signal: AbortSignal): Promise<SpeechSynthesisVoice | undefined> {
  const find = () => {
    const voices = speech.getVoices().filter(voice => voice.localService && /^zh(?:[-_]|$)/i.test(voice.lang))
    return voices.find(voice => /^zh[-_]CN$/i.test(voice.lang)) ?? voices[0]
  }
  const voice = find()
  if (voice || speech.getVoices().length) return Promise.resolve(voice)
  return new Promise(resolve => {
    const check = () => {
      clearTimeout(timeout)
      speech.removeEventListener('voiceschanged', check)
      signal.removeEventListener('abort', check)
      resolve(signal.aborted ? undefined : find())
    }
    const timeout = setTimeout(check, 900)
    speech.addEventListener('voiceschanged', check, { once: true })
    signal.addEventListener('abort', check, { once: true })
  })
}

function readChunk(speech: SpeechSynthesis, voice: SpeechSynthesisVoice, text: string, rate: number, signal: AbortSignal) {
  return new Promise<boolean>(resolve => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = rate
    const finish = (ok: boolean) => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', cancel)
      utterance.onend = null
      utterance.onerror = null
      resolve(ok)
    }
    const cancel = () => finish(false)
    const timeout = setTimeout(cancel, 60000)
    signal.addEventListener('abort', cancel, { once: true })
    utterance.onend = () => finish(true)
    utterance.onerror = cancel
    try { speech.speak(utterance) } catch { finish(false) }
  })
}

/** True after playback ends, false when unavailable, null when intentionally stopped. */
export async function readText(text: string, rate = 1): Promise<boolean | null> {
  stopReading()
  if (!text.trim()) return null
  const controller = new AbortController()
  activeReading = controller
  const { signal } = controller
  try {
    const speech = window.speechSynthesis
    if (!speech || typeof SpeechSynthesisUtterance === 'undefined') throw Error()
    const voice = await chineseVoice(speech, signal)
    if (!voice || signal.aborted) throw Error()
    // Short segments keep browsers from dropping long readings. Include all punctuation and line breaks.
    const chunks = text.match(/[^。！？\n]{1,100}[。！？\n]*|[。！？\n]+/g) ?? [text]
    for (const chunk of chunks) {
      if (signal.aborted || !await readChunk(speech, voice, chunk, rate, signal)) throw Error()
    }
    return signal.aborted ? null : true
  } catch {
    if (signal.aborted) return null
    stopReading()
    showReadingFallback(text)
    return false
  } finally {
    if (activeReading === controller) activeReading = undefined
  }
}
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
