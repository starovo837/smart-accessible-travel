import test from 'node:test'
import assert from 'node:assert/strict'
import { workbenchGroups, workbenchItems } from '../src/app/workbench.ts'
import { supportTools } from '../src/app/supportCatalog.ts'

test('workbench exposes all current assistance tools once without voice input destinations', () => {
  const supportIds = supportTools.map(item => item.id)
  const linked = workbenchItems.filter(item => supportIds.includes(item.target))
  assert.equal(linked.length, 19)
  assert.deepEqual(linked.map(item => item.target).sort(), [...supportIds].sort())
  assert.ok(workbenchItems.every(item => !['voice', 'captions'].includes(item.target)))
  assert.ok(workbenchItems.every(item => item.icon !== 'mic'))
})

test('workbench includes each real core and personal action with a unique target', () => {
  const actions = ['fitting', 'shop', 'travel', 'assistant', 'profile', 'devices', 'choose-needs', 'offline']
  assert.equal(workbenchItems.length, 27)
  assert.equal(new Set(workbenchItems.map(item => item.id)).size, 27)
  assert.equal(new Set(workbenchItems.map(item => item.target)).size, 27)
  for (const target of actions) assert.equal(workbenchItems.filter(item => item.target === target).length, 1, target)
  assert.ok(workbenchItems.every(item => item.id === item.target && item.label.trim() && item.description.trim()))
})

test('workbench groups keep every destination in one meaningful category', () => {
  assert.equal(workbenchGroups.length, 6)
  assert.equal(new Set(workbenchGroups.map(group => group.id)).size, 6)
  const groupFor = target => workbenchGroups.filter(group => group.items.some(item => item.target === target)).map(group => group.id)
  assert.deepEqual(groupFor('travel'), ['equipment-travel'])
  assert.deepEqual(groupFor('communication'), ['reading-communication'])
  assert.deepEqual(groupFor('healthcare'), ['daily-health'])
  assert.deepEqual(groupFor('digital-help'), ['affairs-participation'])
  assert.deepEqual(groupFor('learning'), ['affairs-participation'])
  assert.deepEqual(groupFor('live-help'), ['map-help'])
  assert.deepEqual(groupFor('offline'), ['personal-settings'])
})
