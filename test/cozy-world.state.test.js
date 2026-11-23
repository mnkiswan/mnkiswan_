// MNKISWAN Cozy World in the browser (public/cozy-world): the rules ported from the Godot project's game_state.gd.
// Positive, refused, duplicate and capacity cases, saves with a verified backup, and the whole twelve-request story.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, validate, CAPACITY, SAVE_KEY } from '../public/cozy-world/js/state.js';
import { QUESTS, REGIONS, ITEMS, CROPS, DECOR, NPCS } from '../public/cozy-world/js/data.js';

function memory() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
const fresh = () => createState({ storage: memory() });

test('the world as designed: 13 places, 12 requests, 8 villagers, 17 goods, 5 crops, 10 decorations', () => {
  assert.equal(REGIONS.length, 13);
  assert.equal(QUESTS.length, 12);
  assert.equal(NPCS.length, 8);
  assert.equal(Object.keys(ITEMS).length, 17);
  assert.equal(Object.keys(CROPS).length, 5);
  assert.equal(Object.keys(DECOR).length, 10);
  for (const q of QUESTS) {
    for (const id of q.requires) assert.ok(QUESTS.some((x) => x.id === id), `${q.id} requires ${id}`);
    for (const id of Object.keys(q.deliver)) assert.ok(ITEMS[id], `${q.id} delivers ${id}`);
  }
});

test('gathering regrows, and a full bag refuses without losing anything', () => {
  const s = fresh();
  assert.ok(s.gather('bush', 'berry'));
  assert.equal(s.count('berry'), 2);
  assert.equal(s.gather('bush', 'berry'), false, 'growing back');
  s.tick(151);
  assert.ok(s.gather('bush', 'berry'));
  s.data.inventory.fish = CAPACITY - s.used();
  const before = JSON.stringify(s.data);
  assert.equal(s.gather('other', 'berry'), false);
  assert.equal(JSON.stringify(s.data), before, 'a refused gather changes nothing');
});

test('farming: plant, water, grow while exploring or resting, harvest; never twice', () => {
  const s = fresh();
  assert.ok(s.plant('plot_00', 'rice'));
  assert.equal(s.plant('plot_00', 'rice'), false, 'one crop per plot');
  assert.equal(s.harvest('plot_00'), false, 'not ready');
  s.tick(500);
  assert.equal(s.data.plots.plot_00.growth, 0, 'an unwatered crop waits (and never dies)');
  assert.ok(s.water('plot_00'));
  assert.equal(s.water('plot_00'), false);
  s.rest(); // the rest of today: 100 s of the 110 rice needs (as in the Godot game)
  assert.equal(s.harvest('plot_00'), false);
  s.rest();
  assert.ok(s.harvest('plot_00'));
  assert.equal(s.count('rice'), CROPS.rice.yield);
  assert.equal(s.harvest('plot_00'), false);
  s.data.seeds.tomato = 0;
  assert.equal(s.plant('plot_01', 'tomato'), false, 'no seeds');
});

test('animals: a care action once a day; the hen\'s egg after she is fed', () => {
  const s = fresh();
  assert.equal(s.care('chicken', 'egg'), false);
  assert.equal(s.care('chicken', 'feed'), false, 'a berry or greens first');
  s.data.inventory.berry = 1;
  assert.ok(s.care('chicken', 'feed'));
  assert.equal(s.count('berry'), 0);
  assert.ok(s.care('chicken', 'egg'));
  assert.equal(s.count('egg'), 1);
  assert.equal(s.care('chicken', 'egg'), false, 'one egg a day');
  assert.ok(s.care('cow', 'pet'));
  assert.equal(s.care('cow', 'pet'), false);
  s.rest();
  assert.ok(s.care('cow', 'pet'), 'a new day');
  assert.equal(s.metric('animal_friends'), 2);
  assert.equal(s.care('dragon', 'pet'), false);
});

