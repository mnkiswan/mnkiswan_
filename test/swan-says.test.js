// Swan's comments (public/js/game/swan-says.js, from MNKISWAN Cozy World): which moments she speaks at, how rarely,
// and that every line she can say exists in English and Bulgarian.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swanKey, createSwanSays, SWAN_GAP_MS } from '../public/js/game/swan-says.js';
import en from '../public/js/i18n/en/game.js';
import bg from '../public/js/i18n/bg/game.js';

const table = (m) => m.default ?? m.strings ?? m;

test('Swan speaks at firsts and milestones, and stays quiet about other people\'s chores', () => {
  assert.equal(swanKey({ e: 'harvested' }, { mine: true }).key, 'harvest');
  assert.equal(swanKey({ e: 'harvested' }, { mine: false }), null);
  assert.equal(swanKey({ e: 'fishCaught' }, { mine: true }).once, 'ever');
  assert.equal(swanKey({ e: 'fishCaught', record: true }, { mine: true }).key, 'fishRecord');
  assert.equal(swanKey({ e: 'levelUp', scope: 'player', level: 3 }), null, 'a personal level is not the farm\'s');
  assert.equal(swanKey({ e: 'levelUp', scope: 'farm', level: 3 }).key, 'level3');
  assert.equal(swanKey({ e: 'questDone', id: 'v3' }, { chain: 'V' }).key, 'quest:v3');
  assert.equal(swanKey({ e: 'questDone', id: 'a1' }, { chain: 'A', mine: false }), null);
  assert.equal(swanKey({ e: 'watered' }, { mine: true }), null);
  assert.equal(swanKey(null), null);
});

test('every line Swan can say is in English and in Bulgarian', () => {
  const E = table(en); const B = table(bg);
  const keys = new Set(['game.swan.says']);
  for (const ev of [{ e: 'harvested' }, { e: 'fishCaught' }, { e: 'fishCaught', record: true }, { e: 'beautyStar', stars: 1 },
    { e: 'expanded', expansion: 'x' }, { e: 'petted' }, { e: 'levelUp', scope: 'farm', level: 2 }, { e: 'questDone', id: 'a1' }]) {
    for (const k of swanKey(ev, { mine: true }).lines) keys.add(k);
  }
  for (const k of swanKey({ e: 'questDone', id: 'v1' }, { chain: 'V' }).lines) keys.add(k);
  for (const k of keys) {
    assert.ok(typeof E[k] === 'string' && E[k].length > 3, `en ${k}`);
    assert.ok(typeof B[k] === 'string' && B[k].length > 3, `bg ${k}`);
  }
});

test('once means once, and a minute passes between her everyday lines', () => {
  const handlers = {};
  const store = { pid: 'p1', on(name, fn) { handlers[name] = fn; return () => {}; } };
  const said = [];
  const ui = { toast(text) { said.push(typeof text === 'function' ? text() : text); return null; } };
  let t = 1_000_000;
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  createSwanSays({ store, ui, now: () => t, storage });
  handlers.fx({ ev: { e: 'harvested', by: 'p1' }, by: 'p1', local: true });
  handlers.fx({ ev: { e: 'harvested', by: 'p1' }, by: 'p1', local: true });
  assert.equal(said.length, 1, 'the first harvest is said once');
  handlers.fx({ ev: { e: 'petted', by: 'p1' }, by: 'p1', local: true });
  assert.equal(said.length, 1, 'an everyday line waits for the gap');
  t += SWAN_GAP_MS;
  handlers.fx({ ev: { e: 'petted', by: 'p1' }, by: 'p1', local: true });
  assert.equal(said.length, 2);
  t += SWAN_GAP_MS;
  handlers.fx({ ev: { e: 'petted', by: 'p1' }, by: 'p1', local: true });
  assert.equal(said.length, 2, 'once a day');
  handlers.celebrate({ ev: { e: 'levelUp', scope: 'farm', level: 4, catchUp: true }, by: null });
  assert.equal(said.length, 2, 'a catch-up after a reconnect is not news');
});
