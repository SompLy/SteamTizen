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

test('a fresh farm plays: plant, grow, harvest, and the seed comes back', () => {
  const g = runtime();
  g.FarmGame.open();
  workRow(g);                       // plant (0..3,0), seeds 4 → 0
  g.tick(4500);                     // both planted crops reach full growth
  for (let i = 0; i < 4; i++) { if (i) { g.FarmGame.keydown(37); } g.FarmGame.keydown(13); }
  const s = saved(g);
  assert.equal(s.coins, 8);
  assert.equal(s.seeds, 4);         // every harvest returns its seed
  assert.equal(s.total, 4);
  assert.equal(s.plots[0].stage, 0);
});

test('the shop: out of seeds opens it, buying spends coins, BACK backs out first', () => {
  const g = runtime();
  g.FarmGame.open();
  for (let round = 0; round < 2; round++) { workRow(g); g.tick(4500); for (let i = 0; i < 4; i++) { if (i) { g.FarmGame.keydown(37); } g.FarmGame.keydown(13); } }
  assert.equal(saved(g).coins, 16);
  workRow(g);                       // spend every seed again
  g.FarmGame.keydown(40);           // down to (3,1), an empty plot
  g.FarmGame.keydown(13);           // out of seeds → the shop opens
  g.FarmGame.keydown(13);           // OK buys the selected Sprinkler (10 coins)
  let s = saved(g);
  assert.equal(s.lv.sprinkler, 1);
  assert.equal(s.coins, 6);
  g.FarmGame.keydown(404);          // GREEN closes the shop, the game stays open
  assert.equal(g.FarmGame.keydown(10009), false);  // BACK on the farm asks the shell to quit
  g.FarmGame.close();
  g.FarmGame.open();                // progress survived the close via localStorage
  s = saved(g);
  assert.equal(s.lv.sprinkler, 1);
  assert.equal(s.coins, 6);
  g.FarmGame.keydown(404);          // shop again
  g.FarmGame.keydown(40);           // select Market stall
  g.FarmGame.keydown(13);           // 15 coins > 6 → refused
  assert.ok(g.toasts.includes('Not enough coins'));
  g.FarmGame.keydown(404);          // close shop
  g.tick(3600);                     // sprinkler crops finish at 80% of 4500 ms
  g.FarmGame.keydown(38);           // back up to (3,0), grown
  for (let i = 0; i < 4; i++) { if (i) { g.FarmGame.keydown(37); } g.FarmGame.keydown(13); }
  assert.equal(saved(g).coins, 14);
  g.FarmGame.keydown(13);           // plant (0,0) at the faster rate
  g.tick(3600);                     // exactly the sprinkler finish time
  g.FarmGame.keydown(13);           // the crop is grown: OK pays out instead of planting
  s = saved(g);
  assert.equal(s.coins, 16);        // 14 + 2: a base-rate crop would still be growing here
  assert.equal(s.seeds, 4);         // 4 planted over, 3 left after planting, +1 returned
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
