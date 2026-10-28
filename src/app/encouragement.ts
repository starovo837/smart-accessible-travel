export type EncouragementContext = 'home' | 'support' | 'services' | 'hospital' | 'scene' | 'fitting' | 'shopping' | 'travel' | 'daily' | 'assistant' | 'profile'

/** General, non-clinical copy. No profile or personal record is used to choose a message. */
export const encouragementMessages: Record<EncouragementContext, readonly string[]> = {
  home: [
    '按自己的节奏来，今天也可以从一件小事开始。',
    '你的感受和选择，都值得被认真对待。',
    '需要时寻求支持，也是照顾自己的方式。',
    '今天想先做什么，由你决定。',
    '把事情分成小步，走到哪一步都算数。',
    '愿今天有一点轻松，也有一点属于自己的时间。',
    '做喜欢的事，也可以是今天的重要安排。',
    '暂时停一停，再出发也来得及。',
  ],
  support: [
    '每个人需要的支持不同，你可以自由选择。',
    '让工具适应你的习惯，也是一种好的开始。',
    '表达自己的需要，不必先向别人解释所有经历。',
    '选择一种顺手的方式，让今天更方便一点。',
    '可以多试几种工具，留下自己喜欢的。',
    '你的偏好很重要，辅助方式也可以随时调整。',
    '不必一次学会全部，从眼前需要的功能开始。',
    '适合你的帮助，可以由你来定义。',
  ],
  services: [
    '你可以说出自己的需要，也可以选择适合自己的方式。',
    '合适的支持，可以从说清自己的需要开始。',
    '选择可以慢慢比较，决定始终由你来做。',
    '问清服务的细节，是在认真照顾自己的需要。',
    '遇到不合适的安排，你可以提出调整。',
    '需要陪同还是独立办理，都可以按自己的意愿选择。',
    '保留自己的问题，沟通时一件一件说清楚。',
    '一时没找到合适的渠道，也可以换一种方式再找。',
  ],
  hospital: [
    '看诊时，你可以慢慢说明，也可以请对方再解释一次。',
    '你的疑问值得被听见，需要的支持也可以说出来。',
    '问清楚、再决定，按你能理解的节奏来。',
    '把在意的问题记下来，就不用急着一次想全。',
    '可以请工作人员用更方便理解的方式说明。',
    '身体的感受，由你来描述；疑问也可以继续追问。',
    '等候的时候，可以为自己留一点休息的时间。',
    '照顾自己，也包括让自己的意愿被认真听见。',
  ],
  scene: [
    '准备可以一步一步来，适合自己的安排最重要。',
    '无论今天安排多少，都可以按自己的节奏来。',
    '提前了解环境，是为自己的选择多留一点余地。',
    '有些安排可以调整，不必勉强自己赶上别人的节奏。',
    '把需要的东西准备好，也给自己留一点休息的余地。',
    '临时改变计划没有关系，方便和舒适同样重要。',
    '先完成眼前的一步，再决定接下来怎么走。',
    '你可以选择独自完成，也可以邀请信任的人一起。',
  ],
  fitting: [
    '舒适和方便，由你的感受来决定。',
    '适合自己的方式，可以慢慢试、慢慢找。',
    '你的使用习惯，值得成为选择的重要依据。',
    '每一处合适的小细节，都可能让日常轻松一点。',
    '试配时可以多比较几次，不必急着做决定。',
    '你熟悉自己的身体，试用感受值得被认真记录。',
    '好用的辅具，应当服务于你想过的生活。',
    '调整尺寸和姿势，是在寻找更适合自己的方式。',
  ],
  shopping: [
    '慢慢比较，给自己的选择留一点时间。',
    '合适比热门更重要，你的日常需要值得放在前面。',
    '参数看不懂时，可以一项一项问清楚。',
    '不合适也可以放下，选择权一直在你手里。',
    '把最在意的使用场景写下来，比较时会更有方向。',
    '便于操作、舒适顺手，都是值得认真考虑的优点。',
    '购买前多问一句，也是在照顾今后的自己。',
    '预算和偏好都值得被尊重，选择可以按你的需要来。',
  ],
  travel: [
    '按自己的节奏准备，路上也可以为休息留出时间。',
    '说清需要的协助，让出行安排更贴近你的习惯。',
    '提前确认一件事，就能少一份临时忙乱。',
    '出发的方式有很多，适合自己的那种就很好。',
    '遇到不清楚的流程，可以请工作人员再说明一次。',
    '行程可以留些余地，舒适地到达也很重要。',
    '想去的地方值得期待，准备工作可以一步一步来。',
    '需要停下休息时，不必为自己的节奏感到抱歉。',
  ],
  daily: [
    '生活里的小便利，也值得认真安排。',
    '今天做多少，可以由自己的状态决定。',
    '给自己留一点空闲，日常也可以有喜欢的节奏。',
    '把需要记住的事交给清单，给自己腾一点空间。',
    '顺手的工具和舒服的环境，都是照顾自己的方式。',
    '完成一件小事之后，也可以歇一会儿。',
    '不必把每一天安排得一样，生活可以有不同节奏。',
    '那些让你觉得轻松的小办法，值得留给自己。',
  ],
  assistant: [
    '问题可以慢慢说，不需要一次表达得很完整。',
    '没弄明白也没关系，可以换一种说法再问。',
    '你可以随时补充、改正，按自己的思路往下聊。',
    '先问最在意的一件事，其他问题可以接着来。',
    '理解需要一点时间，你可以请对方解释得更简单。',
    '想确认的细节，都可以再多问一句。',
    '表达自己的想法，有很多种同样重要的方式。',
    '不急着下结论，先把需要的信息找齐。',
  ],
  profile: [
    '你的资料和偏好，由你自己决定怎样保留。',
    '辅助设置可以随时调整，适合现在的自己就好。',
    '不想填写的内容，可以先留空。',
    '需要什么支持，你可以在不同的时候给出不同答案。',
    '改变偏好很平常，工具也可以跟着你一起调整。',
    '为自己选一个舒服的字号，也是一件重要的小事。',
    '保留习惯，也保留随时改变的自由。',
    '你的意愿很重要，分享和保存都可以由你选择。',
  ],
}

const contexts = Object.keys(encouragementMessages) as EncouragementContext[]

/** Every supported context has a note; the date is only a repeatable starting point. */
export function selectEncouragement(context: EncouragementContext, date: Date = new Date(), variation = 0): string | null {
  if (!Number.isFinite(date.getTime()) || !Number.isSafeInteger(variation)) return null
  const choices = encouragementMessages[context]
  if (!choices) return null
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  const index = day + contexts.indexOf(context) * 3 + variation
  return choices[((index % choices.length) + choices.length) % choices.length]
}

/** In-memory rotation, without storage, profile access, timers, or automatic announcements. */
export function createEncouragementCycle() {
  const previous = new Map<EncouragementContext, string>()
  return (context: EncouragementContext, date: Date = new Date()): string | null => {
    const first = selectEncouragement(context, date)
    if (!first) return null
    const choices = encouragementMessages[context]
    const last = previous.get(context)
    const message = last ? choices[(choices.indexOf(last) + 1) % choices.length] : first
    previous.set(context, message)
    return message
  }
}

export const nextEncouragement = createEncouragementCycle()
