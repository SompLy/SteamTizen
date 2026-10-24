// Breakout: serving, paddle bounce, brick scoring, and the lose path. The physics
// has no randomness, so trajectories are fully deterministic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function runtime() {
  let now = 1000000, rafCb = null;
  const ctxStub = new Proxy({}, { get: (t, p) => (typeof p === 'string' ? function () {} : undefined) });
  const win = {};
  const context = vm.createContext({
    window: win,
    document: { getElementById: () => ({ getContext: () => ctxStub }) },
    requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
    cancelAnimationFrame: () => { rafCb = null; }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'launcher', 'js', 'breakout.js'), 'utf8'), context);
  return {
    B: win.BreakoutGame,
    tick: () => { now += 16; if (rafCb) { const cb = rafCb; rafCb = null; cb(now); } }
  };
}

test('OK serves the ball upward from the paddle', () => {
  const g = runtime();
  g.B.open();
  let s = g.B._state();
  assert.equal(s.serving, true);
  assert.equal(s.lives, 3);
  g.B.keydown(13);
  s = g.B._state();
  assert.equal(s.serving, false);
  assert.ok(s.ball.vy < 0, 'the serve must move the ball up');
});

test('a tracked paddle keeps the ball alive while bricks score', () => {
  const g = runtime();
  g.B.open();
  g.B.keydown(13);
  for (let t = 0; t < 400; t++) {
    const s = g.B._state();
    if (s.ball.x > s.px + 20) { g.B.keydown(39); }
    else if (s.ball.x < s.px - 20) { g.B.keydown(37); }
    g.tick();
  }
  const s = g.B._state();
  assert.equal(s.dead, false, 'a tracked ball must never fall past the paddle');
  assert.equal(s.lives, 3);
  assert.ok(s.score >= 10, 'bricks must have been hit during the rally');
});

test('an unattended ball misses, drops all three lives, and stops the game', () => {
  const g = runtime();
  g.B.open();
  for (let t = 0; t < 800; t++) {
    if (g.B._state().serving) { g.B.keydown(13); }  // only OK re-serves after a miss
    g.tick();
  }
  const s = g.B._state();
  assert.ok(s.score >= 10, 'the first flight still breaks a brick');
  assert.equal(s.lives, 0);
  assert.equal(s.dead, true);
  g.B.keydown(13);                  // OK restarts
  const again = g.B._state();
  assert.equal(again.dead, false);
  assert.equal(again.lives, 3);
});