test('the market: request ingredients are reserved, sales pay, seeds / decor / stall cost coins', () => {
  const s = fresh();
  s.data.inventory.berry = 5;
  assert.equal(s.reserved('berry'), 5, 'welcome (3) and the picnic (2) are open');
  assert.equal(s.sell('berry', 1), false);
  s.data.inventory.mango = 3;
  assert.ok(s.sell('mango', 3));
  assert.equal(s.data.coins, 18 + 15);
  assert.equal(s.metric('earned'), 15);
  assert.equal(s.sell('mango', 1), false);
  assert.ok(s.buySeed('carrot'));
  assert.equal(s.upgrade(), false, 'not enough coins');
  s.data.coins = 1000;
  assert.ok(s.upgrade()); assert.ok(s.upgrade()); assert.ok(s.upgrade());
  assert.equal(s.upgrade(), false, 'three improvements');
  assert.ok(s.buyDecor('lamp'));
  assert.equal(s.buyDecor('lamp'), false, 'owned once');
  assert.ok(s.placeDecor('lamp', 0));
  assert.ok(s.placeDecor('lamp', 6), 'moving a piece leaves no copy behind');
  assert.deepEqual(s.data.decor_placed, { 6: 'lamp' });
  assert.equal(s.placeDecor('lamp', 10), false);
});

test('saves: versioned, validated, a verified backup, and recovery from a broken primary', () => {
  const st = memory();
  const s = createState({ storage: st });
  assert.equal(s.hasSave(), false);
  s.data.coins = 77;
  assert.ok(s.save());
  s.data.coins = 88;
  assert.ok(s.save());
  assert.equal(JSON.parse(st.getItem(`${SAVE_KEY}.bak`)).coins, 77, 'the previous save is the backup');
  st.setItem(SAVE_KEY, '{ broken');
  const t = createState({ storage: st });
  assert.ok(t.load());
  assert.equal(t.data.coins, 77, 'recovered from the backup');
  assert.equal(validate({ ...s.data, coins: -1 }), false);
  assert.equal(validate({ ...s.data, inventory: { fish: CAPACITY + 1 } }), false);
  assert.equal(validate({ ...s.data, completed: ['welcome', 'welcome'] }), false);
  assert.equal(validate({ ...s.data, version: 2 }), false);
  s.data.coins = -5;
  const kept = st.getItem(SAVE_KEY);
  assert.equal(s.save(), false, 'an invalid world is never written');
  assert.equal(st.getItem(SAVE_KEY), kept);
});

test('the whole story: every request, every place, and the village gathering', () => {
  const s = fresh();
  const milestones = [];
  s.on('milestone', (id) => milestones.push(id));
  const claim = (id) => assert.ok(s.claimQuest(id), id);
  assert.equal(s.claimQuest('welcome'), false, 'not yet');
  s.data.inventory.berry = 5; claim('welcome');
  s.data.inventory.mango = 2; s.data.inventory.banana = 2; claim('fruit');
  assert.ok(s.catchFish()); claim('fishing');
  s.data.inventory.berry = 3;
  for (const a of ['chicken', 'cow', 'sheep']) assert.ok(s.care(a, 'pet'));
  claim('care');
  for (const p of ['plot_00', 'plot_01']) { assert.ok(s.plant(p, 'rice')); assert.ok(s.water(p)); }
  claim('planting');
  s.rest();
  assert.ok(s.harvest('plot_00')); claim('harvest');
  s.data.inventory.flower = 5; claim('garden');
  s.data.inventory.fish = 5; assert.ok(s.sell('fish', 5)); claim('trade');
  assert.ok(s.upgrade()); claim('stall');
  for (const g of ['land', 'water', 'forest']) assert.ok(s.guardian(g));
  assert.equal(s.guardian('land'), false);
  claim('guardians');
  assert.ok(s.placeDecor('basket', 0));
  s.data.coins += 100; assert.ok(s.buyDecor('rug')); assert.ok(s.placeDecor('rug', 5));
  claim('home');
  assert.equal(s.claimQuest('together'), false, 'every place first');
  for (const r of REGIONS) s.discover(r.id);
  claim('together');
  assert.equal(s.data.completed.length, 12);
  assert.ok(s.data.flags.includes('festival'));
  assert.ok(milestones.includes('together'));
  assert.equal(s.claimQuest('together'), false, 'never twice');
  assert.ok(validate(JSON.parse(JSON.stringify(s.data))));
});
