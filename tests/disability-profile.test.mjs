import test from 'node:test'
import assert from 'node:assert/strict'
import { disabilityCategories, disabilitySummary, normalizeDisabilityProfile } from '../src/app/disabilityProfile.ts'

test('six basic legal categories are independent and multiple disability is derived', () => {
  assert.deepEqual(disabilityCategories.map(item => item.name), ['视力残疾', '听力残疾', '言语残疾', '肢体残疾', '智力残疾', '精神残疾'])
  const profile = normalizeDisabilityProfile({ selections: [{ category: 'physical', grade: 2, deviceIds: [] }, { category: 'vision', grade: 1, deviceIds: [] }] })
  assert.deepEqual(disabilitySummary(profile), { multiple: true, overallGrade: 1, names: ['视力残疾', '肢体残疾'] })
  assert.equal(disabilitySummary({ selections: [{ category: 'vision', grade: 1, deviceIds: [] }] }).multiple, false)
})

test('unknown grades remain unknown and old need labels are not converted', () => {
  const profile = normalizeDisabilityProfile({ selections: [{ category: 'vision', grade: 1 }, { category: 'mental' }, { category: 'cognitive' }, { category: 'chronic' }] })
  assert.deepEqual(profile.selections.map(item => item.category), ['vision', 'mental'])
  assert.equal(disabilitySummary(profile).overallGrade, undefined)
  assert.deepEqual(normalizeDisabilityProfile({ selections: [{ category: 'mental', grade: 8, accompaniment: false, deviceIds: ['x', 'x'] }] }).selections, [{ category: 'mental', accompaniment: false, deviceIds: ['x'] }])
})
