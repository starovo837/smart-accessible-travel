import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultParent, lifeMenu, pageFromHash, pageHash, samePage } from '../src/app/navigation.ts';
import { livingEntries, livingScenes } from '../src/app/livingCatalog.ts';

test('service and scene routes keep the selected page and have a parent when opened directly', () => {
  for (const { id } of livingEntries) {
    const page = { screen: 'living-service', tool: id };
    assert.deepEqual(pageFromHash(pageHash(page)), page);
    assert.deepEqual(defaultParent(page), { screen: 'living-hub' });
  }
  for (const { id } of livingScenes) {
    const page = { screen: 'living-scene', scene: id };
    assert.deepEqual(pageFromHash(pageHash(page)), page);
    assert.deepEqual(defaultParent(page), { screen: 'living-hub' });
  }
  const magnifier = pageFromHash('#aid-magnifier');
  assert.deepEqual(magnifier, { screen: 'support-tool', tool: 'magnifier' });
  assert.deepEqual(defaultParent(magnifier), { screen: 'support' });
});

test('travel steps and nested daily tools are separate pages with in-app fallbacks', () => {
  const step3 = { screen: 'travel-input', step: 3 };
  const step2 = { screen: 'travel-input', step: 2 };
  assert.deepEqual(pageFromHash(pageHash(step3)), step3);
  assert.deepEqual(defaultParent(step3), step2);
  assert.equal(pageHash(defaultParent(step2)), '#travel');
  assert.equal(samePage(step3, step2), false);
  for (const child of [{ ...lifeMenu, task: 'routes' }, { ...lifeMenu, tool: 'talk' }]) {
    assert.deepEqual(pageFromHash(pageHash(child)), child);
    assert.deepEqual(defaultParent(child), lifeMenu);
  }
});

test('old app links still open, shared links and anchors remain outside page history', () => {
  assert.deepEqual(pageFromHash('#aid-learning'), pageFromHash('#learning'));
  assert.deepEqual(pageFromHash('#aid-voice'), pageFromHash('#support'));
  assert.deepEqual(pageFromHash('#aid-captions'), pageFromHash('#support'));
  assert.deepEqual(pageFromHash('#shop'), { screen: 'product-input' });
  assert.equal(samePage(pageFromHash('#shop'), { screen: 'product-result' }), false);
  assert.deepEqual(defaultParent({ screen: 'fit-shopping' }), pageFromHash('#shop'));
  for (const hash of ['#main-content', '#family/example/shared', '#help/example/shared', '#daily/tool-invalid']) {
    assert.equal(pageFromHash(hash), undefined);
  }
});
