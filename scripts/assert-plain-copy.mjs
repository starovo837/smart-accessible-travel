import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { copyDictionary } from '../src/app/copyDictionary.ts'

const banned = /核验|复核|快照|闭环|赋能|抓手|颗粒度|适用范围|依据与行动如何区分|超出依据限制时需选择单台|来源筛选/u
export const plainCopyExceptions = Object.freeze({
  ruleReviewWritten: '本机条款审查命令的终端输出',
  ruleBundleTooLarge: '仅部署时校验文件的终端错误',
  ruleBundleReserved: '仅部署时校验白名单的终端错误',
  ruleBundleSecret: '仅部署时扫描文件的终端错误',
})

export function plainCopyViolations(values, exceptions = plainCopyExceptions) {
  const hits = []
  function visit(value, key) {
    if (typeof value === 'string') {
      const word = value.match(banned)?.[0]
      if (word && !Object.hasOwn(exceptions, key)) hits.push({ key, word })
    } else if (value && typeof value === 'object') {
      for (const [child, entry] of Object.entries(value)) visit(entry, key ? key + '.' + child : child)
    }
  }
  visit(values, '')
  return hits
}

export function assertPlainCopy() {
  const hits = plainCopyViolations(copyDictionary)
  if (hits.length) {
    throw new Error('界面文案含禁用词。\n' + hits.map(({ key, word }) => key + ' → ' + word).join('\n'))
  }
  console.log('Plain copy guard passed.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) assertPlainCopy()
