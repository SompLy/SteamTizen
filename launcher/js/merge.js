// Built-in puzzle: 2048. Arrows slide the whole board and merge equal tiles once
// per move; the board is dead when nothing can move or merge any more.
window.MergeGame = (function () {
  'use strict';

  var N = 4, CELL = 190, GAP = 16, BOARD = N * CELL + (N - 1) * GAP;
  var GX = (1920 - BOARD) / 2, GY = (1080 - BOARD) / 2 + 40;
  var FILL = { 2: '#2c3a4a', 4: '#33465c', 8: '#2a6f97', 16: '#1a9fff', 32: '#3aa55d',
               64: '#2c8f4e', 128: '#b98a1e', 256: '#f5c518', 512: '#e08b1e',
               1024: '#c2650d', 2048: '#c2380d' };
  var canvas = null, ctx = null, tiles = [], score = 0, dead = false;

  // Slides one line (ordered toward the slide direction) and merges equal neighbours
  // once each; returns the new line and the score gained.
  function slideLine(line) {
    var vals = line.filter(function (v) { return v; });
    var out = [], gained = 0;
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); gained += vals[i] * 2; i++; }
      else { out.push(vals[i]); }
    }
    while (out.length < line.length) { out.push(0); }
    return { line: out, gained: gained };
  }

  function isDead(g) {
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var v = g[r * N + c];
        if (!v) { return false; }
        if (c < N - 1 && g[r * N + c + 1] === v) { return false; }
        if (r < N - 1 && g[(r + 1) * N + c] === v) { return false; }
      }
    }
    return true;
  }

  // Board index of position j in slide-line i for a slide direction.
  function cellAt(dir, i, j) {
    if (dir === 'left') { return i * N + j; }
    if (dir === 'right') { return i * N + (N - 1 - j); }
    if (dir === 'up') { return j * N + i; }
    return (N - 1 - j) * N + i;
  }

  function lineCells(dir, i) {
    var out = [];
    for (var j = 0; j < N; j++) { out.push(tiles[cellAt(dir, i, j)]); }
    return out;
  }

  function spawn() {
    var empty = [];
    for (var i = 0; i < tiles.length; i++) { if (!tiles[i]) { empty.push(i); } }
    if (!empty.length) { return; }
    tiles[empty[(Math.random() * empty.length) | 0]] = Math.random() < 0.9 ? 2 : 4;
  }

  function move(dir) {
    var moved = false;
    for (var i = 0; i < N; i++) {
      var res = slideLine(lineCells(dir, i));
      for (var j = 0; j < N; j++) {
        var idx = cellAt(dir, i, j);
        if (tiles[idx] !== res.line[j]) { moved = true; tiles[idx] = res.line[j]; }
      }
      score += res.gained;
    }
    if (moved) { spawn(); if (isDead(tiles)) { dead = true; } }
    return moved;
  }

  function reset() {
    tiles = [];
    for (var i = 0; i < N * N; i++) { tiles.push(0); }
    score = 0; dead = false; spawn();
  }

  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function draw() {
    ctx.fillStyle = '#0b1016'; ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = '#131b26'; rrect(ctx, GX - 14, GY - 14, BOARD + 28, BOARD + 28, 20); ctx.fill();
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var x = GX + c * (CELL + GAP), y = GY + r * (CELL + GAP), v = tiles[r * N + c];
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        rrect(ctx, x, y, CELL, CELL, 16); ctx.fill();
        if (!v) { continue; }
        ctx.fillStyle = FILL[v] || '#7a1f10';
        rrect(ctx, x, y, CELL, CELL, 16); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '700 ' + (v < 1024 ? 72 : 56) + 'px Roboto, sans-serif';
        ctx.fillText(v, x + CELL / 2, y + CELL / 2);
      }
    }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = '700 44px Roboto, sans-serif';
    ctx.fillText('Score ' + score, 24, 58);
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '500 32px Roboto, sans-serif';
    ctx.fillText('Arrows slide · OK restarts', 960, 1060);
    ctx.textAlign = 'left';
    if (dead) {
      ctx.fillStyle = 'rgba(5,8,12,.78)'; ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '700 96px Roboto, sans-serif';
      ctx.fillText('No moves left', 960, 470);
      ctx.font = '500 52px Roboto, sans-serif';
      ctx.fillText('Score ' + score + ' — OK to try again', 960, 580);
      ctx.textAlign = 'left';
    }
  }

  window.MergeGame = {
    open: function () {
      if (!canvas) { canvas = document.getElementById('merge-canvas'); ctx = canvas.getContext('2d'); }
      reset(); draw();
    },
    close: function () { /* turn-based: nothing runs between draws */ },
    keydown: function (k) {
      if (k === 10009 || k === 27) { return false; }  // BACK/ESC: the shell closes the game
      if (dead) { if (k === 13) { reset(); draw(); } return true; }
      var dir = { 37: 'left', 39: 'right', 38: 'up', 40: 'down' }[k];
      if (dir) { move(dir); draw(); }
      return true;
    },
    _line: slideLine, _dead: isDead, _board: function () { return { tiles: tiles, score: score, dead: dead }; }  // test hooks
  };
  return window.MergeGame;
})();
