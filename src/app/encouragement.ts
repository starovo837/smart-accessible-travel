export type EncouragementContext = 'home' | 'services' | 'hospital' | 'scene' | 'fitting'

const contexts: readonly EncouragementContext[] = ['home', 'services', 'hospital', 'scene', 'fitting']

const messages: Record<EncouragementContext, readonly string[]> = {
  home: [
    '按自己的节奏来，今天也可以从一件小事开始。',
    '你的感受和选择，都值得被认真对待。',
    '需要时寻求支持，也是照顾自己的方式。',
  ],
  services: [
    '你可以说出自己的需要，也可以选择适合自己的方式。',
    '合适的支持，可以从说清自己的需要开始。',
    '选择可以慢慢比较，决定始终由你来做。',
  ],
  hospital: [
    '看诊时，你可以慢慢说明，也可以请对方再解释一次。',
    '你的疑问值得被听见，需要的支持也可以说出来。',
    '问清楚、再决定，按你能理解的节奏来。',
  ],
  scene: [
    '准备可以一步一步来，适合自己的安排最重要。',
    '无论今天安排多少，都可以按自己的节奏来。',
    '提前了解环境，是为自己的选择多留一点余地。',
  ],
  fitting: [
    '舒适和方便，由你的感受来决定。',
    '适合自己的方式，可以慢慢试、慢慢找。',
    '你的使用习惯，值得成为选择的重要依据。',
  ],
}

/** A calendar day determines both placement and copy; no profile or random selection is involved. */
export function selectEncouragement(context: EncouragementContext, date: Date = new Date()): string | null {
  if (!Number.isFinite(date.getTime())) return null
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  const offset = contexts.indexOf(context)
  // Only two contexts show a note on a given day, so it remains an occasional detail.
  if (((day + offset + 3) % contexts.length + contexts.length) % contexts.length >= 2) return null
  const choices = messages[context]
  const index = ((Math.floor(day / contexts.length) % choices.length) + choices.length) % choices.length
  return choices[index]
}
