import test from 'node:test'
import assert from 'node:assert/strict'
import { copyDictionary } from '../src/app/copyDictionary.ts'
import { plainCopyExceptions, plainCopyViolations } from '../scripts/assert-plain-copy.mjs'
import { publicSourceDate } from '../src/app/sourceDate.ts'

test('the actual dictionary uses plain words, with only described internal terminal exceptions', () => {
  assert.deepEqual(plainCopyViolations(copyDictionary), [])
  for (const [key, reason] of Object.entries(plainCopyExceptions)) {
    assert.ok(reason.includes('终端'))
    assert.ok(plainCopyViolations({ [key]: copyDictionary[key] }, {}).length)
  }
})

test('the guard scans nested text and only exempts the named key', () => {
  const copy = { permitted: '复核', heading: '快照', detail: { label: '适用范围', values: ['赋能'] } }
  assert.deepEqual(plainCopyViolations(copy, { permitted: 'terminal' }), [
    { key: 'heading', word: '快照' }, { key: 'detail.label', word: '适用范围' }, { key: 'detail.values.0', word: '赋能' },
  ])
})

test('display formatting keeps the original source day', () => {
  assert.equal(publicSourceDate('2026-11-18'), '2026年11月18日')
  assert.equal(publicSourceDate('2026-01-09T15:40:02Z'), '2026年1月9日')
  assert.equal(publicSourceDate('还没有日期'), '还没有日期')
})

test('the remaining technical labels cannot return to the copy dictionary', () => {
  const old = ['依据与行动如何区分', '全部设备（超出依据限制时需选择单台）', '来源筛选']
  assert.equal(plainCopyViolations(old, {}).length, old.length)
  assert.equal(copyDictionary.cb63aeea9f6b0c425, '原文和行动怎么区分')
  assert.equal(copyDictionary.c0e8a6e4a4fd1d650, '设备较多，请先选一台')
  assert.equal(copyDictionary.assistantAllDevices, '全部设备')
})
