// The Mini Farm shop: economy, upgrade purchases, persistence, and BACK handling.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const SAVE_KEY = 'aerotizen.farm.v1';

function runtime() {
  const store = new Map(), toasts = [];
  let now = 1000000, rafCb = null;
  const ctxStub = new Proxy({}, { get: (t, prop) => (typeof prop === 'string' ? function () {} : undefined) });
  const A = { toast: (m) => toasts.push(m) };
  const win = { AeroTizen: A };
  const context = vm.createContext({
    window: win, AeroTizen: A,
    document: { getElementById: () => ({ getContext: () => ctxStub }) },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    Date: { now: () => now },
    requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
    cancelAnimationFrame: () => { rafCb = null; }
  });
  for (const file of ['config.js', 'farm.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'launcher', 'js', file), 'utf8'), context);
  }
  return {
    A, toasts, store, FarmGame: win.FarmGame,
    tick: (ms) => { now += ms; if (rafCb) { const cb = rafCb; rafCb = null; cb(now); } }
  };
}

function saved(g) { return JSON.parse(g.store.get(SAVE_KEY)); }

// Plant or harvest the plots under the cursor, walking the top row left to right.
function workRow(g) {
  for (let i = 0; i < 4; i++) { if (i) { g.FarmGame.keydown(39); } g.FarmGame.keydown(13); }
}

// Harvest the grown plots right to left, ending on (0,0).
function harvestRow(g) {
  for (let i = 0; i < 4; i++) { if (i) { g.FarmGame.keydown(37); } g.FarmGame.keydown(13); }
}

test('a fresh farm plays: plant, grow, harvest, and the seed comes back', () => {
  const g = runtime();
  g.FarmGame.open();
  workRow(g);                       // plant (0..3,0), seeds 4 → 0
  g.tick(4500);                     // both planted crops reach full growth
  harvestRow(g);
  const s = saved(g);
  assert.equal(s.coins, 8);
  assert.equal(s.seeds, 4);         // every harvest returns its seed
  assert.equal(s.total, 4);
  assert.equal(s.plots[0].stage, 0);
});

test('the shop: hut and empty-plot openings, buying, Done and BACK close it', () => {
  const g = runtime();
  g.FarmGame.open();
  for (let round = 0; round < 2; round++) { workRow(g); g.tick(4500); harvestRow(g); }
  assert.equal(saved(g).coins, 16);
  workRow(g);                       // spend every seed: four crops growing, none left
  g.FarmGame.keydown(40);           // down to (3,1), an empty plot
  g.FarmGame.keydown(13);           // out of seeds → the shop opens
  g.FarmGame.keydown(13);           // OK buys the selected Sprinkler (10 coins)
  let s = saved(g);
  assert.equal(s.lv.sprinkler, 1);
  assert.equal(s.coins, 6);
  for (let i = 0; i < 4; i++) { g.FarmGame.keydown(40); }  // down to Done
  g.FarmGame.keydown(13);           // OK on Done closes the shop
  assert.equal(g.FarmGame.keydown(10009), false);         // BACK at the farm quits: the shop is closed
  g.FarmGame.close();
  g.FarmGame.open();                // progress survived the close via localStorage
  s = saved(g);
  assert.equal(s.lv.sprinkler, 1);
  assert.equal(s.coins, 6);
  for (let i = 0; i < 2; i++) { g.FarmGame.keydown(39); }  // cursor reopened at (3,1):
  for (let i = 0; i < 2; i++) { g.FarmGame.keydown(40); }  // walk to the hut at (5,3)
  g.FarmGame.keydown(13);           // OK on the hut opens the shop
  g.FarmGame.keydown(40);           // select Market stall
  g.FarmGame.keydown(13);           // 15 coins > 6 → refused
  assert.ok(g.toasts.includes('Not enough coins'));
  g.FarmGame.keydown(10009);        // BACK backs out of the shop; the game stays open
  assert.equal(g.FarmGame.keydown(10009), false);         // now BACK quits the game
  g.tick(3600);                     // the four crops finish at the sprinkler rate (80% of 4500)
  for (let i = 0; i < 3; i++) { g.FarmGame.keydown(38); }  // (5,3) → (5,0)
  for (let i = 0; i < 2; i++) { g.FarmGame.keydown(37); }  // → (3,0), grown
  harvestRow(g);
  assert.equal(saved(g).coins, 14); // 6 + 8
  g.FarmGame.keydown(13);           // replant (0,0) at the faster rate
  g.tick(3600);                     // exactly the sprinkler finish time
  g.FarmGame.keydown(13);           // the crop is grown: OK pays out instead of planting
  s = saved(g);
  assert.equal(s.coins, 16);        // 14 + 2: a base-rate crop would still be growing here
  assert.equal(s.seeds, 4);         // 4 - 1 planted + 1 returned
});

test('a corrupt or wrong-shaped save falls back to a fresh farm', () => {
  const g = runtime();
  g.store.set(SAVE_KEY, '{not json');
  g.FarmGame.open();
  g.FarmGame.keydown(13);
  let s = saved(g);
  assert.equal(s.seeds, 3);
  assert.equal(s.coins, 0);
  assert.equal(s.lv.sprinkler, 0);
  g.store.set(SAVE_KEY, JSON.stringify({ coins: 99, seeds: 9, total: 9, lv: { sprinkler: 3 }, rows: 4, plots: [{ stage: 0, at: 0 }] }));
  g.FarmGame.close();
  g.FarmGame.open();
  g.FarmGame.keydown(13);
  s = saved(g);
  assert.equal(s.seeds, 3);         // not 8: the bogus 99-coin save was discarded
});
