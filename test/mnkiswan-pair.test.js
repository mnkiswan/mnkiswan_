// Mnki and Swan, always together (MNKISWAN Cozy World): the canon looks are the slots' defaults and valid looks, a look
// tells which of the two it is, the portraits draw the same canon, and the tail / wings hang on the right looks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_LOOKS } from '../shared/content/index.js';
import { avatarOk } from '../shared/rules/actions/avatar.js';
import { MNKI_LOOK, SWAN_LOOK, pairOf, otherOf, lookOfSlot, PAIR_NAME } from '../public/js/game/mnkiswan-pair.js';
import { CANON, portraitSpec } from '../public/js/render/portrait.js';
import { bodyExtras, HATS } from '../public/js/render/avatar-looks.js';

test('the two farmers are Mnki and Swan by default, in looks the rules accept', () => {
  assert.equal(MNKI_LOOK.hat, 'monkey_band');
  assert.equal(SWAN_LOOK.hat, 'swan_hood');
  assert.ok(avatarOk({ ...MNKI_LOOK }), 'Mnki is a valid look');
  assert.ok(avatarOk({ ...SWAN_LOOK }), 'Swan is a valid look');
  for (const h of ['monkey_band', 'swan_hood']) assert.ok(HATS.includes(h), `the renderer draws ${h}`);
  assert.deepEqual(lookOfSlot(null, 'p1'), MNKI_LOOK);
  assert.deepEqual(lookOfSlot({ avatar: null }, 'p2'), SWAN_LOOK);
  assert.deepEqual(lookOfSlot({ avatar: { hat: 'cap' } }, 'p2'), { hat: 'cap' }, 'a chosen look is kept');
});

test('a look says which of the pair it is, and the other one walks beside them', () => {
  assert.equal(pairOf(MNKI_LOOK), 'mnki');
  assert.equal(pairOf(SWAN_LOOK), 'swan');
  assert.equal(pairOf({ body: 'farmer_b', hat: 'cap' }), 'swan', 'the build decides without a canon hat');
  assert.equal(pairOf({ body: 'farmer_b', hat: 'monkey_band' }), 'mnki', 'the headband is Mnki\'s');
  assert.equal(otherOf('mnki'), 'swan');
  assert.equal(otherOf('swan'), 'mnki');
  assert.deepEqual(PAIR_NAME, { mnki: 'Mnki', swan: 'Swan' });
});

test('the portraits draw the same canon as the farm (portrait.js keeps its own copy)', () => {
  assert.deepEqual({ ...CANON.p1 }, { ...AVATAR_LOOKS.defaults.p1 });
  assert.deepEqual({ ...CANON.p2 }, { ...AVATAR_LOOKS.defaults.p2 });
  assert.equal(portraitSpec('p2', { color: '#FF7A6B', avatar: null }).avatar.hat, 'swan_hood');
  assert.equal(portraitSpec('p1', { color: '#2BB3A3', avatar: { hat: 'cap' } }).avatar.hat, 'cap');
});

test('Mnki\'s tail and Swan\'s wings hang on their looks only', () => {
  assert.ok(bodyExtras(MNKI_LOOK).tail.getAttribute('position').count > 0);
  assert.equal(bodyExtras(MNKI_LOOK).wings, undefined);
  assert.ok(bodyExtras(SWAN_LOOK).wings.getAttribute('position').count > 0);
  assert.equal(bodyExtras({ hat: 'cap' }), null);
  assert.equal(bodyExtras(null), null);
});
