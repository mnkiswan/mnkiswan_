// The Village chain (V, from MNKISWAN Cozy World): letters from the MNKISWAN villagers that start after the first
// evening, sit with the story cards on the Letters tab, and end with the village gathering.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT, questOf, npcOf, cropOf } from '../shared/content/index.js';
import { tabOf } from '../shared/rules/actions/quests.js';
import { farmAt, credit, valid, T0 } from './helpers/rules-goals.js';

const V = () => [...CONTENT.quests.values()].filter((q) => q.chain === 'V');

test('the Village chain: eleven letters from the MNKISWAN villagers, in order, from level 5 to the gathering at 14', () => {
  const chain = V();
  assert.deepEqual(chain.map((q) => q.id), ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11']);
  assert.equal(chain[0].level, 5, 'after the first evening');
  assert.equal(chain.at(-1).level, 14);
  assert.equal(chain.at(-1).title, 'A World Worth Returning To');
  for (const [i, q] of chain.entries()) {
    assert.equal(tabOf(q), 'story', `${q.id} is a story card (Letters)`);
    assert.equal(q.after, i ? chain[i - 1].id : null, `${q.id} follows the one before`);
    const giver = npcOf(q.giver);
    assert.ok(['willow', 'thronn', 'flora', 'pippa', 'milo'].includes(giver.id), `${q.id} is written by a villager`);
    assert.ok(giver.from <= q.level, `${q.id}: ${giver.id} speaks by L${q.level}`);
  }
  assert.deepEqual(questOf('v11').rewards, { acorns: 3, decor: ['lantern'] });
});

test('a level-5 farm gets Pippa\'s first letter, and Thronn\'s follows when a story slot is free', () => {
  const s = farmAt(5);
  // the first evening and the cards before L5 are done, so the three story slots take a7, c0 and v1 (all L5)
  for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'b1', 'e1']) { s.farm.quests.done[id] = T0; delete s.farm.quests.active[id]; }
  const planted = { e: 'planted', id: 'home.0.0', crop: 'carrot' };
  credit(s, [planted]);
  assert.ok(s.farm.quests.active.v1, 'Small Beginnings is on the board');
  for (let i = 0; i < 4; i++) credit(s, [planted]);
  const harvested = { e: 'harvested', id: 'home.0.0', crop: 'carrot', qty: 4, planter: 'p1', xp: cropOf('carrot').xp, fresh: false,
    ribbon: false, bonus: 0, star: 0 };
  const tx = credit(s, [harvested]);
  assert.ok(s.farm.quests.done.v1, 'v1 is done');
  assert.deepEqual(tx.events.filter((e) => e.e === 'questDone').map((e) => e.id), ['v1']);
  assert.ok(s.farm.quests.active.v2, 'Feathers and Fur takes the freed slot');
  valid(s);
});
