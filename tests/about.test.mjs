import test from 'node:test'
import assert from 'node:assert/strict'
import { ABOUT_SOURCE_COUNT, ABOUT_UPDATED_AT, ABOUT_VERSION, aboutSections, updateHistory } from '../src/app/about.ts'

test('about page has exactly six concise blocks with three runnable tasks and five hard limits', () => {
  assert.equal(aboutSections.length, 6)
  assert.deepEqual(aboutSections.map(section => section.id), ['audience', 'can-do', 'cannot-do', 'sources', 'privacy', 'version'])
  assert.equal(aboutSections.find(section => section.id === 'can-do').items.length, 3)
  assert.equal(aboutSections.find(section => section.id === 'cannot-do').items.length, 5)
  assert.ok(aboutSections.flatMap(section => [...section.items]).every(item => item.trim() && item.length <= 64))
})

test('source disclosure and update history match the current catalog', () => {
  assert.equal(ABOUT_SOURCE_COUNT, 14)
  assert.equal(ABOUT_VERSION, '0.6.2')
  assert.equal(ABOUT_UPDATED_AT, '2026-11-21')
  assert.ok(aboutSections.find(section => section.id === 'sources').items.some(item => item.includes('14 个官方规则或服务入口')))
  assert.equal(updateHistory.length, 7)
  const version = aboutSections.find(section => section.id === 'version')
  assert.ok(version.items.some(item => item.includes(ABOUT_VERSION)))
  assert.ok(version.items.some(item => item.includes(ABOUT_UPDATED_AT)))
  assert.deepEqual([updateHistory[0].version, updateHistory[0].date], [ABOUT_VERSION, ABOUT_UPDATED_AT])
  for (const item of updateHistory) {
    assert.ok(item.change.trim())
    assert.ok(item.reason.trim())
  }
})
