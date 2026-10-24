// 2048 slide/merge math and dead-board detection (pure logic via the test hooks).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function game() {
  const win = {};
  const context = vm.createContext({
    window: win,
    document: { getElementById: () => ({ getContext: () => new Proxy({}, { get: (t, p) => (typeof p === 'string' ? function () {} : undefined) }) }) }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'launcher', 'js', 'merge.js'), 'utf8'), context);
  return win.MergeGame;
}

test('lines slide toward index 0 and merge each equal pair once per move', () => {
  const m = game();
  const slide = (line) => { const r = m._line(line); return { line: [...r.line], gained: r.gained }; };
  assert.deepEqual(slide([2, 2, 4, 0]), { line: [4, 4, 0, 0], gained: 4 });
  assert.deepEqual(slide([4, 4, 4, 4]), { line: [8, 8, 0, 0], gained: 16 });
  assert.deepEqual(slide([2, 0, 0, 2]), { line: [4, 0, 0, 0], gained: 4 });
  assert.deepEqual(slide([2, 4, 8, 16]), { line: [2, 4, 8, 16], gained: 0 });
  assert.deepEqual(slide([0, 0, 0, 2]), { line: [2, 0, 0, 0], gained: 0 });
});

test('a board is dead only when it is full with no adjacent equals', () => {
  const m = game();
  const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(m._dead(full), true, 'full checkerboard: no slide moves or merges');
  const gap = full.slice(); gap[15] = 0;
  assert.equal(m._dead(gap), false, 'an empty cell can receive a slide');
  const pair = full.slice(); pair[0] = 4;
  assert.equal(m._dead(pair), false, 'a horizontal pair can merge');
  const column = [2, 4, 8, 16, 2, 4, 8, 16, 8, 16, 2, 4, 16, 2, 4, 8];
  assert.equal(m._dead(column), false, 'a vertical pair can merge');
});
